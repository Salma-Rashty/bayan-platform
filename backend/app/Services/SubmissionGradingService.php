<?php

namespace App\Services;

use App\Models\Submission;

class SubmissionGradingService
{
    public function grade(Submission $submission, float $grade, ?string $feedback): Submission
    {
        $submission->update([
            'grade' => $grade,
            'feedback' => $feedback,
            'graded_at' => now(),
        ]);

        return $submission;
    }
}
