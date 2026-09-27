<?php

namespace App\Policies;

use App\Models\User;
use App\Models\UserNote;
use Illuminate\Auth\Access\Response;

class UserNotePolicy
{
    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasPermissionTo('manage-users');
    }

    /**
     * Determine whether the user can delete the model. Only the note's author can delete it
     * (super-admins can delete any note via Gate::before).
     */
    public function delete(User $user, UserNote $note): Response
    {
        if (! $user->hasPermissionTo('manage-users')) {
            return Response::deny();
        }

        return $note->author_id === $user->id
            ? Response::allow()
            : Response::deny('You can only delete notes you wrote.');
    }
}
