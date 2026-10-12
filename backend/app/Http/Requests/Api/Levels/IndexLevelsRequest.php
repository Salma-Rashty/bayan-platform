<?php

namespace App\Http\Requests\Api\Levels;

use App\Models\Level;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class IndexLevelsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Level::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            // Ignored on GET /categories/{category}/levels, where the route picks the category.
            'category_id' => ['sometimes', 'nullable', 'integer'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'trashed' => ['sometimes', 'nullable', Rule::in(['with', 'only'])],
        ];
    }
}
