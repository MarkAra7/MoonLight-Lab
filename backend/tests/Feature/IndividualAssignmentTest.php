<?php

namespace Tests\Feature;

use App\Models\Assignment;
use App\Models\Classes;
use App\Models\ClassStudent;
use App\Models\Notification;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class IndividualAssignmentTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private User $student;

    private User $classmate;

    private Classes $class;

    private Quiz $quiz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);

        $this->teacher = $this->user('teacher');
        $this->student = $this->user('student');
        $this->classmate = $this->user('student');

        $this->quiz = Quiz::create([
            'title' => 'Personal quiz',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
        ]);

        $this->class = Classes::create([
            'name' => 'Personal class',
            'teacher_id' => $this->teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);

        $this->addMember($this->student);
        $this->addMember($this->classmate);
    }

    public function test_teacher_can_assign_work_to_one_student(): void
    {
        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assignments', [
                'class_id' => $this->class->id,
                'student_id' => $this->student->id,
                'quiz_id' => $this->quiz->quiz_id,
                'title' => 'Just for Ada',
            ])
            ->assertStatus(201)
            ->assertJsonPath('student.id', $this->student->id)
            ->assertJsonPath('class_id', $this->class->id);

        $this->assertDatabaseHas('assignments', [
            'class_id' => $this->class->id,
            'student_id' => $this->student->id,
            'title' => 'Just for Ada',
        ]);

        $this->assertSame(1, Notification::where('user_id', $this->student->id)
            ->where('type', 'assignment_new')
            ->count());
        $this->assertSame(0, Notification::where('user_id', $this->classmate->id)
            ->where('type', 'assignment_new')
            ->count());
    }

    public function test_teacher_cannot_target_a_student_outside_the_class(): void
    {
        $outsider = $this->user('student');

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/teacher/assignments', [
                'class_id' => $this->class->id,
                'student_id' => $outsider->id,
                'quiz_id' => $this->quiz->quiz_id,
                'title' => 'Lost assignment',
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'That student is not in this class.');

        $this->assertDatabaseCount('assignments', 0);
    }

    public function test_personal_assignment_is_visible_only_to_the_target_student(): void
    {
        $personal = $this->assignment('Personal task', $this->student->id);
        $shared = $this->assignment('Shared task');

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-assignments')
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $personal->id, 'is_personal' => true])
            ->assertJsonFragment(['id' => $shared->id, 'is_personal' => false]);

        $this->actingAs($this->classmate, 'sanctum')
            ->getJson('/api/v1/my-assignments')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $shared->id)
            ->assertJsonPath('0.is_personal', false);

        $this->actingAs($this->classmate, 'sanctum')
            ->getJson("/api/v1/my-classes/{$this->class->id}")
            ->assertOk()
            ->assertJsonCount(1, 'assignments')
            ->assertJsonPath('assignments.0.id', $shared->id);

        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/my-classes/{$this->class->id}")
            ->assertOk()
            ->assertJsonCount(2, 'assignments');
    }

    public function test_another_student_cannot_start_a_personal_assignment(): void
    {
        $personal = $this->assignment('Personal task', $this->student->id);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts/start", [
                'assignment_id' => $personal->id,
            ])
            ->assertOk();

        $this->actingAs($this->classmate, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts/start", [
                'assignment_id' => $personal->id,
            ])
            ->assertForbidden()
            ->assertJsonPath('message', 'This assignment was not assigned to you.');
    }

    public function test_another_student_cannot_submit_or_record_a_personal_assignment(): void
    {
        $personal = $this->assignment('Personal task', $this->student->id);

        $this->actingAs($this->classmate, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'assignment_id' => $personal->id,
                'answers' => [],
            ])
            ->assertForbidden();

        $this->actingAs($this->classmate, 'sanctum')
            ->postJson('/api/v1/quiz-attempts', [
                'assignment_id' => $personal->id,
                'quiz_id' => $this->quiz->quiz_id,
                'score' => 1,
                'total' => 1,
            ])
            ->assertForbidden();
    }

    public function test_teacher_class_detail_shows_the_quiz_and_assignee(): void
    {
        $this->assignment('Personal task', $this->student->id);

        $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/teacher/classes/{$this->class->id}")
            ->assertOk()
            ->assertJsonPath('assignments.0.title', 'Personal task')
            ->assertJsonPath('assignments.0.quiz.title', 'Personal quiz')
            ->assertJsonPath('assignments.0.student.id', $this->student->id);
    }

    public function test_a_class_wide_assignment_is_still_open_to_every_member(): void
    {
        $shared = $this->assignment('Shared task');

        $this->actingAs($this->classmate, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts/start", [
                'assignment_id' => $shared->id,
            ])
            ->assertOk();
    }

    private function assignment(string $title, ?string $studentId = null): Assignment
    {
        return Assignment::create([
            'class_id' => $this->class->id,
            'student_id' => $studentId,
            'quiz_id' => $this->quiz->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => $title,
        ]);
    }

    private function addMember(User $student): void
    {
        ClassStudent::create([
            'class_id' => $this->class->id,
            'student_id' => $student->id,
            'status' => 'active',
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
