<?php

namespace App\Services;

use App\Models\CourseApplication;
use App\Models\Enrollment;

class CourseApplicationService
{
    /**
     * Accept the application and activate (or reactivate) the student's enrollment.
     */
    public function accept(CourseApplication $application): CourseApplication
    {
        $application->update(['status' => 'accepted']);

        Enrollment::createOrReactivate(
            [
                'user_id' => $application->user_id,
                'course_id' => $application->course_id,
            ],
            [
                'status' => 'active',
                'enrolled_at' => now(),
            ]
        );

        return $application;
    }

    public function reject(CourseApplication $application): CourseApplication
    {
        $application->update(['status' => 'rejected']);

        return $application;
    }
}
