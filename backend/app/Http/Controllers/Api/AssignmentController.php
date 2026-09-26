<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Assignments\StoreAssignmentRequest;
use App\Http\Requests\Api\Assignments\SubmitAssignmentRequest;
use App\Http\Requests\Api\Assignments\UpdateAssignmentRequest;
use App\Http\Resources\AssignmentResource;
use App\Http\Resources\SubmissionResource;
use App\Models\Assignment;
use App\Models\Lesson;
use App\Models\Submission;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class AssignmentController extends Controller
{
    public function index(Lesson $lesson): AnonymousResourceCollection
    {
        return AssignmentResource::collection($lesson->assignments()->get());
    }

    public function show(Assignment $assignment): AssignmentResource
    {
        return new AssignmentResource($assignment);
    }

    public function store(StoreAssignmentRequest $request, Lesson $lesson): JsonResponse
    {
        $assignment = $lesson->assignments()->create($request->validated());

        return (new AssignmentResource($assignment))->response()->setStatusCode(201);
    }

    public function update(UpdateAssignmentRequest $request, Assignment $assignment): AssignmentResource
    {
        $assignment->update($request->validated());

        return new AssignmentResource($assignment);
    }

    public function destroy(Assignment $assignment): JsonResponse
    {
        Gate::authorize('delete', $assignment);

        $assignment->delete();

        return response()->json(['message' => 'Assignment deleted.']);
    }

    public function restore(Assignment $assignment): AssignmentResource
    {
        Gate::authorize('restore', $assignment);

        $assignment->restore();

        return new AssignmentResource($assignment);
    }

    public function submit(SubmitAssignmentRequest $request, Assignment $assignment): JsonResponse
    {
        $user = $request->user();
        $courseId = $assignment->lesson->course_id;

        if (! $user->hasRole('super-admin') && ! $user->isEnrolledIn($courseId)) {
            abort(403, 'You must be enrolled in this course to submit this assignment.');
        }

        $submission = Submission::createOrReactivate(
            [
                'assignment_id' => $assignment->id,
                'user_id' => $user->id,
            ],
            [
                'content' => $request->validated('content'),
                'file_path' => $request->validated('file_path'),
                'submitted_at' => now(),
            ]
        );

        return (new SubmissionResource($submission))->response()->setStatusCode(201);
    }

    public function submissions(Request $request, Assignment $assignment): AnonymousResourceCollection
    {
        if (! $request->user()->hasAnyRole(['super-admin', 'admin', 'teacher'])) {
            abort(403);
        }

        return SubmissionResource::collection(
            $assignment->submissions()->with('user')->latest()->paginate(15)
        );
    }
}
