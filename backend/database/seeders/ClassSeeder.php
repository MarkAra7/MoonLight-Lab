<?php

namespace Database\Seeders;

use App\Models\Assignment;
use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Notification;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class ClassSeeder extends Seeder
{
    public function run(): void
    {
        $teacher = User::where('email', 'teacher@moonlightquiz.com')->first();
        $student = User::where('email', 'student@moonlightquiz.com')->first();

        if (! $teacher || ! $student) {
            $this->command->warn('Demo users not found. Run AdminSeeder first.');

            return;
        }

        $student2 = $this->demoStudent('student2@moonlightquiz.com', 'student2');
        $student3 = $this->demoStudent('student3@moonlightquiz.com', 'student3');

        $scienceQuiz = Quiz::where('title', 'General Science Knowledge')->first();
        $codingQuiz = Quiz::where('title', 'Programming Basics')->first();

        // --- Class 1: Science 101 ---
        $class1 = Classes::firstOrCreate(
            ['name' => 'Science 101 – Spring 2026'],
            [
                'description' => 'Weekly science quizzes and assignments for beginners.',
                'teacher_id' => $teacher->id,
                'code' => $this->uniqueCode(),
                'code_expires_at' => null,
            ]
        );

        $this->enroll($class1, $student, 'active', 'code', $student->id);
        $this->enroll($class1, $student2, 'pending', 'code', null);

        $assignment1 = Assignment::firstOrCreate(
            ['class_id' => $class1->id, 'quiz_id' => $scienceQuiz->quiz_id, 'title' => 'Unit 1 – Science Basics'],
            [
                'description' => 'Complete the basics quiz before Friday.',
                'teacher_id' => $teacher->id,
                'max_attempts' => 3,
                'time_limit_minutes' => 10,
                'opens_at' => now()->subDays(7),
                'due_at' => now()->addDays(7),
            ]
        );

        $this->attempt($assignment1, $scienceQuiz, $student, 1, 4, 5, now()->subDays(3));
        $this->attempt($assignment1, $scienceQuiz, $student, 2, 5, 5, now()->subDay());

        // --- Class 2: Coding Club ---
        $class2 = Classes::firstOrCreate(
            ['name' => 'Coding Club'],
            [
                'description' => 'JavaScript and web development practice group.',
                'teacher_id' => $teacher->id,
                'code' => $this->uniqueCode(),
                'code_expires_at' => now()->addDays(30),
            ]
        );

        $this->enroll($class2, $student2, 'active', 'manual', $teacher->id);
        $this->enroll($class2, $student3, 'pending', 'code', null);

        $assignment2 = Assignment::firstOrCreate(
            ['class_id' => $class2->id, 'quiz_id' => $codingQuiz->quiz_id, 'title' => 'Intro to Programming'],
            [
                'description' => 'First assignment of the club.',
                'teacher_id' => $teacher->id,
                'max_attempts' => 2,
                'time_limit_minutes' => 10,
                'opens_at' => now()->subDay(),
                'due_at' => now()->addDays(14),
            ]
        );

        $this->attempt($assignment2, $codingQuiz, $student2, 1, 2, 3, now()->subHours(5));

        // --- Notifications ---
        Notification::firstOrCreate(
            ['user_id' => $student->id, 'type' => 'class_approved', 'title' => 'Class request approved'],
            [
                'body' => 'Your request to join "Science 101 – Spring 2026" has been approved.',
                'data' => ['class_id' => $class1->id],
            ]
        );

        Notification::firstOrCreate(
            ['user_id' => $student2->id, 'type' => 'assignment', 'title' => 'New assignment'],
            [
                'body' => 'New assignment "Intro to Programming" in Coding Club.',
                'data' => ['class_id' => $class2->id, 'assignment_id' => $assignment2->id],
            ]
        );

        $this->command->info('Seeded 2 classes with students, assignments, attempts and notifications.');
    }

    protected function demoStudent(string $email, string $username): User
    {
        $role = Role::where('title', 'student')->first();

        return User::firstOrCreate(
            ['email' => $email],
            [
                'first_name' => ucfirst($username),
                'last_name' => 'Demo',
                'username' => $username,
                'password' => Hash::make('password'),
                'role_id' => $role->id,
                'email_verified_at' => now(),
                'preferred_language' => 'en',
            ]
        );
    }

    protected function uniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (Classes::where('code', $code)->exists());

        return $code;
    }

    protected function enroll(Classes $class, User $student, string $status, string $joinedBy, ?string $addedBy): void
    {
        ClassStudent::firstOrCreate(
            ['class_id' => $class->id, 'student_id' => $student->id],
            [
                'status' => $status,
                'joined_by' => $joinedBy,
                'added_by' => $addedBy,
                'joined_at' => now(),
            ]
        );
    }

    protected function attempt(
        Assignment $assignment,
        Quiz $quiz,
        User $student,
        int $attemptNumber,
        int $score,
        int $total,
        $completedAt
    ): void {
        QuizAttempt::firstOrCreate(
            [
                'assignment_id' => $assignment->id,
                'student_id' => $student->id,
                'attempt_number' => $attemptNumber,
            ],
            [
                'quiz_id' => $quiz->quiz_id,
                'score' => $score,
                'total' => $total,
                'answers_data' => ['completed' => true],
                'started_at' => $completedAt->copy()->subMinutes(5),
                'completed_at' => $completedAt,
            ]
        );
    }
}
