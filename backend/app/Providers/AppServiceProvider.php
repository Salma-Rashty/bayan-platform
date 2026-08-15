<?php

namespace App\Providers;

use App\Models\Course;
use App\Models\Lesson;
use App\Policies\CoursePolicy;
use App\Policies\LessonPolicy;
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
        Gate::before(function ($user, string $ability) {
            return $user->hasRole('super-admin') ? true : null;
        });

        Gate::policy(Course::class, CoursePolicy::class);
        Gate::policy(Lesson::class, LessonPolicy::class);
    }
}
