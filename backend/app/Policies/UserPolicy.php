<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\Response;
use Spatie\Permission\Models\Role;

/**
 * Handles super-admins itself (they are exempt from the global Gate::before bypass for
 * User abilities) so the self-protection rules below apply to them too.
 *
 * Safeguard: accounts holding the admin or super-admin role can only be modified by a
 * super-admin, and nobody can suspend or delete their own account.
 */
class UserPolicy
{
    /** Roles only a super-admin may grant or revoke. */
    public const ADMIN_TIER_ROLES = ['super-admin', 'admin'];

    /** Permissions conferring admin-level control, which only a super-admin may grant or revoke. */
    public const ELEVATED_PERMISSIONS = ['manage-users', 'manage-billing'];

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return $this->canManageUsers($user);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, User $model): bool
    {
        return $this->canManageUsers($user);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $this->canManageUsers($user);
    }

    /**
     * Determine whether the user can update the model's profile, roles, permissions and tags.
     */
    public function update(User $user, User $model): Response
    {
        return $this->modify($user, $model);
    }

    /**
     * Determine whether the user can suspend or reactivate the model.
     */
    public function suspend(User $user, User $model): Response
    {
        if ($user->is($model)) {
            return Response::deny('You cannot change the status of your own account.');
        }

        return $this->modify($user, $model);
    }

    /**
     * Determine whether the user can set a new password for the model.
     */
    public function resetPassword(User $user, User $model): Response
    {
        return $this->modify($user, $model);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, User $model): Response
    {
        if ($user->is($model)) {
            return Response::deny('You cannot delete your own account.');
        }

        return $this->modify($user, $model);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, User $model): Response
    {
        return $this->modify($user, $model);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, User $model): bool
    {
        return false;
    }

    /**
     * Determine whether the user can set `$roles` as the full role list of `$model`
     * (or of a new user when `$model` is null).
     *
     * @param  array<int, string>  $roles
     */
    public function assignRoles(User $user, array $roles, ?User $model = null): Response
    {
        $current = $model?->getRoleNames()->all() ?? [];
        $changed = array_merge(array_diff($roles, $current), array_diff($current, $roles));

        if ($changed === []) {
            return Response::allow();
        }

        if ($model && $user->is($model)) {
            return Response::deny('You cannot change your own roles.');
        }

        if ($user->hasRole('super-admin')) {
            return Response::allow();
        }

        if (array_intersect($changed, self::ADMIN_TIER_ROLES)) {
            return Response::deny('Only a super-admin can grant or remove the admin and super-admin roles.');
        }

        // A custom role bundling an elevated permission would otherwise be a way around assignPermissions().
        $elevated = self::rolesGrantingElevatedPermissions($changed);

        if ($elevated !== []) {
            return Response::deny('Only a super-admin can grant or remove roles that include '
                .implode(' or ', self::ELEVATED_PERMISSIONS).': '.implode(', ', $elevated).'.');
        }

        return Response::allow();
    }

    /**
     * Determine whether the user can set `$permissions` as the full direct-permission list of
     * `$model` (or of a new user when `$model` is null). Non-super-admins can never grant or
     * revoke elevated permissions, and otherwise only ones they hold themselves, so they can't
     * hand out more access than they have.
     *
     * @param  array<int, string>  $permissions
     */
    public function assignPermissions(User $user, array $permissions, ?User $model = null): Response
    {
        $current = $model?->getDirectPermissions()->pluck('name')->all() ?? [];
        $changed = array_merge(array_diff($permissions, $current), array_diff($current, $permissions));

        if ($changed === [] || $user->hasRole('super-admin')) {
            return Response::allow();
        }

        $elevated = array_values(array_intersect($changed, self::ELEVATED_PERMISSIONS));

        if ($elevated !== []) {
            return Response::deny('Only a super-admin can grant or revoke '.implode(', ', $elevated).'.');
        }

        $notHeld = array_diff($changed, $user->getAllPermissions()->pluck('name')->all());

        if ($notHeld !== []) {
            return Response::deny('You can only grant or revoke permissions you hold yourself: '.implode(', ', $notHeld).'.');
        }

        return Response::allow();
    }

    /**
     * Which of the given roles (or all roles, when null) include an elevated permission.
     *
     * @param  array<int, string>|null  $roles
     * @return array<int, string>
     */
    public static function rolesGrantingElevatedPermissions(?array $roles = null): array
    {
        return Role::query()
            ->when($roles !== null, fn ($query) => $query->whereIn('name', $roles))
            ->whereHas('permissions', fn ($query) => $query->whereIn('name', self::ELEVATED_PERMISSIONS))
            ->orderBy('name')
            ->pluck('name')
            ->all();
    }

    private function canManageUsers(User $user): bool
    {
        return $user->hasRole('super-admin') || $user->hasPermissionTo('manage-users');
    }

    private function modify(User $user, User $model): Response
    {
        if (! $this->canManageUsers($user)) {
            return Response::deny();
        }

        if ($model->isAdminTier() && ! $user->hasRole('super-admin')) {
            return Response::deny('Only a super-admin can modify admin and super-admin accounts.');
        }

        return Response::allow();
    }
}
