<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\Quizzes\AttemptQuizRequest;
use App\Http\Requests\Api\Quizzes\StoreQuizRequest;
use App\Http\Requests\Api\Quizzes\UpdateQuizRequest;
use App\Http\Resources\QuizAttemptResource;
use App\Http\Resources\QuizResource;
use App\Models\Lesson;
use App\Models\Quiz;
use App\Services\QuizAttemptService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

class QuizController extends Controller
{
    public function index(Lesson $lesson): AnonymousResourceCollection
    {
        return QuizResource::collection($lesson->quizzes()->with('questions.options')->get());
    }

    public function show(Request $request, Quiz $quiz): QuizResource
    {
        return new QuizResource($quiz->load('questions.options'));
    }

    public function store(StoreQuizRequest $request, Lesson $lesson): JsonResponse
    {
        $quiz = $lesson->quizzes()->create($request->validated());

        return (new QuizResource($quiz))->response()->setStatusCode(201);
    }

    public function update(UpdateQuizRequest $request, Quiz $quiz): QuizResource
    {
        $quiz->update($request->validated());

        return new QuizResource($quiz);
    }

    public function destroy(Quiz $quiz): JsonResponse
    {
        Gate::authorize('delete', $quiz);

        $quiz->delete();

        return response()->json(['message' => 'Quiz deleted.']);
    }

    public function restore(Quiz $quiz): QuizResource
    {
        Gate::authorize('restore', $quiz);

        $quiz->restore();

        return new QuizResource($quiz);
    }

    public function attempt(AttemptQuizRequest $request, Quiz $quiz, QuizAttemptService $service): JsonResponse
    {
        $user = $request->user();
        $courseId = $quiz->lesson->course_id;

        if (! $user->hasRole('super-admin') && ! $user->isEnrolledIn($courseId)) {
            abort(403, 'You must be enrolled in this course to attempt this quiz.');
        }

        $attempt = $service->attempt($quiz, $user, $request->validated('answers'));

        return (new QuizAttemptResource($attempt))->response()->setStatusCode(201);
    }

    public function attempts(Request $request, Quiz $quiz): AnonymousResourceCollection
    {
        if (! $request->user()->hasAnyRole(['super-admin', 'admin', 'teacher'])) {
            abort(403);
        }

        return QuizAttemptResource::collection(
            $quiz->attempts()->with('user')->latest()->paginate(15)
        );
    }
}
