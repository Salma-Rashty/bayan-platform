<?php

namespace App\Http\Requests\Api\Users;

use App\Models\User;
use App\Support\Countries;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexUsersRequest extends FormRequest
{
    /** Columns the list may be sorted by. */
    public const SORTABLE = ['name', 'email', 'status', 'created_at', 'last_login_at'];

    public function authorize(): bool
    {
        return $this->user()->can('viewAny', User::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'search' => ['sometimes', 'nullable', 'string', 'max:255'],
            'role' => ['sometimes', 'nullable', 'string', 'exists:roles,name'],
            'status' => ['sometimes', 'nullable', Rule::in(['active', 'suspended'])],
            'tag' => ['sometimes', 'nullable', 'integer', 'exists:tags,id'],
            'country' => ['sometimes', 'nullable', 'string', Rule::in(Countries::codes())],
            'trashed' => ['sometimes', 'nullable', Rule::in(['with', 'only'])],
            'sort' => ['sometimes', 'nullable', Rule::in(self::SORTABLE)],
            'direction' => ['sometimes', 'nullable', Rule::in(['asc', 'desc'])],
            'per_page' => ['sometimes', 'nullable', 'integer', 'min:1', 'max:100'],
        ];
    }
}
