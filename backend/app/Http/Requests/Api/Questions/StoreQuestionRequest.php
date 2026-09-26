<?php

namespace App\Http\Requests\Api\Questions;

use App\Models\Question;
use Illuminate\Foundation\Http\FormRequest;

class StoreQuestionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Question::class);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string'],
            'type' => ['required', 'in:single,multiple'],
            'order' => ['nullable', 'integer', 'min:0'],
        ];
    }
}
