<?php

namespace App\Policies;

use App\Models\Level;
use App\Models\User;

/**
 * The course catalog (categories and their levels) is managed by holders of manage-catalog.
 */
class LevelPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function view(User $user, Level $level): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function update(User $user, Level $level): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function delete(User $user, Level $level): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function restore(User $user, Level $level): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    /** Catalog entries are only ever soft-deleted. */
    public function forceDelete(User $user, Level $level): bool
    {
        return false;
    }
}
