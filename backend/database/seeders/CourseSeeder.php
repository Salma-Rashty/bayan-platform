<?php

namespace Database\Seeders;

use App\Models\Course;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CourseSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $courses = [
            [
                'title' => 'Arabic for Beginners',
                'type' => 'arabic',
                'level' => 'A1',
                'price' => 49.99,
                'starts_at' => now()->addWeeks(2)->toDateString(),
                'registration_opens_at' => now()->toDateString(),
                'registration_closes_at' => now()->addWeek()->toDateString(),
                'is_published' => true,
                'lessons' => [
                    'The Arabic Alphabet',
                    'Basic Greetings',
                    'Everyday Vocabulary',
                ],
            ],
            [
                'title' => 'Quran Recitation Foundations',
                'type' => 'quran',
                'level' => null,
                'price' => 0,
                'starts_at' => now()->addWeeks(3)->toDateString(),
                'registration_opens_at' => now()->toDateString(),
                'registration_closes_at' => now()->addWeeks(2)->toDateString(),
                'is_published' => true,
                'lessons' => [
                    'Tajweed Basics',
                    'Makharij al-Huruf',
                    'Reciting Surah Al-Fatiha',
                ],
            ],
        ];

        foreach ($courses as $courseData) {
            $lessons = $courseData['lessons'];
            unset($courseData['lessons']);

            $slug = Str::slug($courseData['title']);

            $course = Course::firstOrCreate(
                ['slug' => $slug],
                [
                    ...$courseData,
                    'slug' => $slug,
                    'description' => "A sample {$courseData['type']} course.",
                ]
            );

            foreach ($lessons as $index => $title) {
                $course->lessons()->firstOrCreate(
                    ['title' => $title],
                    ['order' => $index + 1]
                );
            }
        }
    }
}
