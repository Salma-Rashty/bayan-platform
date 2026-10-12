<?php

namespace App\Http\Requests\Api\Categories;

use App\Models\Category;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexCategoriesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Category::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'active' => ['sometimes', 'nullable', 'boolean'],
            'trashed' => ['sometimes', 'nullable', Rule::in(['with', 'only'])],
        ];
    }
}
