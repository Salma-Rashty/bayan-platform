<?php

namespace App\Policies;

use App\Models\Category;
use App\Models\User;

/**
 * The course catalog (categories and their levels) is managed by holders of manage-catalog.
 */
class CategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function view(User $user, Category $category): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function update(User $user, Category $category): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function delete(User $user, Category $category): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    public function restore(User $user, Category $category): bool
    {
        return $user->hasPermissionTo('manage-catalog');
    }

    /** Catalog entries are only ever soft-deleted. */
    public function forceDelete(User $user, Category $category): bool
    {
        return false;
    }
}
