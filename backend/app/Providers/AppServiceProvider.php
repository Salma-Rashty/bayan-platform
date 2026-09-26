<?php

namespace App\Providers;

use App\Models\Assignment;
use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Material;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Submission;
use App\Models\TeacherApplication;
use App\Models\User;
use App\Policies\AssignmentPolicy;
use App\Policies\CourseApplicationPolicy;
use App\Policies\CoursePolicy;
use App\Policies\EnrollmentPolicy;
use App\Policies\LessonPolicy;
use App\Policies\MaterialPolicy;
use App\Policies\QuestionOptionPolicy;
use App\Policies\QuestionPolicy;
use App\Policies\QuizAttemptPolicy;
use App\Policies\QuizPolicy;
use App\Policies\SubmissionPolicy;
use App\Policies\TeacherApplicationPolicy;
use App\Policies\UserPolicy;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        JsonResource::withoutWrapping();

        Gate::before(function ($user, string $ability) {
            return $user->hasRole('super-admin') ? true : null;
        });

        Gate::policy(Course::class, CoursePolicy::class);
        Gate::policy(Lesson::class, LessonPolicy::class);
        Gate::policy(CourseApplication::class, CourseApplicationPolicy::class);
        Gate::policy(Enrollment::class, EnrollmentPolicy::class);
        Gate::policy(TeacherApplication::class, TeacherApplicationPolicy::class);
        Gate::policy(Assignment::class, AssignmentPolicy::class);
        Gate::policy(Quiz::class, QuizPolicy::class);
        Gate::policy(Question::class, QuestionPolicy::class);
        Gate::policy(Submission::class, SubmissionPolicy::class);
        Gate::policy(Material::class, MaterialPolicy::class);
        Gate::policy(QuestionOption::class, QuestionOptionPolicy::class);
        Gate::policy(QuizAttempt::class, QuizAttemptPolicy::class);
        Gate::policy(User::class, UserPolicy::class);
    }
}
