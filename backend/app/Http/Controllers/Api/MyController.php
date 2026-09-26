<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CourseApplicationResource;
use App\Http\Resources\EnrollmentResource;
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

    public function enrollments(Request $request): AnonymousResourceCollection
    {
        return EnrollmentResource::collection(
            $request->user()->enrollments()->with('course')->latest()->paginate(15)
        );
    }
}
