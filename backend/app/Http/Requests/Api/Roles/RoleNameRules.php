<?php

namespace App\Http\Requests\Api\Roles;

/**
 * Role naming rules: lowercase kebab-case, like the seeded roles.
 */
final class RoleNameRules
{
    public const PATTERN = '/^[a-z0-9]+(-[a-z0-9]+)*$/';

    public const MESSAGES = [
        'name.regex' => 'Use lowercase letters, numbers and single hyphens, e.g. "content-editor".',
        'name.unique' => '":input" already exists.',
    ];
}
