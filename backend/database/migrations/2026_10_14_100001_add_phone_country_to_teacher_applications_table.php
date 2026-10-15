<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Phone numbers are now validated per country and stored in E.164 (max 15 digits plus
     * "+"), alongside the ISO country they were validated against.
     */
    public function up(): void
    {
        Schema::table('teacher_applications', function (Blueprint $table) {
            $table->string('phone', 16)->nullable()->change();
            $table->char('phone_country', 2)->nullable()->after('phone');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teacher_applications', function (Blueprint $table) {
            $table->dropColumn('phone_country');
            $table->string('phone', 30)->nullable()->change();
        });
    }
};
