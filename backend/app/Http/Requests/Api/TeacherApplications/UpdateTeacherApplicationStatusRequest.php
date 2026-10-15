<?php

namespace App\Http\Requests\Api\TeacherApplications;

use App\Models\TeacherApplication;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Gate;
use Illuminate\Validation\Rule;

class UpdateTeacherApplicationStatusRequest extends FormRequest
{
    public function authorize(): bool
    {
        Gate::authorize('update', $this->route('teacherApplication'));

        return true;
    }

    /**
     * Whether the move is allowed from the current status is checked by the service.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'status' => ['required', 'string', Rule::in(TeacherApplication::STATUSES)],
        ];
    }
}
