<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\TeacherApplications\StoreTeacherApplicationRequest;
use App\Http\Resources\TeacherApplicationResource;
use App\Models\TeacherApplication;
use App\Services\TeacherApplicationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class TeacherApplicationController extends Controller
{
    public function store(StoreTeacherApplicationRequest $request): JsonResponse
    {
        $application = TeacherApplication::create($request->validated());

        return (new TeacherApplicationResource($application))->response()->setStatusCode(201);
    }

    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', TeacherApplication::class);

        return TeacherApplicationResource::collection(
            TeacherApplication::latest()->paginate(15)
        );
    }

    public function accept(TeacherApplication $teacherApplication, TeacherApplicationService $service): TeacherApplicationResource
    {
        Gate::authorize('update', $teacherApplication);

        return new TeacherApplicationResource($service->accept($teacherApplication));
    }

    public function reject(TeacherApplication $teacherApplication, TeacherApplicationService $service): TeacherApplicationResource
    {
        Gate::authorize('update', $teacherApplication);

        return new TeacherApplicationResource($service->reject($teacherApplication));
    }
}
