<?php

namespace App\Http\Requests\Api\UserNotes;

use App\Models\UserNote;
use Illuminate\Foundation\Http\FormRequest;

class StoreUserNoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', UserNote::class)
            && $this->user()->can('view', $this->route('user'));
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'body' => ['required', 'string', 'max:5000'],
        ];
    }
}
