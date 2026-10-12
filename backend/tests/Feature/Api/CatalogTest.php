<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Level;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CatalogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    private function actingAsRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);
        Sanctum::actingAs($user, ['*']);

        return $user;
    }

    private function category(array $attributes = []): Category
    {
        static $sequence = 0;

        return Category::create(['name' => 'Category '.++$sequence, ...$attributes]);
    }

    public function test_only_catalog_managers_can_access_categories_and_levels(): void
    {
        $category = $this->category();
        $level = $category->levels()->create(['name' => 'Beginner']);

        foreach (['teacher', 'student'] as $role) {
            $this->actingAsRole($role);

            $this->getJson('/api/categories')->assertForbidden();
            $this->postJson('/api/categories', ['name' => 'Sneaky'])->assertForbidden();
            $this->getJson("/api/categories/{$category->id}")->assertForbidden();
            $this->putJson("/api/categories/{$category->id}", ['name' => 'Renamed'])->assertForbidden();
            $this->deleteJson("/api/categories/{$category->id}")->assertForbidden();
            $this->patchJson("/api/categories/{$category->id}/restore")->assertForbidden();
            $this->getJson("/api/categories/{$category->id}/levels")->assertForbidden();
            $this->getJson('/api/levels')->assertForbidden();
            $this->postJson('/api/levels', ['category_id' => $category->id, 'name' => 'Sneaky'])->assertForbidden();
            $this->getJson("/api/levels/{$level->id}")->assertForbidden();
            $this->putJson("/api/levels/{$level->id}", ['name' => 'Renamed'])->assertForbidden();
            $this->deleteJson("/api/levels/{$level->id}")->assertForbidden();
            $this->patchJson("/api/levels/{$level->id}/restore")->assertForbidden();
        }

        $this->assertDatabaseMissing('categories', ['name' => 'Sneaky']);
        $this->assertNotSoftDeleted($category);
        $this->assertNotSoftDeleted($level);

        foreach (['admin', 'super-admin'] as $role) {
            $this->actingAsRole($role);

            $this->getJson('/api/categories')->assertOk();
            $this->getJson('/api/levels')->assertOk();
        }
    }

    public function test_guests_cannot_access_the_catalog(): void
    {
        $this->getJson('/api/categories')->assertUnauthorized();
        $this->getJson('/api/levels')->assertUnauthorized();
    }

    public function test_the_permission_not_the_role_grants_access(): void
    {
        $teacher = $this->actingAsRole('teacher');
        $teacher->givePermissionTo('manage-catalog');

        $this->postJson('/api/categories', ['name' => 'Quran'])->assertCreated();
    }

    public function test_category_crud(): void
    {
        $this->actingAsRole('admin');

        $created = $this->postJson('/api/categories', ['name' => 'Arabic', 'description' => 'Modern Standard Arabic'])
            ->assertCreated()
            ->assertJsonPath('name', 'Arabic')
            ->assertJsonPath('description', 'Modern Standard Arabic')
            ->assertJsonPath('is_active', true)
            ->assertJsonPath('order', 1)
            ->assertJsonPath('levels_count', 0)
            ->json();

        $this->getJson("/api/categories/{$created['id']}")->assertOk()->assertJsonPath('name', 'Arabic');

        $this->putJson("/api/categories/{$created['id']}", ['name' => 'Arabic language', 'is_active' => false, 'order' => 3])
            ->assertOk()
            ->assertJsonPath('name', 'Arabic language')
            ->assertJsonPath('is_active', false)
            ->assertJsonPath('order', 3)
            ->assertJsonPath('description', 'Modern Standard Arabic');

        $this->deleteJson("/api/categories/{$created['id']}")->assertOk();
        $this->assertSoftDeleted('categories', ['id' => $created['id']]);
        // Deleted categories stay reachable by id so their detail page can offer restore.
        $this->getJson("/api/categories/{$created['id']}")->assertOk()->assertJsonPath('deleted_at', fn ($value) => $value !== null);

        $this->patchJson("/api/categories/{$created['id']}/restore")->assertOk()->assertJsonPath('deleted_at', null);
        $this->assertNotSoftDeleted('categories', ['id' => $created['id']]);
    }

    public function test_category_index_orders_counts_and_filters(): void
    {
        $quran = $this->category(['name' => 'Quran', 'order' => 2]);
        $arabic = $this->category(['name' => 'Arabic', 'order' => 1]);
        $archived = $this->category(['name' => 'Archived', 'order' => 0, 'is_active' => false]);
        $gone = $this->category(['name' => 'Gone']);
        $gone->delete();

        $arabic->levels()->create(['name' => 'Beginner']);
        $arabic->levels()->create(['name' => 'Advanced']);
        $arabic->levels()->create(['name' => 'Old'])->delete();

        $this->actingAsRole('admin');

        $categories = $this->getJson('/api/categories')->assertOk()->json();
        $this->assertSame(['Archived', 'Arabic', 'Quran'], array_column($categories, 'name'));
        // Soft-deleted levels aren't counted.
        $this->assertSame([0, 2, 0], array_column($categories, 'levels_count'));

        $this->assertSame(['Arabic', 'Quran'], array_column($this->getJson('/api/categories?active=1')->json(), 'name'));
        $this->assertSame(['Archived'], array_column($this->getJson('/api/categories?active=0')->json(), 'name'));
        $this->assertSame(['Gone'], array_column($this->getJson('/api/categories?trashed=only')->json(), 'name'));
        $this->assertCount(4, $this->getJson('/api/categories?trashed=with')->json());
        $this->getJson('/api/categories?trashed=all')->assertJsonValidationErrors('trashed');

        $this->assertSame($quran->id, $categories[2]['id']);
        $this->assertSame($archived->id, $categories[0]['id']);
    }

    public function test_category_names_are_unique_among_live_categories(): void
    {
        $this->category(['name' => 'Arabic']);
        $this->category(['name' => 'Quran'])->delete();
        $tajweed = $this->category(['name' => 'Tajweed']);

        $this->actingAsRole('admin');

        $this->postJson('/api/categories', ['name' => 'Arabic'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'A category named "Arabic" already exists.']);
        $this->putJson("/api/categories/{$tajweed->id}", ['name' => 'Arabic'])
            ->assertJsonValidationErrors(['name' => 'A category named "Arabic" already exists.']);

        // Saving a category under its own name isn't a clash.
        $this->putJson("/api/categories/{$tajweed->id}", ['name' => 'Tajweed', 'description' => 'Recitation'])->assertOk();

        // A soft-deleted category's name is free to reuse.
        $this->postJson('/api/categories', ['name' => 'Quran'])->assertCreated();
        $this->assertSame(2, Category::withTrashed()->where('name', 'Quran')->count());

        $this->postJson('/api/categories', [])->assertJsonValidationErrors('name');
    }

    public function test_category_orders_are_unique_among_live_categories(): void
    {
        $arabic = $this->category(['name' => 'Arabic', 'order' => 1]);
        $this->category(['name' => 'Gone', 'order' => 2])->delete();
        $quran = $this->category(['name' => 'Quran', 'order' => 3]);

        $this->actingAsRole('admin');

        $this->postJson('/api/categories', ['name' => 'Tajweed', 'order' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['order' => 'Order 1 is already used by "Arabic".']);
        $this->putJson("/api/categories/{$quran->id}", ['order' => 1])
            ->assertJsonValidationErrors(['order' => 'Order 1 is already used by "Arabic".']);

        // Its own order isn't a clash, and a deleted category's order is free.
        $this->putJson("/api/categories/{$arabic->id}", ['order' => 1, 'is_active' => false])->assertOk();
        $this->putJson("/api/categories/{$quran->id}", ['order' => 2])->assertOk()->assertJsonPath('order', 2);
    }

    public function test_new_categories_and_levels_get_the_next_free_order(): void
    {
        $this->category(['name' => 'Arabic', 'order' => 4]);
        $this->category(['name' => 'Gone', 'order' => 9])->delete();

        $this->actingAsRole('admin');

        // Deleted rows don't count: the next free order follows the live ones.
        $quran = $this->postJson('/api/categories', ['name' => 'Quran'])->assertCreated()->assertJsonPath('order', 5)->json();
        $this->postJson('/api/categories', ['name' => 'Tajweed', 'order' => null])->assertJsonPath('order', 6);

        $this->postJson('/api/levels', ['category_id' => $quran['id'], 'name' => 'A'])->assertJsonPath('order', 1);
        $this->postJson('/api/levels', ['category_id' => $quran['id'], 'name' => 'B', 'order' => 7])->assertJsonPath('order', 7);
        $this->postJson('/api/levels', ['category_id' => $quran['id'], 'name' => 'C'])->assertJsonPath('order', 8);
    }

    public function test_restoring_is_blocked_when_the_name_or_order_was_reused(): void
    {
        $old = $this->category(['name' => 'Arabic', 'order' => 1]);
        $old->delete();
        $this->category(['name' => 'Arabic', 'order' => 2]);

        $quran = $this->category(['name' => 'Quran', 'order' => 3]);
        $level = $quran->levels()->create(['name' => 'Beginner', 'order' => 1]);
        $level->delete();
        $quran->levels()->create(['name' => 'Starter', 'order' => 1]);

        $this->actingAsRole('admin');

        $this->patchJson("/api/categories/{$old->id}/restore")
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'category' => 'Can\'t restore "Arabic": A category named "Arabic" already exists. Change that category first.',
            ]);
        $this->assertSoftDeleted($old);

        $this->patchJson("/api/levels/{$level->id}/restore")
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'level' => 'Can\'t restore "Beginner": Order 1 is already used by "Starter" in this category. Change that level first.',
            ]);
        $this->assertSoftDeleted($level);

        $quran->levels()->where('name', 'Starter')->update(['order' => 2]);
        $this->patchJson("/api/levels/{$level->id}/restore")->assertOk();
    }

    public function test_the_database_enforces_uniqueness_among_live_rows_only(): void
    {
        $arabic = $this->category(['name' => 'Arabic', 'order' => 1]);
        $arabic->levels()->create(['name' => 'Beginner', 'order' => 1]);

        foreach ([
            fn () => Category::create(['name' => 'Arabic', 'order' => 2]),
            fn () => Category::create(['name' => 'Quran', 'order' => 1]),
            fn () => $arabic->levels()->create(['name' => 'Beginner', 'order' => 2]),
            fn () => $arabic->levels()->create(['name' => 'Advanced', 'order' => 1]),
        ] as $duplicate) {
            try {
                DB::transaction($duplicate);
                $this->fail('Expected a unique index violation.');
            } catch (UniqueConstraintViolationException) {
                // expected
            }
        }

        // Soft-deleted rows drop out of the indexes, so their values can be reused.
        $arabic->levels()->first()->delete();
        $arabic->levels()->create(['name' => 'Beginner', 'order' => 1]);
        $this->assertSame(2, Level::withTrashed()->where('name', 'Beginner')->count());

        // Another category can reuse a level's name and order.
        $this->category(['name' => 'Quran', 'order' => 2])->levels()->create(['name' => 'Beginner', 'order' => 1]);
    }

    public function test_a_category_with_levels_cannot_be_deleted(): void
    {
        $category = $this->category(['name' => 'Arabic']);
        $beginner = $category->levels()->create(['name' => 'Beginner']);
        $advanced = $category->levels()->create(['name' => 'Advanced']);

        $this->actingAsRole('admin');

        $this->deleteJson("/api/categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'category' => '"Arabic" has 2 levels. Delete or move them to another category before deleting it.',
            ]);
        $this->assertNotSoftDeleted($category);

        $this->deleteJson("/api/levels/{$beginner->id}")->assertOk();
        $this->deleteJson("/api/categories/{$category->id}")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['category' => '"Arabic" has 1 level. Delete or move them to another category before deleting it.']);

        // Once only soft-deleted levels remain, the category can go.
        $this->deleteJson("/api/levels/{$advanced->id}")->assertOk();
        $this->deleteJson("/api/categories/{$category->id}")->assertOk();
        $this->assertSoftDeleted($category);
    }

    public function test_a_level_cannot_be_restored_while_its_category_is_deleted(): void
    {
        $category = $this->category(['name' => 'Arabic']);
        $level = $category->levels()->create(['name' => 'Beginner']);
        $level->delete();
        $category->delete();

        $this->actingAsRole('admin');

        $this->patchJson("/api/levels/{$level->id}/restore")
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['level' => 'Its category "Arabic" is deleted. Restore the category first.']);
        $this->assertSoftDeleted($level);

        $this->patchJson("/api/categories/{$category->id}/restore")->assertOk();
        $this->patchJson("/api/levels/{$level->id}/restore")->assertOk()->assertJsonPath('deleted_at', null);
    }

    public function test_level_crud(): void
    {
        $arabic = $this->category(['name' => 'Arabic']);
        $quran = $this->category(['name' => 'Quran']);

        $this->actingAsRole('admin');

        $created = $this->postJson('/api/levels', ['category_id' => $arabic->id, 'name' => 'Beginner', 'order' => 1])
            ->assertCreated()
            ->assertJsonPath('name', 'Beginner')
            ->assertJsonPath('category_id', $arabic->id)
            ->assertJsonPath('category.name', 'Arabic')
            ->assertJsonPath('is_active', true)
            ->assertJsonPath('order', 1)
            ->json();

        $this->getJson("/api/levels/{$created['id']}")->assertOk()->assertJsonPath('category.id', $arabic->id);

        $this->putJson("/api/levels/{$created['id']}", ['category_id' => $quran->id, 'name' => 'Foundations', 'is_active' => false])
            ->assertOk()
            ->assertJsonPath('category.name', 'Quran')
            ->assertJsonPath('name', 'Foundations')
            ->assertJsonPath('is_active', false);

        $this->deleteJson("/api/levels/{$created['id']}")->assertOk();
        $this->assertSoftDeleted('levels', ['id' => $created['id']]);

        $this->patchJson("/api/levels/{$created['id']}/restore")->assertOk();
        $this->assertNotSoftDeleted('levels', ['id' => $created['id']]);
    }

    public function test_a_level_needs_an_existing_category(): void
    {
        $deleted = $this->category();
        $deleted->delete();

        $this->actingAsRole('admin');

        $this->postJson('/api/levels', ['name' => 'Beginner'])->assertJsonValidationErrors('category_id');
        $this->postJson('/api/levels', ['category_id' => 999, 'name' => 'Beginner'])->assertJsonValidationErrors('category_id');
        $this->postJson('/api/levels', ['category_id' => $deleted->id, 'name' => 'Beginner'])
            ->assertJsonValidationErrors(['category_id' => 'Choose an existing category.']);
    }

    public function test_level_names_are_unique_per_category(): void
    {
        $arabic = $this->category(['name' => 'Arabic']);
        $quran = $this->category(['name' => 'Quran']);
        $arabic->levels()->create(['name' => 'Beginner', 'order' => 1]);
        $arabic->levels()->create(['name' => 'Retired', 'order' => 2])->delete();
        $intermediate = $quran->levels()->create(['name' => 'Intermediate', 'order' => 5]);

        $this->actingAsRole('admin');

        $this->postJson('/api/levels', ['category_id' => $arabic->id, 'name' => 'Beginner'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'This category already has a level named "Beginner".']);

        // A soft-deleted level's name is free to reuse.
        $this->postJson('/api/levels', ['category_id' => $arabic->id, 'name' => 'Retired'])->assertCreated();

        // The same name is fine in another category.
        $this->postJson('/api/levels', ['category_id' => $quran->id, 'name' => 'Beginner'])->assertCreated();

        // Moving a level into a category that already has its name clashes, even without sending the name.
        $this->putJson("/api/levels/{$intermediate->id}", ['name' => 'Beginner'])->assertJsonValidationErrors('name');
        $quran->levels()->where('name', 'Beginner')->update(['name' => 'Basics']);
        $intermediate->update(['name' => 'Beginner']);
        $this->putJson("/api/levels/{$intermediate->id}", ['category_id' => $arabic->id])
            ->assertJsonValidationErrors(['name' => 'This category already has a level named "Beginner".']);

        // Saving a level under its own name isn't a clash.
        $this->putJson("/api/levels/{$intermediate->id}", ['name' => 'Beginner', 'is_active' => false])->assertOk();
    }

    public function test_level_orders_are_unique_per_category(): void
    {
        $arabic = $this->category(['name' => 'Arabic']);
        $quran = $this->category(['name' => 'Quran']);
        $arabic->levels()->create(['name' => 'A1', 'order' => 1]);
        $arabic->levels()->create(['name' => 'Old', 'order' => 2])->delete();
        $tajweed = $quran->levels()->create(['name' => 'Tajweed', 'order' => 1]);

        $this->actingAsRole('admin');

        $this->postJson('/api/levels', ['category_id' => $arabic->id, 'name' => 'A2', 'order' => 1])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['order' => 'Order 1 is already used by "A1" in this category.']);

        // A soft-deleted level's order is free, and orders are per category.
        $this->postJson('/api/levels', ['category_id' => $arabic->id, 'name' => 'A2', 'order' => 2])->assertCreated();
        $this->assertSame(1, $tajweed->order);

        // Moving a level keeps its order, which may already be taken in the new category...
        $this->putJson("/api/levels/{$tajweed->id}", ['category_id' => $arabic->id])
            ->assertJsonValidationErrors(['order' => 'Order 1 is already used by "A1" in this category.']);
        // ...so it can move with a free one.
        $this->putJson("/api/levels/{$tajweed->id}", ['category_id' => $arabic->id, 'order' => 3])
            ->assertOk()
            ->assertJsonPath('category_id', $arabic->id);

        // Its own order isn't a clash.
        $this->putJson("/api/levels/{$tajweed->id}", ['order' => 3, 'name' => 'Tajweed basics'])->assertOk();
    }

    public function test_level_listings_filter_by_category_active_and_trashed(): void
    {
        $arabic = $this->category(['name' => 'Arabic', 'order' => 2]);
        $quran = $this->category(['name' => 'Quran', 'order' => 1]);
        $arabic->levels()->create(['name' => 'Advanced', 'order' => 2]);
        $arabic->levels()->create(['name' => 'Beginner', 'order' => 1]);
        $arabic->levels()->create(['name' => 'Paused', 'order' => 3, 'is_active' => false]);
        $arabic->levels()->create(['name' => 'Old'])->delete();
        $quran->levels()->create(['name' => 'Tajweed']);

        $this->actingAsRole('admin');

        // Grouped by category display order, then level order.
        $this->assertSame(
            ['Tajweed', 'Beginner', 'Advanced', 'Paused'],
            array_column($this->getJson('/api/levels')->assertOk()->json(), 'name')
        );
        $this->assertSame(
            ['Beginner', 'Advanced', 'Paused'],
            array_column($this->getJson("/api/levels?category_id={$arabic->id}")->json(), 'name')
        );
        $this->assertSame(['Paused'], array_column($this->getJson('/api/levels?active=0')->json(), 'name'));
        $this->assertSame(['Old'], array_column($this->getJson('/api/levels?trashed=only')->json(), 'name'));
        $this->assertCount(5, $this->getJson('/api/levels?trashed=with')->json());

        $this->assertSame(
            ['Beginner', 'Advanced'],
            array_column($this->getJson("/api/categories/{$arabic->id}/levels?active=1")->json(), 'name')
        );
        $this->assertSame(
            ['Old'],
            array_column($this->getJson("/api/categories/{$arabic->id}/levels?trashed=only")->json(), 'name')
        );
        $this->getJson("/api/categories/{$quran->id}/levels")->assertJsonCount(1)->assertJsonPath('0.category.name', 'Quran');
    }

    public function test_category_levels_relation_is_ordered(): void
    {
        $category = $this->category();
        $category->levels()->create(['name' => 'B', 'order' => 2]);
        $category->levels()->create(['name' => 'A', 'order' => 1]);

        $this->assertSame(['A', 'B'], $category->levels->pluck('name')->all());
        $this->assertTrue(Level::first()->category->is($category));
    }
}
