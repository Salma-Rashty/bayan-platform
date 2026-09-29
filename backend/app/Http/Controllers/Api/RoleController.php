<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Roles\StoreRoleRequest;
use App\Http\Requests\Api\Roles\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Support\AccessCatalog;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends Controller
{
    /**
     * System roles first (in their catalog order), then custom roles by name.
     */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Role::class);

        $roles = $this->query()
            ->get()
            ->sortBy(fn (Role $role) => AccessCatalog::roleSortKey($role->name))
            ->values();

        return RoleResource::collection($roles);
    }

    public function show(Role $role): RoleResource
    {
        Gate::authorize('view', $role);

        return new RoleResource($this->loadDetail($role));
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = DB::transaction(function () use ($request) {
            $role = Role::create(['name' => $request->validated('name'), 'guard_name' => AccessCatalog::GUARD]);
            $role->syncPermissions($request->validated('permissions') ?? []);

            return $role;
        });

        $this->forgetCachedPermissions();

        return (new RoleResource($this->loadDetail($role)))->response()->setStatusCode(201);
    }

    /**
     * Renames the role and/or replaces its permissions (the permission matrix save).
     * Users holding the role pick up the new permissions on their next request.
     */
    public function update(UpdateRoleRequest $request, Role $role): RoleResource
    {
        DB::transaction(function () use ($request, $role) {
            if ($request->has('name')) {
                $role->update(['name' => $request->validated('name')]);
            }

            if ($request->has('permissions')) {
                $role->syncPermissions($request->validated('permissions'));
            }
        });

        $this->forgetCachedPermissions();

        return new RoleResource($this->loadDetail($role));
    }

    public function destroy(Role $role): JsonResponse
    {
        Gate::authorize('delete', $role);

        if (AccessCatalog::isSystemRole($role->name)) {
            abort(403, "\"{$role->name}\" is a system role and cannot be deleted.");
        }

        // Includes soft-deleted accounts: deleting the role would silently strip it from them too.
        $holders = $role->users()->withTrashed()->count();

        if ($holders > 0) {
            throw ValidationException::withMessages([
                'role' => [
                    "\"{$role->name}\" is assigned to {$holders} ".Str::plural('user', $holders)
                    .'. Reassign them to another role before deleting it.',
                ],
            ]);
        }

        $role->delete();
        $this->forgetCachedPermissions();

        return response()->json(['message' => 'Role deleted.']);
    }

    private function query(): Builder
    {
        return AccessCatalog::withUsersCount(
            Role::query(),
            config('permission.table_names.model_has_roles'),
            app(PermissionRegistrar::class)->pivotRole,
        )->with('permissions')->withCount('permissions');
    }

    private function loadDetail(Role $role): Role
    {
        return $this->query()->findOrFail($role->getKey());
    }

    private function forgetCachedPermissions(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
