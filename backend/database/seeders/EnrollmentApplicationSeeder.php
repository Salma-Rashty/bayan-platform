<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseApplication;
use App\Models\Enrollment;
use App\Models\TeacherApplication;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

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

        // No catalog selections: the catalog isn't seeded. The CV is a placeholder file.
        Storage::disk('local')->put('teacher-applications/seed/cv.pdf', '%PDF-1.4 placeholder CV');
        TeacherApplication::firstOrCreate(
            ['email' => 'prospective.teacher@bayan.test'],
            [
                'first_name' => 'Omar',
                'last_name' => 'Siddiqui',
                'phone' => '+201001234567',
                'phone_country' => 'EG',
                'nationality' => 'EG',
                'birth_date' => '1990-04-12',
                'gender' => 'male',
                'about' => 'I hold an ijazah in Tajweed and have taught Quran recitation for five years, '
                    .'both in person at my local mosque and online. I teach children and adults, and I enjoy '
                    .'helping beginners build confidence in reading. My lessons combine clear explanation of the '
                    .'rules with plenty of guided practice, and I give each student regular feedback.',
                'cv_path' => 'teacher-applications/seed/cv.pdf',
                'status' => 'pending',
            ]
        );
    }
}
