<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Questions\StoreQuestionRequest;
use App\Http\Requests\Api\Questions\UpdateQuestionRequest;
use App\Http\Resources\QuestionResource;
use App\Models\Question;
use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class QuestionController extends Controller
{
    public function index(Quiz $quiz): AnonymousResourceCollection
    {
        return QuestionResource::collection($quiz->questions()->with('options')->get());
    }

    public function show(Question $question): QuestionResource
    {
        return new QuestionResource($question->load('options'));
    }

    public function store(StoreQuestionRequest $request, Quiz $quiz): JsonResponse
    {
        $question = $quiz->questions()->create($request->validated());

        return (new QuestionResource($question))->response()->setStatusCode(201);
    }

    public function update(UpdateQuestionRequest $request, Question $question): QuestionResource
    {
        $question->update($request->validated());

        return new QuestionResource($question);
    }

    public function destroy(Question $question): JsonResponse
    {
        Gate::authorize('delete', $question);

        $question->delete();

        return response()->json(['message' => 'Question deleted.']);
    }

    public function restore(Question $question): QuestionResource
    {
        Gate::authorize('restore', $question);

        $question->restore();

        return new QuestionResource($question);
    }
}
