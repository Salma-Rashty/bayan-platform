<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Materials\StoreMaterialRequest;
use App\Http\Requests\Api\Materials\UpdateMaterialRequest;
use App\Http\Resources\MaterialResource;
use App\Models\Lesson;
use App\Models\Material;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class MaterialController extends Controller
{
    public function index(Request $request, Lesson $lesson): AnonymousResourceCollection
    {
        $this->authorizeAccess($request, $lesson);

        return MaterialResource::collection($lesson->materials()->get());
    }

    public function show(Request $request, Material $material): MaterialResource
    {
        $this->authorizeAccess($request, $material->lesson);

        return new MaterialResource($material);
    }

    public function store(StoreMaterialRequest $request, Lesson $lesson): JsonResponse
    {
        $material = $lesson->materials()->create($request->validated());

        return (new MaterialResource($material))->response()->setStatusCode(201);
    }

    public function update(UpdateMaterialRequest $request, Material $material): MaterialResource
    {
        $material->update($request->validated());

        return new MaterialResource($material);
    }

    public function destroy(Material $material): JsonResponse
    {
        Gate::authorize('delete', $material);

        $material->delete();

        return response()->json(['message' => 'Material deleted.']);
    }

    public function restore(Material $material): MaterialResource
    {
        Gate::authorize('restore', $material);

        $material->restore();

        return new MaterialResource($material);
    }

    private function authorizeAccess(Request $request, Lesson $lesson): void
    {
        $user = $request->user();

        if ($user->hasAnyRole(['super-admin', 'admin', 'teacher'])) {
            return;
        }

        if ($user->isEnrolledIn($lesson->course_id)) {
            return;
        }

        abort(403, 'You must be enrolled in this course.');
    }
}
