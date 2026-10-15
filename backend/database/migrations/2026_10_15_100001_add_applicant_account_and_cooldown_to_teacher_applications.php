<?php

use App\Support\ApplicantHistory;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Applying now needs an account, and an applicant may apply once every 3 months:
 *   user_id               the applicant's account (null for older anonymous applications, or one an
 *                         admin submitted for someone without an account)
 *   submitted_by_id       who submitted it (the applicant, or an admin on their behalf)
 *   identity_key          normalised first name + last name + birth date, to recognise the same
 *                         person across accounts (see ApplicantHistory::identityKey())
 *   cooldown_lifted_*     an admin let this applicant reapply before the 3 months were up
 */
return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('teacher_applications', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->restrictOnDelete();
            $table->foreignId('submitted_by_id')->nullable()->after('user_id')->constrained('users')->restrictOnDelete();
            $table->string('identity_key')->nullable()->after('birth_date')->index();
            $table->timestamp('cooldown_lifted_at')->nullable()->after('notes');
            $table->foreignId('cooldown_lifted_by_id')->nullable()->after('cooldown_lifted_at')->constrained('users')->restrictOnDelete();
        });

        DB::table('teacher_applications')->orderBy('id')->each(function (object $row) {
            DB::table('teacher_applications')->where('id', $row->id)->update([
                'identity_key' => ApplicantHistory::identityKey($row->first_name, $row->last_name, $row->birth_date),
            ]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('teacher_applications', function (Blueprint $table) {
            $table->dropConstrainedForeignId('cooldown_lifted_by_id');
            $table->dropColumn('cooldown_lifted_at');
            $table->dropIndex(['identity_key']);
            $table->dropColumn('identity_key');
            $table->dropConstrainedForeignId('submitted_by_id');
            $table->dropConstrainedForeignId('user_id');
        });
    }
};
