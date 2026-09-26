<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseApplicationResource;
use App\Models\CourseApplication;
use App\Services\CourseApplicationService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class CourseApplicationController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', CourseApplication::class);

        return CourseApplicationResource::collection(
            CourseApplication::with(['user', 'course'])->latest()->paginate(15)
        );
    }

    public function accept(CourseApplication $courseApplication, CourseApplicationService $service): CourseApplicationResource
    {
        Gate::authorize('update', $courseApplication);

        return new CourseApplicationResource($service->accept($courseApplication));
    }

    public function reject(CourseApplication $courseApplication, CourseApplicationService $service): CourseApplicationResource
    {
        Gate::authorize('update', $courseApplication);

        return new CourseApplicationResource($service->reject($courseApplication));
    }
}
