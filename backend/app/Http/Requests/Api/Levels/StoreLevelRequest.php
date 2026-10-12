<?php

namespace App\Http\Requests\Api\Levels;

use App\Models\Level;
use App\Support\CatalogUniqueness;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Level::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')->withoutTrashed()],
            'name' => ['required', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            // Omit to take the category's next free order (see Level::booted).
            'order' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:65535'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'category_id.exists' => 'Choose an existing category.',
        ];
    }

    /**
     * Name and order are unique within the category, so they're only checked once it's valid.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->has('category_id')) {
                    return;
                }

                CatalogUniqueness::addErrors($validator, CatalogUniqueness::levelConflicts(
                    (int) $this->input('category_id'),
                    $this->only(['name', 'order']),
                ));
            },
        ];
    }
}
