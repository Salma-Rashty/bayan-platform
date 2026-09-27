<?php

namespace App\Http\Requests\Api\Users;

trait ReadsStringLists
{
    /**
     * The string entries of an array input. authorize() runs before validation, so the
     * policy checks that need roles/permissions can't rely on the input being well-formed.
     *
     * @return array<int, string>
     */
    protected function stringList(string $key): array
    {
        return array_values(array_filter((array) $this->input($key, []), 'is_string'));
    }
}
