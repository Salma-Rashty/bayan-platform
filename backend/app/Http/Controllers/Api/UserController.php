<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Users\IndexUsersRequest;
use App\Http\Requests\Api\Users\ResetUserPasswordRequest;
use App\Http\Requests\Api\Users\StoreUserRequest;
use App\Http\Requests\Api\Users\UpdateUserRequest;
use App\Http\Requests\Api\Users\UpdateUserStatusRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Policies\UserPolicy;
use App\Support\AccessCatalog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\PersonalAccessToken;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    /** Relations every user response needs (roles/permissions feed the resource, tags the badges). */
    private const LIST_RELATIONS = ['roles.permissions', 'permissions', 'tags'];

    public function index(IndexUsersRequest $request): AnonymousResourceCollection
    {
        $filters = $request->validated();
        $search = $filters['search'] ?? null;

        $query = User::query()
            ->with(self::LIST_RELATIONS)
            ->when($search, function ($query, string $search) {
                $term = '%'.addcslashes($search, '%_\\').'%';
                $query->where(fn ($query) => $query->where('name', 'like', $term)->orWhere('email', 'like', $term));
            })
            ->when($filters['role'] ?? null, fn ($query, string $role) => $query->role($role))
            ->when($filters['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($filters['country'] ?? null, fn ($query, string $country) => $query->where('country', $country))
            ->when($filters['tag'] ?? null, fn ($query, int $tag) => $query->whereHas('tags', fn ($query) => $query->whereKey($tag)))
            ->when(($filters['trashed'] ?? null) === 'with', fn ($query) => $query->withTrashed())
            ->when(($filters['trashed'] ?? null) === 'only', fn ($query) => $query->onlyTrashed());

        $direction = $filters['direction'] ?? 'desc';
        $query->orderBy($filters['sort'] ?? 'created_at', $direction)->orderBy('id', $direction);

        return UserResource::collection(
            $query->paginate($filters['per_page'] ?? 15)->withQueryString()
        );
    }

    /**
     * The roles and permissions that can be assigned to users, for the user forms and filters.
     * Read-only and open to anyone managing users; editing them is super-admin only (/roles).
     */
    public function accessOptions(): JsonResponse
    {
        Gate::authorize('viewAny', User::class);

        $roles = Role::pluck('name')
            ->sortBy(fn (string $name) => AccessCatalog::roleSortKey($name))
            ->values();

        $permissions = Permission::pluck('name')
            ->sortBy(fn (string $name) => AccessCatalog::permissionSortKey($name))
            ->map(fn (string $name) => ['name' => $name, ...AccessCatalog::describePermission($name)])
            ->values();

        return response()->json([
            'roles' => $roles,
            'permissions' => $permissions,
            // Roles only a super-admin may grant or remove (see UserPolicy::assignRoles).
            'elevated_roles' => UserPolicy::rolesGrantingElevatedPermissions(),
        ]);
    }

    public function show(User $user): UserResource
    {
        Gate::authorize('view', $user);

        return new UserResource($this->loadDetail($user));
    }

    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create([
                ...$request->safe()->only(['name', 'email', 'phone', 'country']),
                'password' => Hash::make($request->validated('password')),
            ]);

            $user->syncRoles($request->validated('roles') ?? []);
            $user->syncPermissions($request->validated('permissions') ?? []);
            $user->tags()->sync($request->validated('tags') ?? []);

            return $user;
        });

        return (new UserResource($this->loadDetail($user)))->response()->setStatusCode(201);
    }

    public function update(UpdateUserRequest $request, User $user): UserResource
    {
        DB::transaction(function () use ($request, $user) {
            $user->update($request->safe()->only(['name', 'email', 'phone', 'country']));

            if ($request->has('roles')) {
                $user->syncRoles($request->validated('roles'));
            }

            if ($request->has('permissions')) {
                $user->syncPermissions($request->validated('permissions'));
            }

            if ($request->has('tags')) {
                $user->tags()->sync($request->validated('tags'));
            }
        });

        return new UserResource($this->loadDetail($user));
    }

    public function updateStatus(UpdateUserStatusRequest $request, User $user): UserResource
    {
        $user->update(['status' => $request->validated('status')]);

        return new UserResource($this->loadDetail($user));
    }

    public function resetPassword(ResetUserPasswordRequest $request, User $user): JsonResponse
    {
        $user->update(['password' => Hash::make($request->validated('password'))]);

        // Sign the user out everywhere so the old password's sessions can't linger.
        // Resetting your own password keeps your current session alive.
        $currentToken = $request->user()->currentAccessToken();

        $user->tokens()
            ->when(
                $user->is($request->user()) && $currentToken instanceof PersonalAccessToken,
                fn ($query) => $query->whereKeyNot($currentToken->getKey())
            )
            ->delete();

        return response()->json(['message' => 'Password updated.']);
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

        return new UserResource($this->loadDetail($user));
    }

    private function loadDetail(User $user): User
    {
        return $user->load([
            ...self::LIST_RELATIONS,
            'enrollments' => fn ($query) => $query->latest('enrolled_at'),
            'enrollments.course' => fn ($query) => $query->withTrashed(),
            'notes.author',
        ]);
    }
}
