<?php

namespace App\Services;

use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;

class QuizAttemptService
{
    /**
     * Score and record a user's attempt at a quiz, overwriting any previous attempt.
     *
     * A question is correct only if the selected option set exactly matches the
     * question's correct option set (this covers both 'single' and 'multiple' types).
     *
     * @param  array<int|string, array<int, int|string>>  $answers  question_id => selected option_ids
     */
    public function attempt(Quiz $quiz, User $user, array $answers): QuizAttempt
    {
        $questions = $quiz->questions()->with('options')->get();

        $correctCount = 0;

        foreach ($questions as $question) {
            $selected = collect($answers[$question->id] ?? [])
                ->map(fn ($id) => (int) $id)
                ->sort()
                ->values();

            $correctOptionIds = $question->options
                ->where('is_correct', true)
                ->pluck('id')
                ->sort()
                ->values();

            if ($selected->all() === $correctOptionIds->all()) {
                $correctCount++;
            }
        }

        $score = $questions->isEmpty() ? 0 : round($correctCount / $questions->count() * 100, 2);

        $values = [
            'answers' => $answers,
            'score' => $score,
            'submitted_at' => now(),
        ];

        $existing = QuizAttempt::withTrashed()
            ->where(['quiz_id' => $quiz->id, 'user_id' => $user->id])
            ->first();

        if ($existing) {
            if ($existing->trashed()) {
                $existing->restore();
            }

            $existing->update($values);

            return $existing;
        }

        return QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            ...$values,
        ]);
    }
}
