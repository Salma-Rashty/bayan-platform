<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Lessons\StoreLessonRequest;
use App\Http\Requests\Api\Lessons\UpdateLessonRequest;
use App\Http\Resources\LessonResource;
use App\Models\Course;
use App\Models\Lesson;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class LessonController extends Controller
{
    public function index(Request $request, Course $course): AnonymousResourceCollection
    {
        $this->authorizeAccess($request, $course);

        return LessonResource::collection($course->lessons()->with(['materials', 'assignments', 'quizzes'])->get());
    }

    public function show(Request $request, Lesson $lesson): LessonResource
    {
        $this->authorizeAccess($request, $lesson->course);

        return new LessonResource($lesson->load(['materials', 'assignments', 'quizzes']));
    }

    public function store(StoreLessonRequest $request, Course $course): JsonResponse
    {
        $lesson = $course->lessons()->create($request->validated());

        return (new LessonResource($lesson))->response()->setStatusCode(201);
    }

    public function update(UpdateLessonRequest $request, Lesson $lesson): LessonResource
    {
        $lesson->update($request->validated());

        return new LessonResource($lesson);
    }

    public function destroy(Lesson $lesson): JsonResponse
    {
        Gate::authorize('delete', $lesson);

        $lesson->delete();

        return response()->json(['message' => 'Lesson deleted.']);
    }

    public function restore(Lesson $lesson): LessonResource
    {
        Gate::authorize('restore', $lesson);

        $lesson->restore();

        return new LessonResource($lesson);
    }

    /**
     * Curriculum staff see everything; everyone else must be enrolled in the course.
     */
    private function authorizeAccess(Request $request, Course $course): void
    {
        $user = $request->user();

        if ($user->hasAnyRole(['super-admin', 'admin', 'teacher'])) {
            return;
        }

        if ($user->isEnrolledIn($course->id)) {
            return;
        }

        abort(403, 'You must be enrolled in this course.');
    }
}
