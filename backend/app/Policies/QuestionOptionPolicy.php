<?php

namespace App\Policies;

use App\Models\QuestionOption;
use App\Models\User;

class QuestionOptionPolicy
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
    public function view(User $user, QuestionOption $questionOption): bool
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
     */
    public function update(User $user, QuestionOption $questionOption): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, QuestionOption $questionOption): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, QuestionOption $questionOption): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, QuestionOption $questionOption): bool
    {
        return false;
    }
}
