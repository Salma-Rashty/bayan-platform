<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Courses\ApplyCourseRequest;
use App\Http\Requests\Api\Courses\StoreCourseRequest;
use App\Http\Requests\Api\Courses\UpdateCourseRequest;
use App\Http\Resources\CourseApplicationResource;
use App\Http\Resources\CourseResource;
use App\Models\Course;
use App\Models\CourseApplication;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CourseController extends Controller
{
    /**
     * Public: guests see published courses. These routes skip auth:sanctum, so a bearer token
     * is resolved explicitly to let staff see unpublished ones too.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Course::query();

        if (! $this->isStaff($request)) {
            $query->where('is_published', true);
        }

        return CourseResource::collection($query->latest()->paginate(15));
    }

    public function show(Request $request, Course $course): CourseResource
    {
        if (! $course->is_published && ! $this->isStaff($request)) {
            abort(404);
        }

        return new CourseResource($course->load('lessons'));
    }

    public function store(StoreCourseRequest $request): JsonResponse
    {
        $course = Course::create($request->validated());

        return (new CourseResource($course))->response()->setStatusCode(201);
    }

    public function update(UpdateCourseRequest $request, Course $course): CourseResource
    {
        $course->update($request->validated());

        return new CourseResource($course);
    }

    public function destroy(Course $course): JsonResponse
    {
        Gate::authorize('delete', $course);

        $course->delete();

        return response()->json(['message' => 'Course deleted.']);
    }

    public function restore(Course $course): CourseResource
    {
        Gate::authorize('restore', $course);

        $course->restore();

        return new CourseResource($course);
    }

    public function apply(ApplyCourseRequest $request, Course $course): JsonResponse
    {
        $application = CourseApplication::createOrReactivate(
            [
                'user_id' => $request->user()->id,
                'course_id' => $course->id,
            ],
            [
                'status' => 'pending',
                'notes' => $request->validated('notes'),
            ]
        );

        return (new CourseApplicationResource($application))->response()->setStatusCode(201);
    }

    private function isStaff(Request $request): bool
    {
        return (bool) $request->user('sanctum')?->hasAnyRole(['super-admin', 'admin', 'teacher']);
    }
}
