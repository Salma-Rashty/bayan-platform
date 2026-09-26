<?php

namespace App\Services;

use App\Models\TeacherApplication;
use App\Models\User;
use Illuminate\Support\Str;

class TeacherApplicationService
{
    /**
     * Accept the application: create-or-restore the matching User (by email)
     * and assign the teacher role.
     */
    public function accept(TeacherApplication $application): TeacherApplication
    {
        $user = User::withTrashed()->firstWhere('email', $application->email);

        if ($user) {
            if ($user->trashed()) {
                $user->restore();
            }
        } else {
            $user = User::create([
                'name' => $application->name,
                'email' => $application->email,
                'password' => Str::password(),
            ]);
        }

        if (! $user->hasRole('teacher')) {
            $user->assignRole('teacher');
        }

        $application->update(['status' => 'accepted']);

        return $application;
    }

    public function reject(TeacherApplication $application): TeacherApplication
    {
        $application->update(['status' => 'rejected']);

        return $application;
    }
}
