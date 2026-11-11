<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Assignment;
use App\Models\Classes;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuestionTypeSeeder;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Tests\TestCase;

class QuizTimeLimitTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private User $student;

    private Quiz $quiz;

    private Question $question;

    private Assignment $assignment;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);
        $this->seed(QuestionTypeSeeder::class);

        $this->teacher = $this->user('teacher');
        $this->student = $this->user('student');

        $this->quiz = Quiz::create([
            'title' => 'Timed quiz',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
            'time_limit' => 10,
        ]);

        $this->question = Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => 'Pick the correct answer',
            'question_type' => 'single_choice',
            'display_order' => 1,
        ]);

        $this->createAnswer($this->question, 'Right', true);
        $this->createAnswer($this->question, 'Wrong', false);

        $class = Classes::create([
            'name' => 'Timed class',
            'teacher_id' => $this->teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);

        $this->assignment = Assignment::create([
            'class_id' => $class->id,
            'quiz_id' => $this->quiz->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => 'Timed assignment',
            'max_attempts' => 0,
            'time_limit_minutes' => 2,
        ]);
    }

    public function test_start_returns_a_deadline_and_a_token_for_a_timed_quiz(): void
    {
        $response = $this->start();

        $response->assertOk()
            ->assertJsonPath('time_limit_seconds', 600)
            ->assertJsonStructure(['started_at', 'server_now', 'deadline_at', 'attempt_token']);

        $this->assertNotNull($response->json('deadline_at'));
        $this->assertNotEmpty($response->json('attempt_token'));
    }

    public function test_the_assignment_time_limit_overrides_the_quiz_time_limit(): void
    {
        $this->start(['assignment_id' => $this->assignment->id])
            ->assertOk()
            ->assertJsonPath('time_limit_seconds', 120);
    }

    public function test_an_untimed_quiz_starts_without_a_deadline(): void
    {
        $this->quiz->update(['time_limit' => null]);

        $this->start()
            ->assertOk()
            ->assertJsonPath('deadline_at', null)
            ->assertJsonPath('time_limit_seconds', null)
            ->assertJsonPath('attempt_token', null);
    }

    public function test_submitting_a_timed_quiz_without_starting_is_rejected(): void
    {
        $this->submit([])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Start the quiz before submitting your answers.');
    }

    public function test_a_submission_after_the_deadline_is_rejected(): void
    {
        $token = $this->start(['assignment_id' => $this->assignment->id])->json('attempt_token');

        $this->travel(2)->minutes();
        $this->travel(16)->seconds();

        $this->submit(['attempt_token' => $token, 'assignment_id' => $this->assignment->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Time is up. The time limit for this attempt has passed.');
    }

    public function test_a_submission_inside_the_time_limit_is_accepted(): void
    {
        $token = $this->start(['assignment_id' => $this->assignment->id])->json('attempt_token');

        $this->travel(1)->minute();

        $this->submit(['attempt_token' => $token, 'assignment_id' => $this->assignment->id])
            ->assertStatus(201)
            ->assertJsonPath('score', 1)
            ->assertJsonPath('total', 1);
    }

    public function test_the_server_start_time_is_stored_instead_of_a_client_value(): void
    {
        $token = $this->start(['assignment_id' => $this->assignment->id])->json('attempt_token');

        $this->travel(30)->seconds();

        $attempt = $this->submit([
            'attempt_token' => $token,
            'assignment_id' => $this->assignment->id,
            'started_at' => '2001-01-01T00:00:00+00:00',
        ])->assertStatus(201)->json();

        $stored = \App\Models\QuizAttempt::find($attempt['attempt_id']);

        $this->assertTrue($stored->started_at->isAfter(now()->subMinute()));
        $this->assertSame(1, $stored->attempt_number);
    }

    public function test_a_token_cannot_be_reused_by_another_student(): void
    {
        $token = $this->start(['assignment_id' => $this->assignment->id])->json('attempt_token');

        $this->actingAs($this->user('student'), 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'assignment_id' => $this->assignment->id,
                'attempt_token' => $token,
                'answers' => [['question_id' => $this->question->question_id, 'answer_id' => $this->correctAnswerId()]],
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This attempt could not be verified. Start the quiz again.');
    }

    public function test_starting_a_closed_assignment_is_rejected(): void
    {
        $this->assignment->update(['due_at' => now()->subMinute()]);

        $this->start(['assignment_id' => $this->assignment->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This assignment is closed.');
    }

    public function test_starting_an_assignment_without_attempts_left_is_rejected(): void
    {
        $this->assignment->update(['max_attempts' => 1]);

        $token = $this->start(['assignment_id' => $this->assignment->id])->json('attempt_token');
        $this->submit(['attempt_token' => $token, 'assignment_id' => $this->assignment->id])->assertStatus(201);

        $this->start(['assignment_id' => $this->assignment->id])
            ->assertStatus(422)
            ->assertJsonPath('message', 'No attempts remaining.');
    }

    private function start(array $payload = [])
    {
        return $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts/start", $payload);
    }

    private function submit(array $payload)
    {
        return $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", $payload + [
                'answers' => [
                    ['question_id' => $this->question->question_id, 'answer_id' => $this->correctAnswerId()],
                ],
            ]);
    }

    private function correctAnswerId(): string
    {
        return $this->question->answers()->where('is_correct', true)->first()->answer_id;
    }

    private function createAnswer(Question $question, string $text, bool $isCorrect): Answer
    {
        return $question->answers()->create([
            'answer_text' => $text,
            'is_correct' => $isCorrect,
            'display_order' => $question->answers()->count() + 1,
        ]);
    }

    private function user(string $role): User
    {
        return User::factory()->create([
            'role_id' => Role::where('title', $role)->first()->id,
        ]);
    }
}
