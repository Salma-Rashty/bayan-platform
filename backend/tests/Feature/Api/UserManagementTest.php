<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Tag;
use App\Models\User;
use App\Models\UserNote;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function userWithRole(string $role, array $attributes = []): User
    {
        $user = User::factory()->create($attributes);
        $user->assignRole($role);

        return $user;
    }

    public function test_users_without_manage_users_cannot_access_user_management(): void
    {
        $teacher = $this->userWithRole('teacher');
        $student = $this->userWithRole('student');

        Sanctum::actingAs($teacher, ['*']);

        $this->getJson('/api/users')->assertForbidden();
        $this->getJson("/api/users/{$student->id}")->assertForbidden();
        $this->patchJson("/api/users/{$student->id}/status", ['status' => 'suspended'])->assertForbidden();
        $this->getJson('/api/tags')->assertForbidden();
    }

    public function test_index_searches_filters_sorts_and_lists_trashed(): void
    {
        $admin = $this->userWithRole('admin', ['name' => 'Zed Admin']);
        $vip = Tag::create(['name' => 'VIP', 'color' => '#ff0000']);

        $amira = $this->userWithRole('student', ['name' => 'Amira Hassan', 'email' => 'amira@example.com', 'country' => 'EG']);
        $amira->tags()->attach($vip);
        $this->userWithRole('student', ['name' => 'Bilal Suspended', 'status' => 'suspended']);
        $this->userWithRole('teacher', ['name' => 'Chadi Teacher']);
        $this->userWithRole('student', ['name' => 'Dana Deleted'])->delete();

        Sanctum::actingAs($admin, ['*']);

        $names = fn (string $query) => $this->getJson("/api/users?{$query}")->assertOk()->json('data.*.name');

        $this->assertSame(['Amira Hassan'], $names('search=amira@'));
        $this->assertSame(['Chadi Teacher'], $names('role=teacher'));
        $this->assertSame(['Bilal Suspended'], $names('status=suspended'));
        $this->assertSame(['Amira Hassan'], $names("tag={$vip->id}"));
        $this->assertSame(['Amira Hassan'], $names('country=EG'));
        $this->getJson('/api/users?country=Narnia')->assertUnprocessable()->assertJsonValidationErrors('country');
        $this->assertSame(['Dana Deleted'], $names('trashed=only'));
        $this->assertContains('Dana Deleted', $names('trashed=with'));
        $this->assertNotContains('Dana Deleted', $names(''));
        $this->assertSame(
            ['Amira Hassan', 'Bilal Suspended', 'Chadi Teacher', 'Zed Admin'],
            $names('sort=name&direction=asc')
        );

        $this->getJson('/api/users?sort=password')->assertUnprocessable()->assertJsonValidationErrors('sort');

        $this->getJson('/api/users')
            ->assertOk()
            ->assertJsonStructure(['data' => [['id', 'status', 'roles', 'tags']], 'meta' => ['total']])
            ->assertJsonMissingPath('data.0.password')
            ->assertJsonMissingPath('data.0.remember_token');
    }

    public function test_show_returns_full_user_detail(): void
    {
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student', ['phone' => '+90 555 000 0000', 'country' => 'TR']);
        $student->givePermissionTo('view-reports');
        $student->tags()->attach(Tag::create(['name' => 'Scholarship']));

        $course = Course::create(['title' => 'Arabic 101', 'slug' => 'arabic-101', 'type' => 'arabic']);
        Enrollment::create(['user_id' => $student->id, 'course_id' => $course->id, 'enrolled_at' => now()]);
        UserNote::create(['user_id' => $student->id, 'author_id' => $admin->id, 'body' => 'Called about fees.']);

        Sanctum::actingAs($admin, ['*']);

        $this->getJson("/api/users/{$student->id}")
            ->assertOk()
            ->assertJsonPath('phone', '+90 555 000 0000')
            ->assertJsonPath('country', 'TR')
            ->assertJsonPath('status', 'active')
            ->assertJsonPath('roles', ['student'])
            ->assertJsonPath('direct_permissions', ['view-reports'])
            ->assertJsonPath('tags.0.name', 'Scholarship')
            ->assertJsonPath('enrollments.0.course.title', 'Arabic 101')
            ->assertJsonPath('notes.0.body', 'Called about fees.')
            ->assertJsonPath('notes.0.author.name', $admin->name)
            ->assertJsonStructure(['created_at', 'last_login_at'])
            ->assertJsonMissingPath('password')
            ->assertJsonMissingPath('remember_token');
    }

    public function test_admin_can_create_and_update_a_student(): void
    {
        $admin = $this->userWithRole('admin');
        $tag = Tag::create(['name' => 'Evening class']);

        Sanctum::actingAs($admin, ['*']);

        $created = $this->postJson('/api/users', [
            'name' => 'New Student',
            'email' => 'new@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
            'phone' => '12345',
            'country' => 'EG',
            'roles' => ['student'],
            'tags' => [$tag->id],
        ])->assertCreated()
            ->assertJsonPath('roles', ['student'])
            ->assertJsonPath('tags.0.id', $tag->id)
            ->assertJsonPath('status', 'active')
            ->json();

        $this->putJson("/api/users/{$created['id']}", [
            'name' => 'Renamed Student',
            'country' => null,
            'roles' => ['student', 'teacher'],
            'permissions' => ['view-reports'],
            'tags' => [],
        ])->assertOk()
            ->assertJsonPath('name', 'Renamed Student')
            ->assertJsonPath('country', null)
            ->assertJsonPath('roles', ['student', 'teacher'])
            ->assertJsonPath('direct_permissions', ['view-reports'])
            ->assertJsonPath('tags', []);
    }

    public function test_country_must_be_an_iso_code(): void
    {
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');

        Sanctum::actingAs($admin, ['*']);

        $this->putJson("/api/users/{$student->id}", ['country' => 'Egypt'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('country');
        $this->putJson("/api/users/{$student->id}", ['country' => 'SA'])
            ->assertOk()
            ->assertJsonPath('country', 'SA');
    }

    public function test_admin_cannot_grant_or_revoke_elevated_permissions(): void
    {
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');
        $manager = $this->userWithRole('student');
        $manager->givePermissionTo('manage-users');

        Sanctum::actingAs($admin, ['*']);

        // Admins hold manage-users and manage-billing themselves, but still can't hand them out...
        $this->putJson("/api/users/{$student->id}", ['permissions' => ['manage-users']])
            ->assertForbidden()
            ->assertJsonPath('message', 'Only a super-admin can grant or revoke manage-users.');
        $this->putJson("/api/users/{$student->id}", ['permissions' => ['manage-billing']])->assertForbidden();
        $this->postJson('/api/users', [
            'name' => 'Sneaky Manager',
            'email' => 'sneaky-manager@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
            'roles' => ['student'],
            'permissions' => ['manage-users'],
        ])->assertForbidden();

        // ...or take them away.
        $this->putJson("/api/users/{$manager->id}", ['permissions' => []])->assertForbidden();

        // Ordinary permissions the admin holds are still fine, alongside an untouched elevated one.
        $this->putJson("/api/users/{$manager->id}", ['permissions' => ['manage-users', 'view-reports']])
            ->assertOk()
            ->assertJsonPath('direct_permissions', ['manage-users', 'view-reports']);

        $this->assertFalse($student->fresh()->hasPermissionTo('manage-users'));
        $this->assertDatabaseMissing('users', ['email' => 'sneaky-manager@example.com']);

        // A super-admin can grant it.
        Sanctum::actingAs($this->userWithRole('super-admin'), ['*']);
        $this->putJson("/api/users/{$student->id}", ['permissions' => ['manage-users']])
            ->assertOk()
            ->assertJsonPath('direct_permissions', ['manage-users']);
    }

    public function test_admin_cannot_modify_super_admins_or_admins(): void
    {
        $admin = $this->userWithRole('admin');
        $otherAdmin = $this->userWithRole('admin');
        $superAdmin = $this->userWithRole('super-admin');

        Sanctum::actingAs($admin, ['*']);

        foreach ([$superAdmin, $otherAdmin] as $target) {
            $this->putJson("/api/users/{$target->id}", ['name' => 'Hacked'])->assertForbidden();
            $this->patchJson("/api/users/{$target->id}/status", ['status' => 'suspended'])->assertForbidden();
            $this->postJson("/api/users/{$target->id}/reset-password", [
                'password' => 'new-password-1',
                'password_confirmation' => 'new-password-1',
            ])->assertForbidden();
            $this->deleteJson("/api/users/{$target->id}")->assertForbidden();

            // Viewing is still allowed.
            $this->getJson("/api/users/{$target->id}")->assertOk();
        }

        $this->assertNotSame('Hacked', $superAdmin->fresh()->name);
        $this->assertSame('active', $superAdmin->fresh()->status);
        $this->assertNotSoftDeleted($otherAdmin);
    }

    public function test_admin_cannot_escalate_privileges(): void
    {
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');

        Sanctum::actingAs($admin, ['*']);

        // Promoting an existing user to an admin-tier role.
        $this->putJson("/api/users/{$student->id}", ['roles' => ['student', 'super-admin']])
            ->assertForbidden()
            ->assertJsonPath('message', 'Only a super-admin can grant or remove the admin and super-admin roles.');
        $this->putJson("/api/users/{$student->id}", ['roles' => ['admin']])->assertForbidden();

        // Creating a new admin-tier user.
        $this->postJson('/api/users', [
            'name' => 'Sneaky',
            'email' => 'sneaky@example.com',
            'password' => 'secret-password',
            'password_confirmation' => 'secret-password',
            'roles' => ['admin'],
        ])->assertForbidden();

        // Granting a permission the admin doesn't hold.
        $this->putJson("/api/users/{$student->id}", ['permissions' => ['edit-curriculum']])->assertForbidden();

        $this->assertSame(['student'], $student->fresh()->getRoleNames()->all());
        $this->assertDatabaseMissing('users', ['email' => 'sneaky@example.com']);
    }

    public function test_super_admin_can_modify_admins(): void
    {
        $superAdmin = $this->userWithRole('super-admin');
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');

        Sanctum::actingAs($superAdmin, ['*']);

        $this->putJson("/api/users/{$admin->id}", ['name' => 'Renamed Admin', 'permissions' => ['edit-curriculum']])
            ->assertOk()
            ->assertJsonPath('direct_permissions', ['edit-curriculum']);
        $this->patchJson("/api/users/{$admin->id}/status", ['status' => 'suspended'])
            ->assertOk()
            ->assertJsonPath('status', 'suspended');
        $this->putJson("/api/users/{$student->id}", ['roles' => ['admin']])
            ->assertOk()
            ->assertJsonPath('roles', ['admin']);
    }

    public function test_nobody_can_suspend_or_delete_their_own_account(): void
    {
        $superAdmin = $this->userWithRole('super-admin');

        Sanctum::actingAs($superAdmin, ['*']);

        $this->patchJson("/api/users/{$superAdmin->id}/status", ['status' => 'suspended'])
            ->assertForbidden()
            ->assertJsonPath('message', 'You cannot change the status of your own account.');
        $this->deleteJson("/api/users/{$superAdmin->id}")
            ->assertForbidden()
            ->assertJsonPath('message', 'You cannot delete your own account.');
        // Removing your own super-admin role would lock you out, so own roles are frozen too.
        $this->putJson("/api/users/{$superAdmin->id}", ['roles' => ['student']])->assertForbidden();

        // Editing your own profile is fine, including re-sending unchanged roles.
        $this->putJson("/api/users/{$superAdmin->id}", ['name' => 'Still Me', 'roles' => ['super-admin']])->assertOk();

        $this->assertSame('active', $superAdmin->fresh()->status);
        $this->assertNotSoftDeleted($superAdmin);
    }

    public function test_suspended_user_cannot_log_in(): void
    {
        $student = $this->userWithRole('student', [
            'email' => 'suspended@example.com',
            'password' => Hash::make('password'),
            'status' => 'suspended',
        ]);

        $this->postJson('/api/auth/login', ['email' => 'suspended@example.com', 'password' => 'password'])
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account has been suspended. Please contact support.');

        // A wrong password still gets the generic credentials error, not the suspension notice.
        $this->postJson('/api/auth/login', ['email' => 'suspended@example.com', 'password' => 'wrong'])
            ->assertUnprocessable();

        $this->assertSame(0, $student->tokens()->count());
        $this->assertNull($student->fresh()->last_login_at);
    }

    public function test_login_records_last_login_at(): void
    {
        $student = $this->userWithRole('student', ['email' => 'me@example.com', 'password' => Hash::make('password')]);

        $this->postJson('/api/auth/login', ['email' => 'me@example.com', 'password' => 'password'])->assertOk();

        $this->assertNotNull($student->fresh()->last_login_at);
    }

    public function test_existing_tokens_stop_working_while_suspended(): void
    {
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');
        $studentToken = $student->createToken('api')->plainTextToken;
        $adminToken = $admin->createToken('api')->plainTextToken;

        $this->withToken($studentToken)->getJson('/api/user')->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->patchJson("/api/users/{$student->id}/status", ['status' => 'suspended'])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($studentToken)->getJson('/api/user')
            ->assertForbidden()
            ->assertJsonPath('message', 'Your account has been suspended. Please contact support.');

        $this->app['auth']->forgetGuards();
        $this->withToken($adminToken)->patchJson("/api/users/{$student->id}/status", ['status' => 'active'])->assertOk();

        $this->app['auth']->forgetGuards();
        $this->withToken($studentToken)->getJson('/api/user')->assertOk();
    }

    public function test_admin_can_reset_a_password_which_signs_the_user_out(): void
    {
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');
        $student->createToken('api');

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/users/{$student->id}/reset-password", [
            'password' => 'short',
            'password_confirmation' => 'short',
        ])->assertUnprocessable()->assertJsonValidationErrors('password');

        $this->postJson("/api/users/{$student->id}/reset-password", [
            'password' => 'brand-new-password',
            'password_confirmation' => 'brand-new-password',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-password', $student->fresh()->password));
        $this->assertSame(0, $student->tokens()->count());
    }

    public function test_delete_is_soft_and_restorable(): void
    {
        $admin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');

        Sanctum::actingAs($admin, ['*']);

        $this->deleteJson("/api/users/{$student->id}")->assertOk();
        $this->assertSoftDeleted($student);

        // Trashed users stay viewable so the detail page works from the trashed filter.
        $this->getJson("/api/users/{$student->id}")->assertOk()->assertJsonPath('id', $student->id);

        $this->patchJson("/api/users/{$student->id}/restore")->assertOk()->assertJsonPath('deleted_at', null);
        $this->assertNotSoftDeleted($student);
    }

    public function test_notes_can_be_added_and_only_deleted_by_their_author(): void
    {
        $admin = $this->userWithRole('admin');
        $otherAdmin = $this->userWithRole('admin');
        $student = $this->userWithRole('student');

        Sanctum::actingAs($admin, ['*']);

        $this->postJson("/api/users/{$student->id}/notes", ['body' => ''])->assertUnprocessable();

        $note = $this->postJson("/api/users/{$student->id}/notes", ['body' => 'Prefers morning classes.'])
            ->assertCreated()
            ->assertJsonPath('author.id', $admin->id)
            ->json();

        Sanctum::actingAs($otherAdmin, ['*']);
        $this->deleteJson("/api/notes/{$note['id']}")->assertForbidden();

        Sanctum::actingAs($admin, ['*']);
        $this->deleteJson("/api/notes/{$note['id']}")->assertOk();

        $this->assertSoftDeleted('user_notes', ['id' => $note['id']]);
        $this->getJson("/api/users/{$student->id}")->assertJsonPath('notes', []);
    }

    public function test_tags_can_be_listed_and_created(): void
    {
        $admin = $this->userWithRole('admin');

        Sanctum::actingAs($admin, ['*']);

        $this->postJson('/api/tags', ['name' => 'VIP', 'color' => '#aabbcc'])
            ->assertCreated()
            ->assertJsonPath('name', 'VIP');
        $this->postJson('/api/tags', ['name' => 'VIP'])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->postJson('/api/tags', ['name' => 'Bad colour', 'color' => 'red'])->assertJsonValidationErrors('color');

        $this->getJson('/api/tags')
            ->assertOk()
            ->assertJsonPath('0.name', 'VIP')
            ->assertJsonPath('0.users_count', 0);
    }
}
