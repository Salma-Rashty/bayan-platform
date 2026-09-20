<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\Enrollment;
use App\Models\TeacherApplication;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class EnrollmentApplicationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $courses = Course::all();

        $applicant = User::firstOrCreate(
            ['email' => 'applicant1@bayan.test'],
            ['name' => 'Fatima Ahmed', 'password' => Hash::make('password')]
        );
        $applicant->assignRole('student');

        $applicant2 = User::firstOrCreate(
            ['email' => 'applicant2@bayan.test'],
            ['name' => 'Yusuf Karim', 'password' => Hash::make('password')]
        );
        $applicant2->assignRole('student');

        $enrolledStudent = User::firstOrCreate(
            ['email' => 'student@bayan.test'],
            ['name' => 'Layla Hassan', 'password' => Hash::make('password')]
        );
        $enrolledStudent->assignRole('student');

        CourseApplication::createOrReactivate(
            ['user_id' => $applicant->id, 'course_id' => $courses[0]->id],
            ['status' => 'pending']
        );

        CourseApplication::createOrReactivate(
            ['user_id' => $applicant2->id, 'course_id' => $courses[1]->id],
            ['status' => 'pending']
        );

        Enrollment::createOrReactivate(
            ['user_id' => $enrolledStudent->id, 'course_id' => $courses[0]->id],
            ['status' => 'active', 'enrolled_at' => now()]
        );

        TeacherApplication::firstOrCreate(
            ['email' => 'prospective.teacher@bayan.test'],
            [
                'name' => 'Omar Siddiqui',
                'phone' => '+1-555-0100',
                'qualifications' => 'Ijazah in Tajweed, 5 years teaching experience.',
                'status' => 'pending',
            ]
        );
    }
}
