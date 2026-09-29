<?php

use App\Http\Controllers\Api\AssignmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CourseApplicationController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\EnrollmentController;
use App\Http\Controllers\Api\LessonController;
use App\Http\Controllers\Api\MaterialController;
use App\Http\Controllers\Api\MyController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\QuestionOptionController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\SubmissionController;
use App\Http\Controllers\Api\TagController;
use App\Http\Controllers\Api\TeacherApplicationController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\UserNoteController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:6,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:6,1');

Route::post('/teacher-applications', [TeacherApplicationController::class, 'store'])->middleware('throttle:6,1');

Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    // Courses
    Route::get('/courses', [CourseController::class, 'index']);
    Route::get('/courses/{course}', [CourseController::class, 'show']);
    Route::post('/courses', [CourseController::class, 'store']);
    Route::match(['put', 'patch'], '/courses/{course}', [CourseController::class, 'update']);
    Route::delete('/courses/{course}', [CourseController::class, 'destroy']);
    Route::patch('/courses/{course}/restore', [CourseController::class, 'restore'])->withTrashed();
    Route::post('/courses/{course}/apply', [CourseController::class, 'apply']);

    // Lessons (nested under course for listing/creation)
    Route::get('/courses/{course}/lessons', [LessonController::class, 'index']);
    Route::post('/courses/{course}/lessons', [LessonController::class, 'store']);
    Route::get('/lessons/{lesson}', [LessonController::class, 'show']);
    Route::match(['put', 'patch'], '/lessons/{lesson}', [LessonController::class, 'update']);
    Route::delete('/lessons/{lesson}', [LessonController::class, 'destroy']);
    Route::patch('/lessons/{lesson}/restore', [LessonController::class, 'restore'])->withTrashed();

    // Materials (nested under lesson)
    Route::get('/lessons/{lesson}/materials', [MaterialController::class, 'index']);
    Route::post('/lessons/{lesson}/materials', [MaterialController::class, 'store']);
    Route::get('/materials/{material}', [MaterialController::class, 'show']);
    Route::match(['put', 'patch'], '/materials/{material}', [MaterialController::class, 'update']);
    Route::delete('/materials/{material}', [MaterialController::class, 'destroy']);
    Route::patch('/materials/{material}/restore', [MaterialController::class, 'restore'])->withTrashed();

    // Current user's applications / enrollments
    Route::get('/my/applications', [MyController::class, 'applications']);
    Route::get('/my/enrollments', [MyController::class, 'enrollments']);

    // Course applications (manage-users)
    Route::get('/course-applications', [CourseApplicationController::class, 'index']);
    Route::post('/course-applications/{courseApplication}/accept', [CourseApplicationController::class, 'accept']);
    Route::post('/course-applications/{courseApplication}/reject', [CourseApplicationController::class, 'reject']);

    // Enrollments (manage-users)
    Route::get('/enrollments', [EnrollmentController::class, 'index']);

    // Teacher applications (manage-users)
    Route::get('/teacher-applications', [TeacherApplicationController::class, 'index']);
    Route::post('/teacher-applications/{teacherApplication}/accept', [TeacherApplicationController::class, 'accept']);
    Route::post('/teacher-applications/{teacherApplication}/reject', [TeacherApplicationController::class, 'reject']);

    // Assignments (nested under lesson for listing/creation)
    Route::get('/lessons/{lesson}/assignments', [AssignmentController::class, 'index']);
    Route::post('/lessons/{lesson}/assignments', [AssignmentController::class, 'store']);
    Route::get('/assignments/{assignment}', [AssignmentController::class, 'show']);
    Route::match(['put', 'patch'], '/assignments/{assignment}', [AssignmentController::class, 'update']);
    Route::delete('/assignments/{assignment}', [AssignmentController::class, 'destroy']);
    Route::patch('/assignments/{assignment}/restore', [AssignmentController::class, 'restore'])->withTrashed();
    Route::post('/assignments/{assignment}/submit', [AssignmentController::class, 'submit']);
    Route::get('/assignments/{assignment}/submissions', [AssignmentController::class, 'submissions']);

    // Submissions
    Route::post('/submissions/{submission}/grade', [SubmissionController::class, 'grade']);

    // Quizzes (nested under lesson for listing/creation)
    Route::get('/lessons/{lesson}/quizzes', [QuizController::class, 'index']);
    Route::post('/lessons/{lesson}/quizzes', [QuizController::class, 'store']);
    Route::get('/quizzes/{quiz}', [QuizController::class, 'show']);
    Route::match(['put', 'patch'], '/quizzes/{quiz}', [QuizController::class, 'update']);
    Route::delete('/quizzes/{quiz}', [QuizController::class, 'destroy']);
    Route::patch('/quizzes/{quiz}/restore', [QuizController::class, 'restore'])->withTrashed();
    Route::post('/quizzes/{quiz}/attempt', [QuizController::class, 'attempt']);
    Route::get('/quizzes/{quiz}/attempts', [QuizController::class, 'attempts']);

    // Questions (nested under quiz for listing/creation)
    Route::get('/quizzes/{quiz}/questions', [QuestionController::class, 'index']);
    Route::post('/quizzes/{quiz}/questions', [QuestionController::class, 'store']);
    Route::get('/questions/{question}', [QuestionController::class, 'show']);
    Route::match(['put', 'patch'], '/questions/{question}', [QuestionController::class, 'update']);
    Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);
    Route::patch('/questions/{question}/restore', [QuestionController::class, 'restore'])->withTrashed();

    // Question options (nested under question for listing/creation)
    Route::get('/questions/{question}/options', [QuestionOptionController::class, 'index']);
    Route::post('/questions/{question}/options', [QuestionOptionController::class, 'store']);
    Route::match(['put', 'patch'], '/options/{option}', [QuestionOptionController::class, 'update']);
    Route::delete('/options/{option}', [QuestionOptionController::class, 'destroy']);
    Route::patch('/options/{option}/restore', [QuestionOptionController::class, 'restore'])->withTrashed();

    // Users (manage-users; admin-tier accounts are super-admin only — see UserPolicy)
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/access-options', [UserController::class, 'accessOptions']);
    Route::get('/users/{user}', [UserController::class, 'show'])->withTrashed();
    Route::post('/users', [UserController::class, 'store']);
    Route::match(['put', 'patch'], '/users/{user}', [UserController::class, 'update']);
    Route::patch('/users/{user}/status', [UserController::class, 'updateStatus']);
    Route::post('/users/{user}/reset-password', [UserController::class, 'resetPassword']);
    Route::delete('/users/{user}', [UserController::class, 'destroy']);
    Route::patch('/users/{user}/restore', [UserController::class, 'restore'])->withTrashed();

    // Admin-only notes on a user
    Route::post('/users/{user}/notes', [UserNoteController::class, 'store'])->withTrashed();
    Route::delete('/notes/{note}', [UserNoteController::class, 'destroy']);

    // Tags (for the user tag selector)
    Route::get('/tags', [TagController::class, 'index']);
    Route::post('/tags', [TagController::class, 'store']);

    // Roles & permissions (super-admin only)
    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/roles/{role}', [RoleController::class, 'show']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::match(['put', 'patch'], '/roles/{role}', [RoleController::class, 'update']);
    Route::delete('/roles/{role}', [RoleController::class, 'destroy']);
    // Read-only: permissions are defined in code, never created from the UI.
    Route::get('/permissions', [PermissionController::class, 'index']);
});

Route::get('/ping', function () {
    return response()->json([
        'message' => 'Bayan API is working',
        'status' => 'ok',
    ]);
});
