<?php

namespace App\Policies;

use App\Models\CourseApplication;
use App\Models\User;

class CourseApplicationPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasPermissionTo('manage-users');
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, CourseApplication $courseApplication): bool
    {
        return $user->hasPermissionTo('manage-users');
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-users');
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, CourseApplication $courseApplication): bool
    {
        return $user->hasPermissionTo('manage-users');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, CourseApplication $courseApplication): bool
    {
        return $user->hasPermissionTo('manage-users');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, CourseApplication $courseApplication): bool
    {
        return $user->hasPermissionTo('manage-users');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, CourseApplication $courseApplication): bool
    {
        return false;
    }
}
