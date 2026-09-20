<?php

namespace App\Policies;

use App\Models\Submission;
use App\Models\User;

class SubmissionPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Submission $submission): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can update the model.
     *
     * Note: this governs plain edits (e.g. correcting submitted content). Setting
     * grade/feedback is a separate ability gated by the `grade-homework` permission,
     * checked directly on the Filament "Grade" action rather than through this method.
     */
    public function update(User $user, Submission $submission): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Submission $submission): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Submission $submission): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Submission $submission): bool
    {
        return false;
    }
}
