<?php

namespace App\Http\Requests\Api\Levels;

use App\Models\Level;
use App\Support\CatalogUniqueness;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateLevelRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('level'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'category_id' => ['sometimes', 'integer', Rule::exists('categories', 'id')->withoutTrashed()],
            'name' => ['sometimes', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'is_active' => ['sometimes', 'boolean'],
            'order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
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
     * Checks the level's name and order as they'll be after the update, against the category
     * it'll be in: moving a level can clash even when neither field is sent.
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

                /** @var Level $level */
                $level = $this->route('level');

                CatalogUniqueness::addErrors($validator, CatalogUniqueness::levelConflicts(
                    (int) $this->input('category_id', $level->category_id),
                    [
                        'name' => $this->input('name', $level->name),
                        'order' => $this->input('order', $level->order),
                    ],
                    $level->id,
                ));
            },
        ];
    }
}
