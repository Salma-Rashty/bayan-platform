<?php

namespace App\Support;

use libphonenumber\NumberParseException;
use libphonenumber\PhoneNumber;
use libphonenumber\PhoneNumberFormat;
use libphonenumber\PhoneNumberUtil;

/**
 * Phone numbers via libphonenumber: parsed against a country (ISO 3166-1 alpha-2) and
 * stored in E.164 (e.g. +905551234567).
 */
class PhoneNumbers
{
    /**
     * The number parsed for the country, or null if it isn't a valid number FOR THAT country.
     * Accepts national ("0555 123 45 67") or international ("+90 555...") input; an
     * international number belonging to another country is rejected.
     */
    public static function parseForCountry(string $number, string $country): ?PhoneNumber
    {
        $util = PhoneNumberUtil::getInstance();

        try {
            $parsed = $util->parse($number, strtoupper($country));
        } catch (NumberParseException) {
            return null;
        }

        return $util->isValidNumberForRegion($parsed, strtoupper($country)) ? $parsed : null;
    }

    public static function toE164(string $number, string $country): ?string
    {
        $parsed = self::parseForCountry($number, $country);

        return $parsed ? PhoneNumberUtil::getInstance()->format($parsed, PhoneNumberFormat::E164) : null;
    }

    /**
     * A stored E.164 number in readable international form ("+90 555 123 45 67"); unchanged if unparseable.
     */
    public static function display(?string $e164): ?string
    {
        if ($e164 === null) {
            return null;
        }

        $util = PhoneNumberUtil::getInstance();

        try {
            return $util->format($util->parse($e164), PhoneNumberFormat::INTERNATIONAL);
        } catch (NumberParseException) {
            return $e164;
        }
    }
}
