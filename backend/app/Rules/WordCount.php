<?php

namespace App\Rules;

use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Between $min and $max words, where words are runs of non-whitespace. Unicode spaces
 * (e.g. non-breaking) separate words too, and leading/trailing/repeated whitespace is ignored.
 * Keep in sync with countWords() in frontend/lib/teacher-application-form.ts.
 */
class WordCount implements ValidationRule
{
    public function __construct(private int $min, private int $max) {}

    public static function count(string $text): int
    {
        return count(preg_split('/[\s\p{Z}]+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?: []);
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        if (! is_string($value)) {
            return;
        }

        $words = self::count($value);

        if ($words < $this->min) {
            $fail("Please write at least {$this->min} words (you have {$words}).");
        } elseif ($words > $this->max) {
            $fail("Please keep this to {$this->max} words or fewer (you have {$words}).");
        }
    }
}
