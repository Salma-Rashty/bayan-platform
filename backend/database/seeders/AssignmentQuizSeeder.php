<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\Question;
use App\Models\Quiz;
use Illuminate\Database\Seeder;

class AssignmentQuizSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $lesson = Course::orderBy('id')->first()->lessons()->orderBy('order')->first();

        Assignment::firstOrCreate(
            ['lesson_id' => $lesson->id, 'title' => 'Write the Arabic Alphabet'],
            [
                'description' => 'Practice writing each letter of the Arabic alphabet in its isolated, initial, medial, and final forms.',
                'due_at' => now()->addWeek(),
                'max_grade' => 100,
            ]
        );

        $quiz = Quiz::firstOrCreate(
            ['lesson_id' => $lesson->id, 'title' => 'Alphabet Quiz'],
            ['description' => 'A short quiz to check your knowledge of the Arabic alphabet.']
        );

        $questions = [
            [
                'body' => 'Which letter is pronounced "alif"?',
                'options' => ['ا', 'ب', 'ت'],
                'correct' => 'ا',
            ],
            [
                'body' => 'Which letter is pronounced "ba"?',
                'options' => ['ث', 'ب', 'ج'],
                'correct' => 'ب',
            ],
        ];

        foreach ($questions as $index => $questionData) {
            $question = Question::firstOrCreate(
                ['quiz_id' => $quiz->id, 'body' => $questionData['body']],
                ['type' => 'single', 'order' => $index + 1]
            );

            foreach ($questionData['options'] as $body) {
                $question->options()->firstOrCreate(
                    ['body' => $body],
                    ['is_correct' => $body === $questionData['correct']]
                );
            }
        }
    }
}
