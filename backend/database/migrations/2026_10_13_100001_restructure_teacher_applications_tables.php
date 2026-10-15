<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Replaces the simple teacher_applications table with the rich public application form:
 * applicant fields plus three child tables for the branching selections
 *   category -> (levels -> age groups) | (age groups, when the category has no levels).
 * The old table only held test data, so it is dropped and recreated rather than altered.
 */
return new class extends Migration
{
    private const AGE_GROUPS = ['children', 'teenagers', 'adults', 'elderly'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::dropIfExists('teacher_applications');

        Schema::create('teacher_applications', function (Blueprint $table) {
            $table->id();
            $table->string('first_name');
            $table->string('last_name');
            // Contact details: needed to reach the applicant and to create their account on accept.
            $table->string('email')->index();
            $table->string('phone', 30)->nullable();
            $table->char('nationality', 2);
            $table->date('birth_date');
            $table->enum('gender', ['male', 'female']);
            $table->text('about');
            $table->string('cv_path');
            $table->string('video_path')->nullable();
            $table->enum('status', ['pending', 'reviewing', 'interview', 'accepted', 'rejected'])->default('pending')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('teacher_application_categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_application_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('teacher_application_levels', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_application_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('level_id')->constrained()->restrictOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('teacher_application_age_groups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('teacher_application_id')->constrained()->restrictOnDelete();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            // Set when the category has levels; null when the age group applies to a level-less category.
            $table->foreignId('level_id')->nullable()->constrained()->restrictOnDelete();
            $table->enum('age_group', self::AGE_GROUPS);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations: back to the original simple table (data is not carried over).
     */
    public function down(): void
    {
        Schema::dropIfExists('teacher_application_age_groups');
        Schema::dropIfExists('teacher_application_levels');
        Schema::dropIfExists('teacher_application_categories');
        Schema::dropIfExists('teacher_applications');

        Schema::create('teacher_applications', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('email');
            $table->string('phone')->nullable();
            $table->text('qualifications')->nullable();
            $table->string('cv_path')->nullable();
            $table->enum('status', ['pending', 'reviewing', 'accepted', 'rejected'])->default('pending');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }
};
