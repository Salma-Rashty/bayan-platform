<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\QuestionOptions\StoreQuestionOptionRequest;
use App\Http\Requests\Api\QuestionOptions\UpdateQuestionOptionRequest;
use App\Http\Resources\QuestionOptionResource;
use App\Models\Question;
use App\Models\QuestionOption;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class QuestionOptionController extends Controller
{
    public function index(Question $question): AnonymousResourceCollection
    {
        return QuestionOptionResource::collection($question->options()->get());
    }

    public function store(StoreQuestionOptionRequest $request, Question $question): JsonResponse
    {
        $option = $question->options()->create($request->validated());

        return (new QuestionOptionResource($option))->response()->setStatusCode(201);
    }

    public function update(UpdateQuestionOptionRequest $request, QuestionOption $option): QuestionOptionResource
    {
        $option->update($request->validated());

        return new QuestionOptionResource($option);
    }

    public function destroy(QuestionOption $option): JsonResponse
    {
        Gate::authorize('delete', $option);

        $option->delete();

        return response()->json(['message' => 'Option deleted.']);
    }

    public function restore(QuestionOption $option): QuestionOptionResource
    {
        Gate::authorize('restore', $option);

        $option->restore();

        return new QuestionOptionResource($option);
    }
}
