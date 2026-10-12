<?php

namespace App\Http\Requests\Api\Categories;

use App\Models\Category;
use App\Support\CatalogUniqueness;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Category::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            // Omit to take the next free order (see Category::booted).
            'order' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /**
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            fn (Validator $validator) => CatalogUniqueness::addErrors(
                $validator,
                CatalogUniqueness::categoryConflicts($this->only(['name', 'order']))
            ),
        ];
    }
}
