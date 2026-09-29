<?php

namespace Tests\Feature\Api;

use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class RolesAndPermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function userWithRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);

        return $user;
    }

    private function actingAsSuperAdmin(): User
    {
        $superAdmin = $this->userWithRole('super-admin');
        Sanctum::actingAs($superAdmin, ['*']);

        return $superAdmin;
    }

    public function test_only_super_admins_can_manage_roles_and_permissions(): void
    {
        $teacherRole = Role::findByName('teacher', 'web');

        // An admin holds manage-users (and would pass most checks), but still can't touch roles.
        foreach (['admin', 'teacher'] as $role) {
            Sanctum::actingAs($this->userWithRole($role), ['*']);

            $this->getJson('/api/roles')->assertForbidden();
            $this->getJson("/api/roles/{$teacherRole->id}")->assertForbidden();
            $this->postJson('/api/roles', ['name' => 'sneaky'])->assertForbidden();
            $this->putJson("/api/roles/{$teacherRole->id}", ['permissions' => ['manage-users']])->assertForbidden();
            $this->deleteJson("/api/roles/{$teacherRole->id}")->assertForbidden();
            $this->getJson('/api/permissions')->assertForbidden();
        }

        $this->assertFalse($teacherRole->fresh()->hasPermissionTo('manage-users'));
        $this->assertDatabaseMissing('roles', ['name' => 'sneaky']);

        $this->actingAsSuperAdmin();
        $this->getJson('/api/roles')->assertOk();
        $this->getJson('/api/permissions')->assertOk();
    }

    public function test_user_managers_can_read_the_assignable_roles_and_permissions(): void
    {
        Role::create(['name' => 'content-editor', 'guard_name' => 'web']);

        Sanctum::actingAs($this->userWithRole('admin'), ['*']);
        $this->getJson('/api/users/access-options')
            ->assertOk()
            ->assertJsonPath('roles', ['super-admin', 'admin', 'teacher', 'student', 'content-editor'])
            ->assertJsonPath('permissions.0', [
                'name' => 'manage-users',
                'label' => 'Manage users',
                'group' => 'People',
                'description' => 'Manage accounts, tags and notes; review course and teacher applications; see enrollments.',
                'wired' => true,
            ]);

        Sanctum::actingAs($this->userWithRole('teacher'), ['*']);
        $this->getJson('/api/users/access-options')->assertForbidden();
    }

    public function test_admin_cannot_assign_a_custom_role_that_bundles_elevated_permissions(): void
    {
        Role::create(['name' => 'support-lead', 'guard_name' => 'web'])->givePermissionTo('manage-users');
        Role::create(['name' => 'content-editor', 'guard_name' => 'web'])->givePermissionTo('view-reports');
        $student = $this->userWithRole('student');

        Sanctum::actingAs($this->userWithRole('admin'), ['*']);

        $this->getJson('/api/users/access-options')
            ->assertJsonPath('elevated_roles', ['admin', 'super-admin', 'support-lead']);

        // Otherwise a way around "only a super-admin can grant manage-users".
        $this->putJson("/api/users/{$student->id}", ['roles' => ['student', 'support-lead']])
            ->assertForbidden()
            ->assertJsonPath('message', 'Only a super-admin can grant or remove roles that include manage-users or manage-billing: support-lead.');
        $this->putJson("/api/users/{$student->id}", ['roles' => ['student', 'content-editor']])
            ->assertOk()
            ->assertJsonPath('roles', ['student', 'content-editor']);

        $this->assertFalse($student->fresh()->hasPermissionTo('manage-users'));
    }

    public function test_index_lists_roles_with_permissions_and_user_counts(): void
    {
        $this->userWithRole('teacher');
        $this->userWithRole('teacher');
        Role::create(['name' => 'content-editor', 'guard_name' => 'web']);

        $this->actingAsSuperAdmin();

        $roles = collect($this->getJson('/api/roles')->assertOk()->json())->keyBy('name');

        $this->assertSame(['super-admin', 'admin', 'teacher', 'student', 'content-editor'], $roles->keys()->all());
        $this->assertSame(2, $roles['teacher']['users_count']);
        $this->assertSame(['create-lessons', 'grade-homework'], $roles['teacher']['permissions']);
        $this->assertSame(2, $roles['teacher']['permissions_count']);
        $this->assertTrue($roles['teacher']['is_system']);
        $this->assertFalse($roles['teacher']['is_locked']);
        $this->assertTrue($roles['super-admin']['is_locked']);
        $this->assertFalse($roles['content-editor']['is_system']);
    }

    public function test_super_admin_can_create_a_role(): void
    {
        $this->actingAsSuperAdmin();

        $this->postJson('/api/roles', ['name' => 'content-editor', 'permissions' => ['view-reports', 'edit-curriculum']])
            ->assertCreated()
            ->assertJsonPath('name', 'content-editor')
            ->assertJsonPath('permissions', ['edit-curriculum', 'view-reports'])
            ->assertJsonPath('users_count', 0)
            ->assertJsonPath('is_system', false);

        $this->postJson('/api/roles', ['name' => 'content-editor'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => '"content-editor" already exists.']);
        $this->postJson('/api/roles', ['name' => 'Content Editor'])->assertJsonValidationErrors('name');
        $this->postJson('/api/roles', ['name' => 'reviewer', 'permissions' => ['does-not-exist']])
            ->assertJsonValidationErrors('permissions.0');
    }

    public function test_permission_matrix_save_applies_to_everyone_with_the_role(): void
    {
        $this->actingAsSuperAdmin();

        $role = $this->postJson('/api/roles', ['name' => 'grader', 'permissions' => ['view-reports']])->json();
        $holder = User::factory()->create();
        $holder->assignRole('grader');
        $this->assertFalse($holder->hasPermissionTo('grade-homework'));

        $this->putJson("/api/roles/{$role['id']}", [
            'name' => 'homework-grader',
            'permissions' => ['grade-homework'],
        ])->assertOk()
            ->assertJsonPath('name', 'homework-grader')
            ->assertJsonPath('permissions', ['grade-homework'])
            ->assertJsonPath('users_count', 1);

        $holder = $holder->fresh();
        $this->assertTrue($holder->hasPermissionTo('grade-homework'));
        $this->assertFalse($holder->hasPermissionTo('view-reports'));
        $this->assertSame(['homework-grader'], $holder->getRoleNames()->all());
    }

    public function test_system_roles_cannot_be_renamed_or_deleted(): void
    {
        $this->actingAsSuperAdmin();
        $teacher = Role::findByName('teacher', 'web');
        $superAdmin = Role::findByName('super-admin', 'web');

        $this->putJson("/api/roles/{$teacher->id}", ['name' => 'instructor'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => '"teacher" is a system role and cannot be renamed.']);
        $this->deleteJson("/api/roles/{$teacher->id}")
            ->assertForbidden()
            ->assertJsonPath('message', '"teacher" is a system role and cannot be deleted.');

        // A system role's permissions are still editable (re-sending its own name is fine)...
        $this->putJson("/api/roles/{$teacher->id}", ['name' => 'teacher', 'permissions' => ['grade-homework', 'view-reports']])
            ->assertOk()
            ->assertJsonPath('permissions', ['grade-homework', 'view-reports']);

        // ...except super-admin's, which is locked entirely.
        $this->putJson("/api/roles/{$superAdmin->id}", ['permissions' => []])
            ->assertForbidden()
            ->assertJsonPath('message', 'The super-admin role is locked: it always has every permission and cannot be changed.');
        $this->deleteJson("/api/roles/{$superAdmin->id}")->assertForbidden();

        $this->assertSame('teacher', $teacher->fresh()->name);
        $this->assertCount(6, $superAdmin->fresh()->permissions);
    }

    public function test_a_role_in_use_cannot_be_deleted(): void
    {
        $this->actingAsSuperAdmin();
        $role = Role::create(['name' => 'content-editor', 'guard_name' => 'web']);
        $active = $this->userWithRole('content-editor');
        $this->userWithRole('content-editor')->delete();

        // Soft-deleted accounts count: deleting the role would silently strip it from them.
        $this->deleteJson("/api/roles/{$role->id}")
            ->assertUnprocessable()
            ->assertJsonPath('message', '"content-editor" is assigned to 2 users. Reassign them to another role before deleting it.');

        $active->removeRole('content-editor');
        User::onlyTrashed()->first()->removeRole('content-editor');

        $this->deleteJson("/api/roles/{$role->id}")->assertOk();
        $this->assertDatabaseMissing('roles', ['name' => 'content-editor']);
    }

    public function test_permissions_are_listed_read_only(): void
    {
        $this->actingAsSuperAdmin();

        $this->getJson('/api/permissions')
            ->assertOk()
            ->assertJsonCount(6)
            ->assertJsonPath('0', [
                'id' => Permission::findByName('manage-users', 'web')->id,
                'name' => 'manage-users',
                'label' => 'Manage users',
                'group' => 'People',
                'description' => 'Manage accounts, tags and notes; review course and teacher applications; see enrollments.',
                'wired' => true,
            ])
            ->assertJsonPath('5.name', 'view-reports')
            ->assertJsonPath('5.wired', false);

        // Permissions are defined in code: there are no endpoints to create or delete them.
        $this->postJson('/api/permissions', ['name' => 'export-data'])->assertMethodNotAllowed();
        $this->deleteJson('/api/permissions/'.Permission::findByName('view-reports', 'web')->id)->assertNotFound();
        $this->assertSame(6, Permission::count());
    }
}
