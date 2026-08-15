<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            'manage-users',
            'edit-curriculum',
            'create-lessons',
            'grade-homework',
            'manage-billing',
            'view-reports',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission]);
        }

        $superAdmin = Role::firstOrCreate(['name' => 'super-admin']);
        $superAdmin->syncPermissions($permissions);

        $admin = Role::firstOrCreate(['name' => 'admin']);
        $admin->syncPermissions(['manage-users', 'view-reports', 'manage-billing']);

        $teacher = Role::firstOrCreate(['name' => 'teacher']);
        $teacher->syncPermissions(['create-lessons', 'grade-homework']);

        Role::firstOrCreate(['name' => 'student']);
    }
}
