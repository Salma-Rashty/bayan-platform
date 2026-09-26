<?php

namespace App\Http\Requests\Api\QuestionOptions;

use App\Models\QuestionOption;
use Illuminate\Foundation\Http\FormRequest;

class StoreQuestionOptionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', QuestionOption::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:255'],
            'is_correct' => ['sometimes', 'boolean'],
        ];
    }
}
