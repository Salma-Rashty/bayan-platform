<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Users\AssignPermissionRequest;
use App\Http\Requests\Api\Users\AssignRoleRequest;
use App\Http\Requests\Api\Users\StoreUserRequest;
use App\Http\Requests\Api\Users\UpdateUserRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', User::class);

        return UserResource::collection(User::latest()->paginate(15));
    }

    public function show(User $user): UserResource
    {
        Gate::authorize('view', $user);

        return new UserResource($user);
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = User::create([
            'name' => $request->validated('name'),
            'email' => $request->validated('email'),
            'password' => Hash::make($request->validated('password')),
        ]);

        $user->syncRoles($request->validated('roles') ?? []);

        return (new UserResource($user))->response()->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        $data = $request->validated();

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);

        return new UserResource($user);
    }

    public function destroy(User $user): JsonResponse
    {
        Gate::authorize('delete', $user);

        $user->delete();

        return response()->json(['message' => 'User deleted.']);
    }

    public function restore(User $user): UserResource
    {
        Gate::authorize('restore', $user);

        $user->restore();

        return new UserResource($user);
    }

    public function assignRole(AssignRoleRequest $request, User $user): UserResource
    {
        $user->assignRole($request->validated('role'));

        return new UserResource($user);
    }

    public function revokeRole(User $user, string $role): UserResource
    {
        Gate::authorize('update', $user);

        if (! Role::where('name', $role)->exists()) {
            throw ValidationException::withMessages(['role' => ["Role \"{$role}\" does not exist."]]);
        }

        $user->removeRole($role);

        return new UserResource($user);
    }

    public function assignPermission(AssignPermissionRequest $request, User $user): UserResource
    {
        $user->givePermissionTo($request->validated('permission'));

        return new UserResource($user);
    }

    public function revokePermission(User $user, string $permission): UserResource
    {
        Gate::authorize('update', $user);

        if (! Permission::where('name', $permission)->exists()) {
            throw ValidationException::withMessages(['permission' => ["Permission \"{$permission}\" does not exist."]]);
        }

        $user->revokePermissionTo($permission);

        return new UserResource($user);
    }
}
