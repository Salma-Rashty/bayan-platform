<?php

namespace Tests\Feature\Api;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Quiz;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LmsApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
    }

    public function test_full_lms_api_flow(): void
    {
        // Properly-permissioned curriculum staff (the seeder currently never grants
        // 'edit-curriculum' to admin/teacher — see the flagged gap in the report).
        $curriculumAdmin = User::factory()->create();
        $curriculumAdmin->assignRole('admin');
        $curriculumAdmin->givePermissionTo('edit-curriculum');

        $plainAdmin = User::factory()->create();
        $plainAdmin->assignRole('admin');

        $teacher = User::factory()->create();
        $teacher->assignRole('teacher');

        $student = User::factory()->create();
        $student->assignRole('student');

        // A plain admin (seeded permissions only) cannot manage curriculum.
        Sanctum::actingAs($plainAdmin, ['*']);
        $this->postJson('/api/courses', [
            'title' => 'Should Fail',
            'slug' => 'should-fail',
            'type' => 'arabic',
        ])->assertForbidden();

        // Curriculum admin creates a course, lesson, assignment, quiz, question, options.
        Sanctum::actingAs($curriculumAdmin, ['*']);

        $course = $this->postJson('/api/courses', [
            'title' => 'Intro to Arabic',
            'slug' => 'intro-to-arabic',
            'type' => 'arabic',
        ])->assertCreated()->json();

        $lesson = $this->postJson("/api/courses/{$course['id']}/lessons", [
            'title' => 'Lesson 1',
        ])->assertCreated()->json();

        $assignment = $this->postJson("/api/lessons/{$lesson['id']}/assignments", [
            'title' => 'Homework 1',
        ])->assertCreated()->json();

        $quiz = $this->postJson("/api/lessons/{$lesson['id']}/quizzes", [
            'title' => 'Quiz 1',
        ])->assertCreated()->json();

        $question = $this->postJson("/api/quizzes/{$quiz['id']}/questions", [
            'body' => 'What is the first letter of the Arabic alphabet?',
            'type' => 'single',
        ])->assertCreated()->json();

        $wrongOption = $this->postJson("/api/questions/{$question['id']}/options", [
            'body' => 'Ba',
            'is_correct' => false,
        ])->assertCreated()->json();

        $correctOption = $this->postJson("/api/questions/{$question['id']}/options", [
            'body' => 'Alif',
            'is_correct' => true,
        ])->assertCreated()->json();

        // A student cannot see options' answer key.
        Sanctum::actingAs($student, ['*']);
        $this->getJson("/api/questions/{$question['id']}")
            ->assertOk()
            ->assertJsonMissingPath('options.0.is_correct');

        // Student cannot view lesson content before being enrolled.
        $this->getJson("/api/lessons/{$lesson['id']}")->assertForbidden();

        // Student applies to the course.
        $application = $this->postJson("/api/courses/{$course['id']}/apply")
            ->assertCreated()->json();
        $this->assertSame('pending', $application['status']);

        // Curriculum admin accepts the application; this must create an active enrollment
        // (via CourseApplicationService).
        Sanctum::actingAs($curriculumAdmin, ['*']);
        $this->postJson("/api/course-applications/{$application['id']}/accept")
            ->assertOk()
            ->assertJsonPath('status', 'accepted');

        $this->assertDatabaseHas('enrollments', [
            'user_id' => $student->id,
            'course_id' => $course['id'],
            'status' => 'active',
        ]);

        // Now enrolled, the student can see the lesson and its children.
        Sanctum::actingAs($student, ['*']);
        $this->getJson("/api/lessons/{$lesson['id']}")->assertOk();

        // Student submits the assignment.
        $submission = $this->postJson("/api/assignments/{$assignment['id']}/submit", [
            'content' => 'My homework answer.',
        ])->assertCreated()->json();

        // A plain admin (no grade-homework permission) cannot grade.
        Sanctum::actingAs($plainAdmin, ['*']);
        $this->postJson("/api/submissions/{$submission['id']}/grade", [
            'grade' => 90,
        ])->assertForbidden();

        // The teacher (has grade-homework) can grade.
        Sanctum::actingAs($teacher, ['*']);
        $this->postJson("/api/submissions/{$submission['id']}/grade", [
            'grade' => 95,
            'feedback' => 'Great job!',
        ])->assertOk()->assertJsonPath('grade', '95.00');

        // Teacher can list submissions/attempts for reporting.
        $this->getJson("/api/assignments/{$assignment['id']}/submissions")->assertOk();

        // Student attempts the quiz and is auto-scored (1 correct out of 1 = 100).
        Sanctum::actingAs($student, ['*']);
        $attempt = $this->postJson("/api/quizzes/{$quiz['id']}/attempt", [
            'answers' => [
                $question['id'] => [$correctOption['id']],
            ],
        ])->assertCreated()->json();

        $this->assertEquals(100, $attempt['score']);

        // Re-attempting with the wrong answer overwrites the same attempt row (0 score).
        $attempt = $this->postJson("/api/quizzes/{$quiz['id']}/attempt", [
            'answers' => [
                $question['id'] => [$wrongOption['id']],
            ],
        ])->assertCreated()->json();

        $this->assertEquals(0, $attempt['score']);
        $this->assertDatabaseCount('quiz_attempts', 1);

        // Student cannot attempt a quiz for a course they are not enrolled in.
        $otherCourse = Course::create(['title' => 'Other', 'slug' => 'other', 'type' => 'quran', 'is_published' => true]);
        $otherLesson = Lesson::create(['course_id' => $otherCourse->id, 'title' => 'Other Lesson']);
        $otherQuiz = Quiz::create(['lesson_id' => $otherLesson->id, 'title' => 'Other Quiz']);

        $this->postJson("/api/quizzes/{$otherQuiz->id}/attempt", [
            'answers' => ['1' => []],
        ])->assertForbidden();

        // manage-users endpoints: student cannot list enrollments/users.
        $this->getJson('/api/enrollments')->assertForbidden();
        $this->getJson('/api/users')->assertForbidden();

        // The teacher application accept flow creates-or-restores a User and assigns the role.
        Sanctum::actingAs($curriculumAdmin, ['*']);
        $curriculumAdmin->givePermissionTo('manage-users');

        $teacherApplication = $this->postJson('/api/teacher-applications', [
            'name' => 'Prospective Teacher',
            'email' => 'prospective@example.test',
        ])->assertCreated()->json();

        $this->postJson("/api/teacher-applications/{$teacherApplication['id']}/accept")
            ->assertOk()
            ->assertJsonPath('status', 'accepted');

        $newTeacher = User::where('email', 'prospective@example.test')->first();
        $this->assertNotNull($newTeacher);
        $this->assertTrue($newTeacher->hasRole('teacher'));

        // Soft-delete + restore a course.
        $this->deleteJson("/api/courses/{$course['id']}")->assertOk();
        $this->assertSoftDeleted('courses', ['id' => $course['id']]);
        $this->patchJson("/api/courses/{$course['id']}/restore")->assertOk();
        $this->assertDatabaseHas('courses', ['id' => $course['id'], 'deleted_at' => null]);
    }
}
