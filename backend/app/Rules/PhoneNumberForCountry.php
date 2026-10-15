<?php

namespace App\Rules;

use App\Support\Countries;
use App\Support\PhoneNumbers;
use Closure;
use Illuminate\Contracts\Validation\DataAwareRule;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * The value must be a valid phone number for the country given in another field.
 */
class PhoneNumberForCountry implements DataAwareRule, ValidationRule
{
    /** @var array<string, mixed> */
    private array $data = [];

    public function __construct(private string $countryField) {}

    public function setData(array $data): static
    {
        $this->data = $data;

        return $this;
    }

    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $country = $this->data[$this->countryField] ?? null;

        // A missing or unknown country is reported on the country field itself.
        if (! is_string($value) || ! is_string($country) || ! isset(Countries::ALL[strtoupper($country)])) {
            return;
        }

        if (PhoneNumbers::parseForCountry($value, $country) === null) {
            $fail('Enter a valid phone number for '.Countries::ALL[strtoupper($country)].'.');
        }
    }
}
