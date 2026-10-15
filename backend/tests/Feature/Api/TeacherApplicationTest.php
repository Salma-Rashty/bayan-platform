<?php

namespace Tests\Feature\Api;

use App\Models\Category;
use App\Models\Course;
use App\Models\Level;
use App\Models\TeacherApplication;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class TeacherApplicationTest extends TestCase
{
    use RefreshDatabase;

    private Category $quran;

    private Level $beginner;

    private Level $advanced;

    private Category $arabic;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RolesAndPermissionsSeeder::class);
        // These tests submit many times in a row; the route's throttle isn't what's under test.
        $this->withoutMiddleware(ThrottleRequests::class);
        Storage::fake('local');

        // Quran has levels; Arabic has none.
        $this->quran = Category::create(['name' => 'Quran']);
        $this->beginner = $this->quran->levels()->create(['name' => 'Beginner']);
        $this->advanced = $this->quran->levels()->create(['name' => 'Advanced']);
        $this->arabic = Category::create(['name' => 'Arabic']);

        // Applying needs an account. By default an admin submits (no cooldown), so tests that
        // submit repeatedly aren't blocked; the cooldown tests below use real applicants.
        $this->actingAsRole('admin');
    }

    private function signOut(): void
    {
        $this->app['auth']->forgetGuards();
    }

    private function actingAsRole(string $role): User
    {
        $user = User::factory()->create();
        $user->assignRole($role);
        Sanctum::actingAs($user, ['*']);

        return $user;
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(array $overrides = []): array
    {
        return [
            'first_name' => 'Amina',
            'last_name' => 'Hassan',
            'email' => 'amina@example.test',
            'phone' => '0100 123 4567',
            'phone_country' => 'EG',
            'nationality' => 'EG',
            'birth_date' => '1992-05-17',
            'gender' => 'female',
            'about' => $this->words(80),
            'cv' => UploadedFile::fake()->create('cv.pdf', 200, 'application/pdf'),
            'categories' => [
                ['id' => $this->quran->id, 'levels' => [
                    ['id' => $this->beginner->id, 'age_groups' => ['children', 'teenagers']],
                    ['id' => $this->advanced->id, 'age_groups' => ['adults']],
                ]],
                ['id' => $this->arabic->id, 'age_groups' => ['adults', 'elderly']],
            ],
            ...$overrides,
        ];
    }

    private function words(int $count): string
    {
        return implode(' ', array_fill(0, $count, 'word'));
    }

    private function submit(array $overrides = [])
    {
        return $this->post('/api/teacher-applications', $this->payload($overrides), ['Accept' => 'application/json']);
    }

    public function test_public_catalog_lists_only_effectively_active_categories_and_levels(): void
    {
        $this->quran->levels()->create(['name' => 'Hidden', 'is_active' => false]);
        $this->quran->levels()->create(['name' => 'Deleted'])->delete();
        Category::create(['name' => 'Off', 'is_active' => false])->levels()->create(['name' => 'Orphaned']);
        Category::create(['name' => 'Gone'])->delete();
        // All its levels are off, so it's offered as a category without levels.
        Category::create(['name' => 'Tajweed'])->levels()->create(['name' => 'Off level', 'is_active' => false]);

        $response = $this->getJson('/api/public/catalog')->assertOk();

        $this->assertSame(['Quran', 'Arabic', 'Tajweed'], array_column($response->json('data'), 'name'));
        $response
            ->assertJsonPath('data.0.has_levels', true)
            ->assertJsonPath('data.0.levels.*.name', ['Beginner', 'Advanced'])
            ->assertJsonPath('data.1.has_levels', false)
            ->assertJsonPath('data.1.levels', [])
            ->assertJsonPath('data.2.has_levels', false)
            ->assertJsonMissingPath('data.0.is_active');
    }

    public function test_public_catalog_reflects_catalog_changes_immediately(): void
    {
        $this->quran->update(['is_active' => false]);
        $this->assertSame(['Arabic'], array_column($this->getJson('/api/public/catalog')->json('data'), 'name'));

        $this->quran->update(['is_active' => true]);
        $this->arabic->levels()->create(['name' => 'Intermediate']);

        $this->getJson('/api/public/catalog')
            ->assertJsonPath('data.0.name', 'Quran')
            ->assertJsonPath('data.1.has_levels', true)
            ->assertJsonPath('data.1.levels.0.name', 'Intermediate');
    }

    public function test_guests_cannot_apply(): void
    {
        $this->signOut();

        $this->submit()->assertUnauthorized();
        $this->assertDatabaseCount('teacher_applications', 0);
    }

    public function test_a_signed_in_user_can_submit_a_full_application(): void
    {
        $student = $this->actingAsRole('student');

        $response = $this->submit([
            'video' => UploadedFile::fake()->create('intro.mp4', 10_000, 'video/mp4'),
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.status', 'pending')
            ->assertJsonStructure(['message', 'data' => ['reference', 'status', 'submitted_at']]);

        $application = TeacherApplication::sole();
        $this->assertSame($student->id, $application->user_id);
        $this->assertSame($student->id, $application->submitted_by_id);
        $this->assertSame('amina|hassan|1992-05-17', $application->identity_key);
        $this->assertSame('Amina', $application->first_name);
        $this->assertSame('1992-05-17', $application->birth_date->toDateString());
        $this->assertSame('+201001234567', $application->phone);
        $this->assertSame('EG', $application->phone_country);
        Storage::disk('local')->assertExists($application->cv_path);
        Storage::disk('local')->assertExists($application->video_path);

        $this->assertDatabaseCount('teacher_application_categories', 2);
        $this->assertDatabaseCount('teacher_application_levels', 2);
        $this->assertDatabaseHas('teacher_application_levels', ['category_id' => $this->quran->id, 'level_id' => $this->advanced->id]);
        $this->assertDatabaseCount('teacher_application_age_groups', 5);
        $this->assertDatabaseHas('teacher_application_age_groups', [
            'category_id' => $this->quran->id, 'level_id' => $this->beginner->id, 'age_group' => 'teenagers',
        ]);
        $this->assertDatabaseHas('teacher_application_age_groups', [
            'category_id' => $this->arabic->id, 'level_id' => null, 'age_group' => 'elderly',
        ]);
    }

    public function test_the_video_is_optional(): void
    {
        $this->submit()->assertCreated();

        $this->assertNull(TeacherApplication::sole()->video_path);
    }

    public function test_applicant_fields_are_validated(): void
    {
        $this->post('/api/teacher-applications', [], ['Accept' => 'application/json'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['first_name', 'last_name', 'email', 'phone', 'phone_country', 'nationality', 'birth_date', 'gender', 'about', 'cv', 'categories']);

        $this->submit([
            'nationality' => 'XX',
            'birth_date' => now()->addDay()->toDateString(),
            'gender' => 'other',
            'email' => 'not-an-email',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['nationality', 'birth_date', 'gender', 'email']);

        $this->assertDatabaseCount('teacher_applications', 0);
    }

    public function test_cv_and_video_files_are_validated(): void
    {
        $this->submit(['cv' => UploadedFile::fake()->create('cv.png', 100, 'image/png')])
            ->assertUnprocessable()->assertJsonValidationErrors(['cv' => 'PDF or Word']);

        $this->submit(['cv' => UploadedFile::fake()->create('cv.pdf', 5 * 1024 + 1, 'application/pdf')])
            ->assertUnprocessable()->assertJsonValidationErrors(['cv' => '5 MB']);

        $this->submit(['video' => UploadedFile::fake()->create('intro.pdf', 100, 'application/pdf')])
            ->assertUnprocessable()->assertJsonValidationErrors(['video' => 'video file']);

        $this->submit(['video' => UploadedFile::fake()->create('intro.mp4', 500 * 1024 + 1, 'video/mp4')])
            ->assertUnprocessable()->assertJsonValidationErrors(['video' => '500 MB']);

        $this->submit(['video' => UploadedFile::fake()->create('intro.mov', 500 * 1024, 'video/quicktime')])
            ->assertCreated();
    }

    public function test_teacher_application_catalog_includes_inactive_categories_and_levels(): void
    {
        $this->quran->levels()->create(['name' => 'Hidden', 'is_active' => false]);
        $this->quran->levels()->create(['name' => 'Deleted'])->delete();
        Category::create(['name' => 'Off', 'is_active' => false])->levels()->create(['name' => 'Orphaned']);
        Category::create(['name' => 'Gone'])->delete();

        $response = $this->getJson('/api/public/catalog/teacher-application')->assertOk();

        $this->assertSame(['Quran', 'Arabic', 'Off'], array_column($response->json('data'), 'name'));
        $response
            ->assertJsonPath('data.0.is_active', true)
            ->assertJsonPath('data.0.levels.*.name', ['Beginner', 'Advanced', 'Hidden'])
            ->assertJsonPath('data.0.levels.*.is_active', [true, true, false])
            ->assertJsonPath('data.2.is_active', false)
            ->assertJsonPath('data.2.has_levels', true)
            ->assertJsonPath('data.2.levels.0.name', 'Orphaned');

        // The student-facing catalog is unaffected: still active-only, without status fields.
        $student = $this->getJson('/api/public/catalog')->assertOk();
        $this->assertSame(['Quran', 'Arabic'], array_column($student->json('data'), 'name'));
        $student->assertJsonPath('data.0.levels.*.name', ['Beginner', 'Advanced'])
            ->assertJsonMissingPath('data.0.is_active')
            ->assertJsonMissingPath('data.0.levels.0.is_active');
    }

    public function test_applicants_can_choose_inactive_categories_and_levels(): void
    {
        $offCategory = Category::create(['name' => 'Off', 'is_active' => false]);
        $offLevel = $this->quran->levels()->create(['name' => 'Off level', 'is_active' => false]);

        $this->submit(['categories' => [
            ['id' => $offCategory->id, 'age_groups' => ['adults']],
            ['id' => $this->quran->id, 'levels' => [['id' => $offLevel->id, 'age_groups' => ['children']]]],
        ]])->assertCreated();

        $this->assertDatabaseHas('teacher_application_categories', ['category_id' => $offCategory->id]);
        $this->assertDatabaseHas('teacher_application_levels', ['level_id' => $offLevel->id]);
    }

    public function test_deleted_or_unknown_categories_and_levels_are_rejected(): void
    {
        $deletedCategory = Category::create(['name' => 'Gone']);
        $deletedCategory->delete();
        $deletedLevel = $this->quran->levels()->create(['name' => 'Deleted level']);
        $deletedLevel->delete();
        $otherLevel = $this->arabic->levels()->create(['name' => 'Arabic level']);

        $this->submit(['categories' => [['id' => $deletedCategory->id, 'age_groups' => ['adults']]]])
            ->assertUnprocessable()->assertJsonValidationErrors(['categories.0.id' => 'not available']);

        $this->submit(['categories' => [['id' => 99999, 'age_groups' => ['adults']]]])
            ->assertUnprocessable()->assertJsonValidationErrors(['categories.0.id']);

        $this->submit(['categories' => [['id' => $this->quran->id, 'levels' => [
            ['id' => $deletedLevel->id, 'age_groups' => ['adults']],
            ['id' => $otherLevel->id, 'age_groups' => ['adults']],
        ]]]])->assertUnprocessable()->assertJsonValidationErrors([
            'categories.0.levels.0.id' => 'not available',
            'categories.0.levels.1.id' => 'not available',
        ]);

        $this->assertDatabaseCount('teacher_applications', 0);
    }

    public function test_phone_numbers_are_validated_for_the_chosen_country_and_stored_as_e164(): void
    {
        $valid = [
            ['0555 123 45 67', 'TR', '+905551234567'],
            ['+90 555 123 45 67', 'TR', '+905551234567'],
            ['07400 123456', 'GB', '+447400123456'],
            ['(202) 555-0123', 'US', '+12025550123'],
            ['+1 613 555 0123', 'CA', '+16135550123'],
        ];

        foreach ($valid as $i => [$phone, $country, $e164]) {
            $this->submit(['email' => "valid$i@example.test", 'phone' => $phone, 'phone_country' => $country])->assertCreated();
            $this->assertDatabaseHas('teacher_applications', [
                'email' => "valid$i@example.test", 'phone' => $e164, 'phone_country' => $country,
            ]);
        }

        $invalid = [
            ['12345', 'TR'],                // too short
            ['+447400123456', 'TR'],        // a valid UK number, but not Turkish
            ['+1 613 555 0123', 'US'],      // Canadian (613), not US
            ['0532 123 45 67', 'GB'],       // a Turkish mobile, not valid in the UK
            ['not a number', 'EG'],
        ];

        foreach ($invalid as [$phone, $country]) {
            $this->submit(['phone' => $phone, 'phone_country' => $country])
                ->assertUnprocessable()
                ->assertJsonValidationErrors(['phone' => 'Enter a valid phone number for']);
        }

        $this->submit(['phone' => '0555 123 45 67', 'phone_country' => 'TR'])->assertCreated();
        $this->submit(['phone' => '0555 123 45 67', 'phone_country' => null])
            ->assertUnprocessable()->assertJsonValidationErrors(['phone_country' => 'country for your phone']);
        $this->submit(['phone' => '0555 123 45 67', 'phone_country' => 'XX'])
            ->assertUnprocessable()->assertJsonValidationErrors(['phone_country'])->assertJsonMissingValidationErrors(['phone']);

        // The phone is required.
        $this->submit(['email' => 'nophone@example.test', 'phone' => null, 'phone_country' => null])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['phone' => 'Enter your phone number.', 'phone_country']);
        $this->submit(['email' => 'nophone@example.test', 'phone' => '', 'phone_country' => 'TR'])
            ->assertUnprocessable()->assertJsonValidationErrors(['phone' => 'Enter your phone number.']);
        $this->assertDatabaseMissing('teacher_applications', ['email' => 'nophone@example.test']);
    }

    public function test_about_must_be_between_50_and_300_words(): void
    {
        $this->submit(['about' => $this->words(49)])
            ->assertUnprocessable()->assertJsonValidationErrors(['about' => 'at least 50 words (you have 49)']);
        $this->submit(['about' => $this->words(301)])
            ->assertUnprocessable()->assertJsonValidationErrors(['about' => '300 words or fewer (you have 301)']);

        // Padding and repeated or unusual whitespace don't count as words.
        $padded = "  \n\t".str_replace(' ', " \u{00A0}\n\n  ", $this->words(49))."   \n";
        $this->submit(['about' => $padded])
            ->assertUnprocessable()->assertJsonValidationErrors(['about' => 'you have 49']);

        $this->submit(['email' => 'min@example.test', 'about' => $this->words(50)])->assertCreated();
        $this->submit(['email' => 'max@example.test', 'about' => $this->words(300)])->assertCreated();
    }

    public function test_age_groups_attach_to_levels_when_the_category_has_levels(): void
    {
        // Age groups on the category itself are not allowed when it has levels.
        $this->submit(['categories' => [['id' => $this->quran->id, 'age_groups' => ['adults'], 'levels' => [
            ['id' => $this->beginner->id, 'age_groups' => ['adults']],
        ]]]])->assertUnprocessable()->assertJsonValidationErrors(['categories.0.age_groups' => 'each level']);

        // At least one level must be chosen.
        $this->submit(['categories' => [['id' => $this->quran->id]]])
            ->assertUnprocessable()->assertJsonValidationErrors(['categories.0.levels' => 'at least one level']);

        // Each chosen level needs at least one valid age group.
        $this->submit(['categories' => [['id' => $this->quran->id, 'levels' => [
            ['id' => $this->beginner->id],
            ['id' => $this->advanced->id, 'age_groups' => ['toddlers']],
        ]]]])->assertUnprocessable()->assertJsonValidationErrors([
            'categories.0.levels.0.age_groups',
            'categories.0.levels.1.age_groups.0',
        ]);

        $this->assertDatabaseCount('teacher_applications', 0);
    }

    public function test_age_groups_attach_to_the_category_when_it_has_no_levels(): void
    {
        $this->submit(['categories' => [['id' => $this->arabic->id]]])
            ->assertUnprocessable()->assertJsonValidationErrors(['categories.0.age_groups' => 'at least one age group']);

        $this->submit(['categories' => [['id' => $this->arabic->id, 'age_groups' => ['adults'], 'levels' => [
            ['id' => $this->beginner->id, 'age_groups' => ['adults']],
        ]]]])->assertUnprocessable()->assertJsonValidationErrors(['categories.0.levels' => 'no levels']);

        $this->submit(['categories' => [
            ['id' => $this->arabic->id, 'age_groups' => ['adults']],
            ['id' => $this->arabic->id, 'age_groups' => ['children']],
        ]])->assertUnprocessable()->assertJsonValidationErrors(['categories.0.id', 'categories.1.id']);

        $this->assertDatabaseCount('teacher_applications', 0);
    }

    public function test_admin_endpoints_require_manage_users(): void
    {
        $this->submit()->assertCreated();
        $application = TeacherApplication::sole();
        $this->signOut();

        $this->getJson('/api/teacher-applications')->assertUnauthorized();
        $this->getJson("/api/teacher-applications/{$application->id}")->assertUnauthorized();

        $this->actingAsRole('teacher');
        $this->getJson('/api/teacher-applications')->assertForbidden();
        $this->getJson("/api/teacher-applications/{$application->id}")->assertForbidden();
        $this->patchJson("/api/teacher-applications/{$application->id}/status", ['status' => 'reviewing'])->assertForbidden();
    }

    public function test_admin_can_list_filter_and_view_the_full_application(): void
    {
        $this->submit(['video' => UploadedFile::fake()->create('intro.mp4', 100, 'video/mp4')])->assertCreated();
        $this->submit(['email' => 'second@example.test'])->assertCreated();
        TeacherApplication::where('email', 'second@example.test')->update(['status' => 'reviewing']);
        $application = TeacherApplication::firstWhere('email', 'amina@example.test');

        $this->actingAsRole('admin');

        $this->getJson('/api/teacher-applications')->assertOk()->assertJsonCount(2, 'data');
        $this->getJson('/api/teacher-applications?status=reviewing')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.email', 'second@example.test')
            ->assertJsonPath('data.0.category_names', ['Quran', 'Arabic']);
        $this->getJson('/api/teacher-applications?status=bogus')->assertUnprocessable();

        // A category deleted after applying still shows in the application.
        $this->arabic->delete();

        $response = $this->getJson("/api/teacher-applications/{$application->id}")
            ->assertOk()
            ->assertJsonPath('name', 'Amina Hassan')
            ->assertJsonPath('nationality_name', 'Egypt')
            ->assertJsonPath('allowed_transitions', ['reviewing', 'rejected'])
            ->assertJsonPath('selections.0.category.name', 'Quran')
            ->assertJsonPath('selections.0.levels.0.level.name', 'Beginner')
            ->assertJsonPath('selections.0.levels.0.age_groups', ['children', 'teenagers'])
            ->assertJsonPath('selections.0.levels.1.age_groups', ['adults'])
            ->assertJsonPath('selections.0.age_groups', [])
            ->assertJsonPath('selections.1.category.name', 'Arabic')
            ->assertJsonPath('selections.1.levels', [])
            ->assertJsonPath('selections.1.age_groups', ['adults', 'elderly'])
            ->assertJsonPath('files.cv.name', 'amina-hassan-cv.pdf')
            ->assertJsonPath('files.cv.mime_type', 'application/pdf')
            ->assertJsonPath('files.cv.previewable', true)
            ->assertJsonPath('files.video.name', 'amina-hassan-video.mp4')
            ->assertJsonPath('files.video.mime_type', 'video/mp4')
            ->assertJsonPath('files.video.previewable', true);

        $this->assertNotNull($response->json('selections.1.category.deleted_at'));
        $this->assertIsInt($response->json('files.cv.size'));
        // No file URLs in the payload: they're minted on demand.
        $this->assertStringNotContainsString('http', json_encode($response->json('files')));
        $this->getJson('/api/teacher-applications')->assertJsonMissingPath('data.0.files');
    }

    public function test_status_follows_the_review_pipeline_and_accepting_grants_the_teacher_role(): void
    {
        $this->submit()->assertCreated();
        $application = TeacherApplication::sole();
        $this->actingAsRole('admin');
        $url = "/api/teacher-applications/{$application->id}";

        // Can't skip stages.
        $this->postJson("$url/accept")->assertUnprocessable()->assertJsonValidationErrors(['status' => 'reviewing, rejected']);
        $this->patchJson("$url/status", ['status' => 'interview'])->assertUnprocessable();

        $this->patchJson("$url/status", ['status' => 'reviewing'])->assertOk()->assertJsonPath('status', 'reviewing');
        $this->patchJson("$url/status", ['status' => 'interview'])->assertOk()->assertJsonPath('allowed_transitions', ['accepted', 'rejected']);
        $this->assertNull(User::firstWhere('email', 'amina@example.test'));

        $this->patchJson("$url/status", ['status' => 'accepted'])->assertOk()->assertJsonPath('status', 'accepted');

        $teacher = User::firstWhere('email', 'amina@example.test');
        $this->assertSame('Amina Hassan', $teacher->name);
        $this->assertTrue($teacher->hasRole('teacher'));

        // Accepted is final.
        $this->postJson("$url/reject")->assertUnprocessable()->assertJsonValidationErrors(['status' => 'already accepted']);
    }

    public function test_reject_is_possible_from_any_open_stage(): void
    {
        $this->submit()->assertCreated();
        $application = TeacherApplication::sole();
        $this->actingAsRole('admin');

        $this->postJson("/api/teacher-applications/{$application->id}/reject")
            ->assertOk()
            ->assertJsonPath('status', 'rejected')
            ->assertJsonPath('allowed_transitions', []);
    }

    private function linksFor(TeacherApplication $application, string $file)
    {
        return $this->postJson("/api/teacher-applications/{$application->id}/files/{$file}/links");
    }

    public function test_file_links_require_manage_users(): void
    {
        $this->submit()->assertCreated();
        $application = TeacherApplication::sole();
        $this->signOut();

        $this->linksFor($application, 'cv')->assertUnauthorized();

        $this->actingAsRole('teacher');
        $this->linksFor($application, 'cv')->assertForbidden();

        $this->actingAsRole('admin');
        $this->linksFor($application, 'cv')->assertOk()->assertJsonStructure(['view_url', 'download_url', 'expires_at']);
        $this->postJson("/api/teacher-applications/{$application->id}/files/notes/links")->assertNotFound();
    }

    public function test_signed_links_serve_the_cv_inline_or_as_a_download(): void
    {
        $this->submit()->assertCreated();
        $application = TeacherApplication::sole();
        $this->actingAsRole('admin');
        $links = $this->linksFor($application, 'cv')->json();

        // The links themselves need no auth header, just a valid signature.
        $this->app['auth']->forgetGuards();

        $view = $this->get($links['view_url'])->assertOk();
        $this->assertSame('application/pdf', $view->headers->get('Content-Type'));
        $this->assertSame('inline; filename=amina-hassan-cv.pdf', $view->headers->get('Content-Disposition'));
        $this->assertSame('nosniff', $view->headers->get('X-Content-Type-Options'));
        $this->assertSame('no-store, private', $view->headers->get('Cache-Control'));

        $download = $this->get($links['download_url'])->assertOk();
        $this->assertSame('attachment; filename=amina-hassan-cv.pdf', $download->headers->get('Content-Disposition'));

        // Unsigned, tampered (view -> download) and expired links are refused.
        $this->get(strtok($links['view_url'], '?'))->assertForbidden();
        $this->get(str_replace('/inline?', '/attachment?', $links['view_url']))->assertForbidden();
        $this->travel(31)->minutes();
        $this->get($links['view_url'])->assertForbidden();
    }

    public function test_the_video_streams_with_range_requests_and_is_absent_when_not_uploaded(): void
    {
        // Real bytes: fake()->create() only reports a size, and a range needs content.
        $video = UploadedFile::fake()->create('intro.mp4', 100, 'video/mp4');
        file_put_contents($video->getPathname(), str_repeat('0', 102400));
        $this->submit(['video' => $video])->assertCreated();
        $this->submit(['email' => 'novideo@example.test'])->assertCreated();
        $this->actingAsRole('admin');

        $withVideo = TeacherApplication::firstWhere('email', 'amina@example.test');
        $url = $this->linksFor($withVideo, 'video')->assertOk()->json('view_url');

        $partial = $this->get($url, ['Range' => 'bytes=0-1023']);
        $partial->assertStatus(206);
        $this->assertSame('video/mp4', $partial->headers->get('Content-Type'));
        $this->assertSame('bytes 0-1023/102400', $partial->headers->get('Content-Range'));

        $withoutVideo = TeacherApplication::firstWhere('email', 'novideo@example.test');
        $this->linksFor($withoutVideo, 'video')->assertNotFound();
        $this->getJson("/api/teacher-applications/{$withoutVideo->id}")->assertJsonPath('files.video', null);
    }

    public function test_a_non_pdf_cv_is_not_previewable(): void
    {
        $this->submit(['cv' => UploadedFile::fake()->create('cv.docx', 100, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')])
            ->assertCreated();
        $application = TeacherApplication::sole();
        $this->actingAsRole('admin');

        $this->getJson("/api/teacher-applications/{$application->id}")
            ->assertJsonPath('files.cv.previewable', false)
            ->assertJsonPath('files.cv.name', 'amina-hassan-cv.docx');
        $this->linksFor($application, 'cv')->assertOk();
    }

    public function test_an_applicant_can_apply_only_once_every_three_months(): void
    {
        $this->travelTo('2026-10-15 10:00:00');
        $this->actingAsRole('student');

        $this->submit()->assertCreated()->assertJsonPath('data.next_allowed_at', '2027-01-15T10:00:00.000000Z');

        $this->getJson('/api/my/teacher-applications')
            ->assertJsonPath('can_apply', false)
            ->assertJsonPath('next_allowed_at', '2027-01-15T10:00:00.000000Z');

        $this->travelTo('2027-01-15 09:59:00');
        $this->submit()->assertUnprocessable()
            ->assertJsonValidationErrors(['application' => 'You cannot apply again until 15 January 2027.']);

        $this->travelTo('2027-01-15 10:00:00');
        $this->getJson('/api/my/teacher-applications')->assertJsonPath('can_apply', true)->assertJsonPath('next_allowed_at', null);
        $this->submit()->assertCreated();

        // The new application restarts the clock.
        $this->submit()->assertUnprocessable()
            ->assertJsonValidationErrors(['application' => 'until 15 April 2027']);
        $this->assertDatabaseCount('teacher_applications', 2);
    }

    public function test_the_same_name_and_birth_date_is_the_same_applicant_across_accounts(): void
    {
        $this->travelTo('2026-10-15 10:00:00');
        $first = $this->actingAsRole('student');
        $this->submit()->assertCreated();

        // A second account, same person: names match case-insensitively and trimmed.
        $this->actingAsRole('student');
        $this->submit(['email' => 'other@example.test', 'first_name' => '  AMINA ', 'last_name' => 'hassan'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['application' => 'until 15 January 2027']);

        // A different birth date is a different person.
        $this->submit(['email' => 'other@example.test', 'birth_date' => '1993-05-17'])->assertCreated();

        // Later the same person applies again from the second account: the admin sees the match.
        $this->travel(4)->months();
        $this->submit(['email' => 'other@example.test', 'first_name' => 'amina'])->assertCreated();
        $repeat = TeacherApplication::latest('id')->first();

        $this->actingAsRole('admin');
        $history = $this->getJson("/api/teacher-applications/{$repeat->id}")->assertOk()->json('history');

        // The first account's application (same person) and this account's other one (same account).
        $matches = collect($history['matches'])->keyBy('id');
        $original = TeacherApplication::where('user_id', $first->id)->sole();
        $sibling = TeacherApplication::whereDate('birth_date', '1993-05-17')->sole();
        $this->assertEqualsCanonicalizing([$original->id, $sibling->id], $matches->keys()->all());
        $this->assertTrue($matches[$original->id]['same_identity']);
        $this->assertFalse($matches[$original->id]['same_account']);
        $this->assertTrue($matches[$sibling->id]['same_account']);
        $this->assertFalse($matches[$sibling->id]['same_identity']);
        $this->assertSame($repeat->id, $history['latest_application_id']);
        $this->assertNotNull($history['next_allowed_at']);
    }

    public function test_admins_apply_without_a_cooldown_and_can_submit_on_behalf_of_anyone(): void
    {
        $student = User::factory()->create(['email' => 'amina@example.test']);
        $student->assignRole('student');
        $admin = $this->actingAsRole('admin');

        foreach (range(1, 3) as $i) {
            $this->submit()->assertCreated()->assertJsonPath('data.next_allowed_at', fn ($value) => $value !== null);
        }

        // On someone's behalf: linked to the account with the applicant's email, if any.
        $this->assertSame([$student->id], TeacherApplication::pluck('user_id')->unique()->values()->all());
        $this->assertSame([$admin->id], TeacherApplication::pluck('submitted_by_id')->unique()->values()->all());
        $this->submit(['email' => 'walk-in@example.test', 'first_name' => 'Walk', 'last_name' => 'In'])->assertCreated();
        $this->assertNull(TeacherApplication::firstWhere('email', 'walk-in@example.test')->user_id);

        $this->getJson('/api/my/teacher-applications')->assertJsonPath('cooldown_exempt', true)->assertJsonPath('can_apply', true);

        // What an admin submits for someone counts as that applicant's latest application.
        Sanctum::actingAs($student, ['*']);
        $this->submit()->assertUnprocessable()->assertJsonValidationErrors(['application']);
    }

    public function test_an_admin_can_lift_the_cooldown_once(): void
    {
        $this->travelTo('2026-10-15 10:00:00');
        $student = $this->actingAsRole('student');
        $this->submit()->assertCreated();
        $application = TeacherApplication::sole();
        $this->submit()->assertUnprocessable();

        $this->postJson("/api/teacher-applications/{$application->id}/lift-cooldown")->assertForbidden();

        $admin = $this->actingAsRole('admin');
        $this->postJson("/api/teacher-applications/{$application->id}/lift-cooldown")
            ->assertOk()
            ->assertJsonPath('history.next_allowed_at', null)
            ->assertJsonPath('history.cooldown_lifted_by', $admin->name);
        $this->postJson("/api/teacher-applications/{$application->id}/lift-cooldown")
            ->assertUnprocessable()->assertJsonValidationErrors(['cooldown' => 'can already apply again']);

        Sanctum::actingAs($student, ['*']);
        $this->getJson('/api/my/teacher-applications')->assertJsonPath('can_apply', true);
        $this->submit()->assertCreated();

        // The lift was for one reapplication: the new application starts a fresh cooldown.
        $this->submit()->assertUnprocessable()->assertJsonValidationErrors(['application' => 'until 15 January 2027']);
    }

    public function test_accepting_adds_the_teacher_role_to_the_applicants_account_and_keeps_their_roles(): void
    {
        $student = $this->actingAsRole('student');
        // The contact email on the form may differ from the account's: the account still gets the role.
        $this->submit(['email' => 'contact@example.test'])->assertCreated();
        $application = TeacherApplication::sole();

        $this->actingAsRole('admin');
        foreach (['reviewing', 'interview', 'accepted'] as $status) {
            $this->patchJson("/api/teacher-applications/{$application->id}/status", ['status' => $status])->assertOk();
        }

        $this->assertEqualsCanonicalizing(['student', 'teacher'], $student->fresh()->getRoleNames()->all());
        $this->assertDatabaseMissing('users', ['email' => 'contact@example.test']);
    }

    public function test_an_applicant_can_view_but_not_edit_their_application(): void
    {
        $student = $this->actingAsRole('student');
        $this->submit()->assertCreated();
        $application = TeacherApplication::sole();
        $application->update(['notes' => 'Strong candidate']);

        $mine = $this->getJson('/api/my/teacher-applications')->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'pending')
            ->assertJsonPath('data.0.selections.0.category.name', 'Quran')
            ->assertJsonPath('data.0.files.cv.name', 'amina-hassan-cv.pdf');
        foreach (['notes', 'history', 'user', 'user_id', 'allowed_transitions', 'submitted_by'] as $hidden) {
            $mine->assertJsonMissingPath("data.0.$hidden");
        }

        $url = "/api/teacher-applications/{$application->id}";
        $this->getJson($url)->assertForbidden();
        $this->putJson($url, ['about' => 'Edited'])->assertMethodNotAllowed();
        $this->patchJson($url, ['about' => 'Edited'])->assertMethodNotAllowed();
        $this->patchJson("$url/status", ['status' => 'accepted'])->assertForbidden();
        $this->postJson("$url/accept")->assertForbidden();
        $this->linksFor($application, 'cv')->assertForbidden();

        // The status they see follows the review.
        $this->actingAsRole('admin');
        $this->patchJson("$url/status", ['status' => 'reviewing'])->assertOk();
        Sanctum::actingAs($student, ['*']);
        $this->getJson('/api/my/teacher-applications')->assertJsonPath('data.0.status', 'reviewing');

        // Nobody else sees it.
        $this->actingAsRole('student');
        $this->getJson('/api/my/teacher-applications')->assertJsonCount(0, 'data')->assertJsonPath('can_apply', true);
    }

    public function test_courses_are_browsable_without_an_account_but_enrolling_needs_one(): void
    {
        $published = Course::create(['title' => 'Tajweed 1', 'slug' => 'tajweed-1', 'type' => 'quran', 'is_published' => true]);
        $draft = Course::create(['title' => 'Draft', 'slug' => 'draft', 'type' => 'quran', 'is_published' => false]);
        $this->signOut();

        $this->getJson('/api/courses')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.title', 'Tajweed 1');
        $this->getJson("/api/courses/{$published->id}")->assertOk()->assertJsonPath('title', 'Tajweed 1');
        $this->getJson("/api/courses/{$draft->id}")->assertNotFound();
        $this->postJson("/api/courses/{$published->id}/apply")->assertUnauthorized();

        // A staff token still sees unpublished courses on the public routes.
        $teacher = User::factory()->create();
        $teacher->assignRole('teacher');
        $token = $teacher->createToken('test')->plainTextToken;
        $this->getJson('/api/courses', ['Authorization' => "Bearer $token"])->assertJsonCount(2, 'data');
        $this->getJson("/api/courses/{$draft->id}", ['Authorization' => "Bearer $token"])->assertOk();
    }
}
