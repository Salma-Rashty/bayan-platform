<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\PermissionResource;
use App\Support\AccessCatalog;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Spatie\Permission\Models\Permission;

/**
 * Read-only: permissions are defined in code (RolesAndPermissionsSeeder) alongside the
 * features that check them, never created or deleted from the UI.
 */
class PermissionController extends Controller
{
    /**
     * All permissions with display labels and groups, in catalog order, for the role matrix.
     */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Permission::class);

        $permissions = Permission::query()
            ->where('guard_name', AccessCatalog::GUARD)
            ->get()
            ->sortBy(fn (Permission $permission) => AccessCatalog::permissionSortKey($permission->name))
            ->values();

        return PermissionResource::collection($permissions);
    }
}
