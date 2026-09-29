<?php

namespace App\Policies;

use App\Models\User;

/**
 * Permissions are read-only over the API (they're defined in code), and only super-admins
 * need the list, to edit role permission matrices.
 */
class PermissionPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('super-admin');
    }
}
