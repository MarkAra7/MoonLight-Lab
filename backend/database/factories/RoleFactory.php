<?php

namespace Database\Factories;

use App\Models\Role;
use Illuminate\Database\Eloquent\Factories\Factory;

class RoleFactory extends Factory
{
    protected $model = Role::class;

    public function definition(): array
    {
        return [
            'title' => fake()->unique()->randomElement(['teacher', 'student', 'individual', 'admin']),
            'description' => fake()->sentence(),
        ];
    }

    public function teacher(): static
    {
        return $this->state(fn (array $attributes) => [
            'title' => 'teacher',
            'description' => 'Create quizzes and assign tasks to students.',
        ]);
    }

    public function student(): static
    {
        return $this->state(fn (array $attributes) => [
            'title' => 'student',
            'description' => 'Completing assigned tasks and creating your own quizzes.',
        ]);
    }

    public function individual(): static
    {
        return $this->state(fn (array $attributes) => [
            'title' => 'individual',
            'description' => 'Create quizzes for personal use and share them with friends.',
        ]);
    }

    public function admin(): static
    {
        return $this->state(fn (array $attributes) => [
            'title' => 'admin',
            'description' => 'System administration.',
        ]);
    }
}
