<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $roles = [
            [
                'title' => 'teacher',
                'description' => 'Create quizzes and assign tasks to students.',
            ],
            [
                'title' => 'student',
                'description' => 'Completing assigned tasks and creating your own quizzes.',
            ],
            [
                'title' => 'individual',
                'description' => 'Create quizzes for personal use and share them with friends.',
            ],
            [
                'title' => 'admin',
                'description' => 'System administration.',
            ],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(['title' => $role['title']], $role);
        }
    }
}
