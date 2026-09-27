<?php

namespace App\Http\Requests\Api\Users;

use App\Models\User;
use App\Support\Countries;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreUserRequest extends FormRequest
{
    use ReadsStringLists;

    public function authorize(): bool
    {
        Gate::authorize('create', User::class);
        Gate::authorize('assignRoles', [User::class, $this->stringList('roles')]);
        Gate::authorize('assignPermissions', [User::class, $this->stringList('permissions')]);

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone' => ['sometimes', 'nullable', 'string', 'max:30'],
            'country' => ['sometimes', 'nullable', 'string', Rule::in(Countries::codes())],
            'roles' => ['sometimes', 'array'],
            'roles.*' => ['string', 'distinct', 'exists:roles,name'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', 'exists:permissions,name'],
            'tags' => ['sometimes', 'array'],
            'tags.*' => ['integer', 'distinct', 'exists:tags,id'],
        ];
    }
}
