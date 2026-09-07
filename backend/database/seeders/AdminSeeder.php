<?php

namespace Database\Seeders;

use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    public function run(): void
    {
        $roles = Role::pluck('id', 'title');

        $users = [
            ['first_name' => 'Admin', 'last_name' => '', 'username' => 'admin', 'email' => 'admin@moonlightquiz.com', 'role' => 'admin'],
            ['first_name' => 'Teacher', 'last_name' => '', 'username' => 'teacher', 'email' => 'teacher@moonlightquiz.com', 'role' => 'teacher'],
            ['first_name' => 'Student', 'last_name' => '', 'username' => 'student', 'email' => 'student@moonlightquiz.com', 'role' => 'student'],
            ['first_name' => 'Individual', 'last_name' => '', 'username' => 'individual', 'email' => 'individual@moonlightquiz.com', 'role' => 'individual'],
        ];

        foreach ($users as $user) {
            User::firstOrCreate(
                ['email' => $user['email']],
                [
                    'first_name' => $user['first_name'],
                    'last_name' => $user['last_name'],
                    'username' => $user['username'],
                    'email' => $user['email'],
                    'password' => Hash::make('password'),
                    'role_id' => $roles[$user['role']],
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
