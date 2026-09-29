<?php

namespace App\Policies;

use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Roles are the keys to the system, so managing them is super-admin only. Guards that
 * apply even to super-admins (e.g. protected system roles) live in the requests/controller,
 * since Gate::before lets super-admins past every policy check.
 */
class RolePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasRole('super-admin');
    }

    public function view(User $user, Role $role): bool
    {
        return $user->hasRole('super-admin');
    }

    public function create(User $user): bool
    {
        return $user->hasRole('super-admin');
    }

    public function update(User $user, Role $role): bool
    {
        return $user->hasRole('super-admin');
    }

    public function delete(User $user, Role $role): bool
    {
        return $user->hasRole('super-admin');
    }
}
