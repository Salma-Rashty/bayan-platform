<?php

namespace App\Http\Requests\Api\TeacherApplications;

use App\Models\TeacherApplication;
use App\Models\User;
use App\Rules\PhoneNumberForCountry;
use App\Rules\WordCount;
use App\Support\ApplicantHistory;
use App\Support\Countries;
use App\Support\PhoneNumbers;
use App\Support\PublicCatalog;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * The public "Teach with us" form. Selections are nested per category:
 *
 *   categories[i][id]
 *   categories[i][levels][j][id] + categories[i][levels][j][age_groups][]   (category has levels)
 *   categories[i][age_groups][]                                             (category has none)
 */
class StoreTeacherApplicationRequest extends FormRequest
{
    /** 5 MB, in kilobytes. */
    public const CV_MAX_KB = 5 * 1024;

    /** 500 MB, in kilobytes. */
    public const VIDEO_MAX_KB = 500 * 1024;

    public const ABOUT_MIN_WORDS = 50;

    public const ABOUT_MAX_WORDS = 300;

    /**
     * Any signed-in user may apply (the route requires auth). Admins can submit unlimited
     * applications, on anyone's behalf, without the cooldown.
     */
    public function authorize(): bool
    {
        return true;
    }

    /** Admins (those who manage teacher applications) skip the cooldown and may apply for others. */
    public function submittedByAdmin(): bool
    {
        return $this->user()->can('create', TeacherApplication::class);
    }

    /**
     * The account the application belongs to: the applicant's own, or, for an admin submitting
     * on someone's behalf, the account with the applicant's email (none if they don't have one).
     */
    public function applicantUser(): ?User
    {
        return $this->submittedByAdmin()
            ? User::firstWhere('email', $this->validated('email'))
            : $this->user();
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'first_name' => ['required', 'string', 'max:100'],
            'last_name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email', 'max:255'],
            // Must be valid for phone_country (libphonenumber). Stored as E.164.
            'phone' => ['required', 'string', 'max:30', new PhoneNumberForCountry('phone_country')],
            'phone_country' => ['required', 'string', Rule::in(Countries::codes())],
            'nationality' => ['required', 'string', Rule::in(Countries::codes())],
            'birth_date' => ['required', 'date', 'before:today', 'after:1900-01-01'],
            'gender' => ['required', Rule::in(TeacherApplication::GENDERS)],
            'about' => ['required', 'string', 'max:5000', new WordCount(self::ABOUT_MIN_WORDS, self::ABOUT_MAX_WORDS)],
            'cv' => ['required', 'file', 'mimes:pdf,doc,docx', 'max:'.self::CV_MAX_KB],
            'video' => ['nullable', 'file', 'mimetypes:video/*', 'max:'.self::VIDEO_MAX_KB],

            'categories' => ['required', 'array', 'min:1'],
            'categories.*' => ['array:id,levels,age_groups'],
            'categories.*.id' => ['required', 'integer', 'distinct'],
            'categories.*.levels' => ['sometimes', 'array'],
            'categories.*.levels.*' => ['array:id,age_groups'],
            // Levels belong to exactly one category, so distinct across the whole payload is right.
            'categories.*.levels.*.id' => ['required', 'integer', 'distinct'],
            'categories.*.levels.*.age_groups' => ['required', 'array', 'min:1'],
            'categories.*.levels.*.age_groups.*' => ['string', Rule::in(TeacherApplication::AGE_GROUPS)],
            'categories.*.age_groups' => ['sometimes', 'array'],
            'categories.*.age_groups.*' => ['string', Rule::in(TeacherApplication::AGE_GROUPS)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'birth_date.before' => 'Your birth date must be in the past.',
            'nationality.in' => 'Choose a valid nationality.',
            'phone.required' => 'Enter your phone number.',
            'phone_country.required' => 'Choose the country for your phone number.',
            'phone_country.in' => 'Choose a valid country for your phone number.',
            'cv.mimes' => 'Your CV must be a PDF or Word document.',
            'cv.max' => 'Your CV must be 5 MB or smaller.',
            'video.mimetypes' => 'The introduction video must be a video file.',
            'video.max' => 'The introduction video must be 500 MB or smaller.',
            'categories.required' => 'Choose at least one category you can teach.',
            'categories.*.levels.*.age_groups.required' => 'Choose at least one age group for each level.',
        ];
    }

    /**
     * Checks the selections against the catalog (inactive categories and levels included:
     * see PublicCatalog::forTeacherApplications()) and enforces where age groups go: on each
     * chosen level when the category has levels, on the category when it has none.
     */
    public function after(): array
    {
        return [fn (Validator $validator) => $this->checkCooldown($validator), function (Validator $validator) {
            // Shape errors are already reported; the checks below assume a well-formed payload.
            if ($validator->errors()->has('categories*')) {
                return;
            }

            $catalog = PublicCatalog::forTeacherApplications();

            foreach ($this->input('categories', []) as $i => $selection) {
                $category = $catalog->get($selection['id']);

                if (! $category) {
                    $validator->errors()->add("categories.$i.id", 'This category is not available.');

                    continue;
                }

                $levels = $selection['levels'] ?? [];
                $ageGroups = $selection['age_groups'] ?? [];

                if ($category->levels->isEmpty()) {
                    if ($levels !== []) {
                        $validator->errors()->add("categories.$i.levels", "{$category->name} has no levels to choose from.");
                    }
                    if ($ageGroups === []) {
                        $validator->errors()->add("categories.$i.age_groups", "Choose at least one age group for {$category->name}.");
                    }

                    continue;
                }

                if ($ageGroups !== []) {
                    $validator->errors()->add("categories.$i.age_groups", "{$category->name} has levels: choose age groups for each level instead.");
                }
                if ($levels === []) {
                    $validator->errors()->add("categories.$i.levels", "Choose at least one level for {$category->name}.");
                }

                $levelIds = $category->levels->modelKeys();
                foreach ($levels as $j => $level) {
                    if (! in_array((int) $level['id'], $levelIds, true)) {
                        $validator->errors()->add("categories.$i.levels.$j.id", "This level is not available in {$category->name}.");
                    }
                }
            }
        }];
    }

    /**
     * One application per applicant every ApplicantHistory::COOLDOWN_MONTHS, counted from their
     * latest one. "Same applicant" covers this account and any application with the same name
     * and birth date, so a second account doesn't get around it.
     */
    private function checkCooldown(Validator $validator): void
    {
        if ($this->submittedByAdmin() || $validator->errors()->hasAny(['first_name', 'last_name', 'birth_date'])) {
            return;
        }

        $identityKey = ApplicantHistory::identityKey($this->input('first_name'), $this->input('last_name'), $this->input('birth_date'));
        $nextAllowedAt = ApplicantHistory::nextAllowedAt(ApplicantHistory::latest($this->user()->id, [$identityKey]));

        if ($nextAllowedAt) {
            $validator->errors()->add(
                'application',
                "You've already applied in the last ".ApplicantHistory::COOLDOWN_MONTHS.' months. You cannot apply again until '.$nextAllowedAt->format('j F Y').'.'
            );
        }
    }

    /**
     * The applicant fields to store, with the phone normalised to E.164.
     *
     * @return array<string, mixed>
     */
    public function applicant(): array
    {
        $country = strtoupper($this->validated('phone_country'));

        return [
            ...$this->safe()->only(['first_name', 'last_name', 'email', 'nationality', 'birth_date', 'gender', 'about']),
            'phone' => PhoneNumbers::toE164($this->validated('phone'), $country),
            'phone_country' => $country,
        ];
    }

    /**
     * The selections normalised to [{category_id, levels: [{level_id, age_groups}], age_groups}],
     * with duplicate age groups dropped.
     *
     * @return list<array{category_id: int, levels: list<array{level_id: int, age_groups: list<string>}>, age_groups: list<string>}>
     */
    public function selections(): array
    {
        return collect($this->validated('categories'))->map(fn (array $selection) => [
            'category_id' => (int) $selection['id'],
            'levels' => collect($selection['levels'] ?? [])->map(fn (array $level) => [
                'level_id' => (int) $level['id'],
                'age_groups' => array_values(array_unique($level['age_groups'])),
            ])->values()->all(),
            'age_groups' => array_values(array_unique($selection['age_groups'] ?? [])),
        ])->values()->all();
    }
}
