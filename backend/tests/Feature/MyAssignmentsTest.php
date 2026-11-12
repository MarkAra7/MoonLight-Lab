<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class MyAssignmentsTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private User $student;

    private Classes $class;

    private Quiz $quiz;

    private Assignment $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);

        $this->teacher = $this->user('teacher');
        $this->student = $this->user('student');

        $this->quiz = Quiz::create([
            'title' => 'Biology quiz',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
        ]);

        $this->class = $this->makeClass('Biology class');
        $this->addMember($this->class, $this->student, 'active');

        $this->assignment = $this->makeAssignment($this->class, 'Cell assignment', 3, [
            'due_at' => now()->addWeek(),
        ]);
    }

    public function test_student_sees_assigned_work_with_progress_and_the_teachers_grade(): void
    {
        QuizAttempt::create([
            'assignment_id' => $this->assignment->id,
            'quiz_id' => $this->quiz->quiz_id,
            'student_id' => $this->student->id,
            'attempt_number' => 1,
            'score' => 1,
            'teacher_score' => 2,
            'total' => 2,
            'answers_data' => ['answers' => []],
            'completed_at' => now(),
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-assignments')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $this->assignment->id)
            ->assertJsonPath('0.title', 'Cell assignment')
            ->assertJsonPath('0.class.name', 'Biology class')
            ->assertJsonPath('0.quiz.title', 'Biology quiz')
            ->assertJsonPath('0.max_attempts', 3)
            ->assertJsonPath('0.attempts_made', 1)
            ->assertJsonPath('0.attempts_remaining', 2)
            ->assertJsonPath('0.best_score', 2)
            ->assertJsonPath('0.best_total', 2)
            ->assertJsonPath('0.best_percentage', 100)
            ->assertJsonPath('0.is_open', true);
    }

    public function test_only_assignments_from_active_classes_are_listed(): void
    {
        $pendingClass = $this->makeClass('Pending class');
        $this->addMember($pendingClass, $this->student, 'pending');
        $this->makeAssignment($pendingClass, 'Pending assignment');

        $otherClass = $this->makeClass('Other class');
        $this->makeAssignment($otherClass, 'Other assignment');

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-assignments')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $this->assignment->id);
    }

    public function test_unlimited_attempts_are_reported_as_minus_one(): void
    {
        $this->assignment->update(['max_attempts' => 0]);

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-assignments')
            ->assertOk()
            ->assertJsonPath('0.attempts_remaining', -1);
    }

    public function test_guests_cannot_list_assigned_work(): void
    {
        $this->getJson('/api/v1/my-assignments')->assertUnauthorized();
    }

    private function makeClass(string $name): Classes
    {
        return Classes::create([
            'name' => $name,
            'teacher_id' => $this->teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);
    }

    private function makeAssignment(
        Classes $class,
        string $title,
        int $maxAttempts = 1,
        array $attributes = []
    ): Assignment {
        return Assignment::create(array_merge([
            'class_id' => $class->id,
            'quiz_id' => $this->quiz->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => $title,
            'max_attempts' => $maxAttempts,
        ], $attributes));
    }

    private function addMember(Classes $class, User $student, string $status): void
    {
        ClassStudent::create([
            'class_id' => $class->id,
            'student_id' => $student->id,
            'status' => $status,
            'joined_by' => 'code',
            'joined_at' => now(),
        ]);
    }

    private function user(string $role): User
    {
        return User::factory()->create([
            'role_id' => Role::where('title', $role)->first()->id,
        ]);
    }
}
