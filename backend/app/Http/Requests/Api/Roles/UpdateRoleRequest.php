<?php

namespace App\Http\Requests\Api\Roles;

use App\Support\AccessCatalog;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Spatie\Permission\Models\Role;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var Role $role */
        $role = $this->route('role');

        if (! $this->user()->can('update', $role)) {
            return false;
        }

        // Checked here rather than in RolePolicy: Gate::before would let super-admins past it.
        if ($role->name === AccessCatalog::LOCKED_ROLE) {
            throw new AuthorizationException('The super-admin role is locked: it always has every permission and cannot be changed.');
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'sometimes', 'string', 'max:50', 'regex:'.RoleNameRules::PATTERN,
                Rule::unique('roles', 'name')->ignore($this->route('role')),
            ],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', 'distinct', 'exists:permissions,name'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return RoleNameRules::MESSAGES;
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $role = $this->route('role');

                if ($this->has('name') && $this->input('name') !== $role->name && AccessCatalog::isSystemRole($role->name)) {
                    $validator->errors()->add('name', "\"{$role->name}\" is a system role and cannot be renamed.");
                }
            },
        ];
    }
}
