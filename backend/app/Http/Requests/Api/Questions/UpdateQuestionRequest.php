<?php

namespace App\Http\Requests\Api\Questions;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('question'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['sometimes', 'string'],
            'type' => ['sometimes', 'in:single,multiple'],
            'order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
