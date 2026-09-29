<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

/**
 * The roles and permissions the application's code depends on, plus display metadata.
 * Custom roles created from the admin UI aren't listed here. Permissions are only ever
 * defined in code: when a feature adds one to RolesAndPermissionsSeeder, add it here too.
 */
class AccessCatalog
{
    /**
     * The guard every role and permission lives on. auth:sanctum makes `sanctum` the default
     * guard during API requests, and Spatie would otherwise pick that up for new records.
     */
    public const GUARD = 'web';

    /** Roles referenced in code (seeders, policies, frontend gating); they can't be renamed or deleted. */
    public const SYSTEM_ROLES = ['super-admin', 'admin', 'teacher', 'student'];

    /** Always has every permission; its permission set can't be edited either. */
    public const LOCKED_ROLE = 'super-admin';

    /** Group for a permission that exists but hasn't been added to the catalog yet. */
    public const UNCATALOGUED_GROUP = 'Other';

    /**
     * Seeded permissions, in display order. `wired` is false for ones no feature checks yet:
     * granting those currently has no effect.
     *
     * @var array<string, array{label: string, group: string, description: string, wired: bool}>
     */
    public const PERMISSIONS = [
        'manage-users' => [
            'label' => 'Manage users',
            'group' => 'People',
            'description' => 'Manage accounts, tags and notes; review course and teacher applications; see enrollments.',
            'wired' => true,
        ],
        'edit-curriculum' => [
            'label' => 'Edit curriculum',
            'group' => 'Curriculum',
            'description' => 'Create and edit courses, lessons, materials, assignments and quizzes; see quiz answers and attempts.',
            'wired' => true,
        ],
        'create-lessons' => [
            'label' => 'Create lessons',
            'group' => 'Curriculum',
            'description' => 'Reserved for letting teachers add lessons.',
            'wired' => false,
        ],
        'grade-homework' => [
            'label' => 'Grade homework',
            'group' => 'Teaching',
            'description' => 'Grade assignment submissions and leave feedback.',
            'wired' => true,
        ],
        'manage-billing' => [
            'label' => 'Manage billing',
            'group' => 'Billing',
            'description' => 'Reserved for payments and invoicing.',
            'wired' => false,
        ],
        'view-reports' => [
            'label' => 'View reports',
            'group' => 'Reporting',
            'description' => 'Reserved for reports and analytics.',
            'wired' => false,
        ],
    ];

    /**
     * Adds a `{$relation}_count` column counting the (non-deleted) users linked through a
     * Spatie pivot. Spatie's own `users` relations resolve the user model from the default
     * guard, which has no user provider under auth:sanctum, so withCount('users') can't be used.
     */
    public static function withUsersCount(Builder $query, string $pivotTable, string $foreignKey): Builder
    {
        $table = $query->getModel()->getTable();

        return $query->select("{$table}.*")->addSelect([
            'users_count' => DB::table($pivotTable, 'pivot')
                ->join('users', 'users.id', '=', 'pivot.model_id')
                ->whereColumn("pivot.{$foreignKey}", "{$table}.id")
                ->where('pivot.model_type', (new User)->getMorphClass())
                ->whereNull('users.deleted_at')
                ->selectRaw('count(*)'),
        ]);
    }

    public static function isSystemRole(string $name): bool
    {
        return in_array($name, self::SYSTEM_ROLES, true);
    }

    /**
     * Display metadata for a permission; uncatalogued ones get a generated label.
     *
     * @return array{label: string, group: string, description: string|null, wired: bool}
     */
    public static function describePermission(string $name): array
    {
        return self::PERMISSIONS[$name] ?? [
            'label' => Str::of($name)->replace('-', ' ')->ucfirst()->toString(),
            'group' => self::UNCATALOGUED_GROUP,
            'description' => null,
            // Permissions are only added in code alongside the feature that checks them.
            'wired' => true,
        ];
    }

    /**
     * Sort key keeping system roles in their declared order, then custom ones by name.
     */
    public static function roleSortKey(string $name): string
    {
        $position = array_search($name, self::SYSTEM_ROLES, true);

        return $position === false ? '1-'.$name : '0-'.$position;
    }

    /**
     * Sort key keeping catalog permissions in their declared order, then any others by name.
     */
    public static function permissionSortKey(string $name): string
    {
        $position = array_search($name, array_keys(self::PERMISSIONS), true);

        return $position === false ? '1-'.$name : '0-'.str_pad((string) $position, 3, '0', STR_PAD_LEFT);
    }
}
