<?php

namespace App\Http\Requests\Api\Users;

use App\Models\User;
use App\Support\Countries;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateUserRequest extends FormRequest
{
    use ReadsStringLists;

    public function authorize(): bool
    {
        $user = $this->route('user');

        Gate::authorize('update', $user);

        if ($this->has('roles')) {
            Gate::authorize('assignRoles', [User::class, $this->stringList('roles'), $user]);
        }

        if ($this->has('permissions')) {
            Gate::authorize('assignPermissions', [User::class, $this->stringList('permissions'), $user]);
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'string', 'email', 'max:255', Rule::unique('users', 'email')->ignore($this->route('user'))],
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
