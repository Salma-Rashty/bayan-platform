<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseApplicationResource;
use App\Http\Resources\EnrollmentResource;
use App\Http\Resources\MyTeacherApplicationResource;
use App\Models\TeacherApplication;
use App\Support\ApplicantHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MyController extends Controller
{
    public function applications(Request $request): AnonymousResourceCollection
    {
        return CourseApplicationResource::collection(
            $request->user()->courseApplications()->with('course')->latest()->paginate(15)
        );
    }

    /**
     * The signed-in user's own teacher applications (newest first, read-only), and when they
     * may apply again. Admins are never in cooldown.
     */
    public function teacherApplications(Request $request): JsonResponse
    {
        $user = $request->user();
        $withTrashed = fn ($query) => $query->withTrashed();
        $applications = TeacherApplication::query()
            ->where('user_id', $user->id)
            ->with(['categories.category' => $withTrashed, 'levels.level' => $withTrashed, 'ageGroups'])
            ->latest()
            ->latest('id')
            ->get();

        $exempt = $user->can('create', TeacherApplication::class);
        $nextAllowedAt = $exempt
            ? null
            : ApplicantHistory::nextAllowedAt(ApplicantHistory::latest($user->id, $applications->pluck('identity_key')));

        return response()->json([
            'data' => MyTeacherApplicationResource::collection($applications)->resolve($request),
            'can_apply' => $nextAllowedAt === null,
            'next_allowed_at' => $nextAllowedAt,
            'cooldown_exempt' => $exempt,
            'cooldown_months' => ApplicantHistory::COOLDOWN_MONTHS,
        ]);
    }

    public function enrollments(Request $request): AnonymousResourceCollection
    {
        return EnrollmentResource::collection(
            $request->user()->enrollments()->with('course')->latest()->paginate(15)
        );
    }
}
