<?php

namespace App\Http\Requests\Api\QuestionOptions;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuestionOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('option'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['sometimes', 'string', 'max:255'],
            'is_correct' => ['sometimes', 'boolean'],
        ];
    }
}
