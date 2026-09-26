<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Submissions\GradeSubmissionRequest;
use App\Http\Resources\SubmissionResource;
use App\Models\Submission;
use App\Services\SubmissionGradingService;

class SubmissionController extends Controller
{
    public function grade(GradeSubmissionRequest $request, Submission $submission, SubmissionGradingService $service): SubmissionResource
    {
        $graded = $service->grade(
            $submission,
            (float) $request->validated('grade'),
            $request->validated('feedback')
        );

        return new SubmissionResource($graded);
    }
}
