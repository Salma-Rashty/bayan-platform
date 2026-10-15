<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\TeacherApplications\IndexTeacherApplicationsRequest;
use App\Http\Requests\Api\TeacherApplications\StoreTeacherApplicationRequest;
use App\Http\Requests\Api\TeacherApplications\UpdateTeacherApplicationStatusRequest;
use App\Http\Resources\TeacherApplicationResource;
use App\Models\TeacherApplication;
use App\Services\TeacherApplicationService;
use App\Support\ApplicantHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class TeacherApplicationController extends Controller
{
    /**
     * The "Teach with us" form, for any signed-in user (admins: on anyone's behalf, no cooldown).
     * Returns a confirmation; the applicant reads their application back from /my/teacher-applications.
     */
    public function store(StoreTeacherApplicationRequest $request, TeacherApplicationService $service): JsonResponse
    {
        $application = $service->submit(
            $request->applicant(),
            $request->selections(),
            $request->file('cv'),
            $request->file('video'),
            $request->applicantUser(),
            $request->user(),
        );

        return response()->json([
            'message' => 'Application received. We will review it and contact you by email.',
            'data' => [
                'reference' => $application->id,
                'status' => $application->status,
                'submitted_at' => $application->created_at,
                'next_allowed_at' => ApplicantHistory::nextAllowedAt($application),
            ],
        ], 201);
    }

    public function index(IndexTeacherApplicationsRequest $request): AnonymousResourceCollection
    {
        $status = $request->validated('status');

        return TeacherApplicationResource::collection(
            TeacherApplication::query()
                ->with(['categories.category' => fn ($query) => $query->withTrashed()])
                ->when($status, fn ($query, string $status) => $query->where('status', $status))
                ->latest()
                ->latest('id')
                ->paginate(15)
        );
    }

    public function show(TeacherApplication $teacherApplication): TeacherApplicationResource
    {
        Gate::authorize('view', $teacherApplication);

        return (new TeacherApplicationResource($this->loadSelections($teacherApplication)))->withHistory();
    }

    /**
     * Let this applicant reapply before their cooldown is up.
     */
    public function liftCooldown(Request $request, TeacherApplication $teacherApplication, TeacherApplicationService $service): TeacherApplicationResource
    {
        Gate::authorize('update', $teacherApplication);

        $service->liftCooldown($teacherApplication, $request->user());

        return (new TeacherApplicationResource($this->loadSelections($teacherApplication)))->withHistory();
    }

    public function updateStatus(
        UpdateTeacherApplicationStatusRequest $request,
        TeacherApplication $teacherApplication,
        TeacherApplicationService $service,
    ): TeacherApplicationResource {
        $service->transition($teacherApplication, $request->validated('status'));

        return (new TeacherApplicationResource($this->loadSelections($teacherApplication)))->withHistory();
    }

    public function accept(TeacherApplication $teacherApplication, TeacherApplicationService $service): TeacherApplicationResource
    {
        Gate::authorize('update', $teacherApplication);

        return new TeacherApplicationResource($this->loadSelections($service->accept($teacherApplication)));
    }

    public function reject(TeacherApplication $teacherApplication, TeacherApplicationService $service): TeacherApplicationResource
    {
        Gate::authorize('update', $teacherApplication);

        return new TeacherApplicationResource($this->loadSelections($service->reject($teacherApplication)));
    }

    private function loadSelections(TeacherApplication $application): TeacherApplication
    {
        $withTrashed = fn ($query) => $query->withTrashed();

        return $application->load([
            'user' => $withTrashed,
            'submittedBy' => $withTrashed,
            'categories.category' => $withTrashed,
            'levels.level' => $withTrashed,
            'ageGroups',
        ]);
    }
}
