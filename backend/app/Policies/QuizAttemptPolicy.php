<?php

namespace App\Policies;

use App\Models\QuizAttempt;
use App\Models\User;

class QuizAttemptPolicy
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
     *
     * A student may view their own attempt; curriculum staff may view any attempt.
     */
    public function view(User $user, QuizAttempt $quizAttempt): bool
    {
        return $user->id === $quizAttempt->user_id || $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can create models.
     *
     * Enrollment in the quiz's course is enforced separately, in the controller.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, QuizAttempt $quizAttempt): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, QuizAttempt $quizAttempt): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, QuizAttempt $quizAttempt): bool
    {
        return $user->hasPermissionTo('edit-curriculum');
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, QuizAttempt $quizAttempt): bool
    {
        return false;
    }
}
