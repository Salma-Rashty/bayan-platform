<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Tags\StoreTagRequest;
use App\Http\Resources\TagResource;
use App\Models\Tag;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class TagController extends Controller
{
    /**
     * All tags, unpaginated: the list is small and feeds the tag selector and filters.
     */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Tag::class);

        return TagResource::collection(Tag::withCount('users')->orderBy('name')->get());
    }

    public function store(StoreTagRequest $request): JsonResponse
    {
        $tag = Tag::create($request->validated());

        return (new TagResource($tag))->response()->setStatusCode(201);
    }
}
