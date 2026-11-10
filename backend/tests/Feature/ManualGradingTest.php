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

class ManualGradingTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private User $student;

    private Quiz $quiz;

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
            'title' => 'Manual grading quiz',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
        ]);

        $class = Classes::create([
            'name' => 'Grading class',
            'teacher_id' => $this->teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);

        $this->assignment = Assignment::create([
            'class_id' => $class->id,
            'quiz_id' => $this->quiz->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => 'Graded assignment',
            'max_attempts' => 5,
        ]);
    }

    public function test_teacher_can_view_an_attempt_with_the_students_answers(): void
    {
        $attemptId = $this->submitAttempt();

        $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/teacher/assignments/{$this->assignment->id}/attempts/{$attemptId}")
            ->assertOk()
            ->assertJsonPath('attempt.auto_score', 1)
            ->assertJsonPath('attempt.final_score', 1)
            ->assertJsonPath('attempt.total', 2)
            ->assertJsonPath('attempt.student.id', $this->student->id)
            ->assertJsonPath('questions.0.given_answer', 'Vilnius')
            ->assertJsonPath('questions.0.correct_answer', 'Riga')
            ->assertJsonPath('questions.0.is_correct', false)
            ->assertJsonPath('questions.1.given_text', 'Daugava')
            ->assertJsonPath('questions.1.correct_text', 'Daugava')
            ->assertJsonPath('questions.1.is_correct', true);
    }

    public function test_teacher_can_override_the_score_and_leave_feedback(): void
    {
        $attemptId = $this->submitAttempt();

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/teacher/assignments/{$this->assignment->id}/attempts/{$attemptId}", [
                'teacher_score' => 2,
                'teacher_feedback' => 'The capital answer was close enough this time.',
            ])
            ->assertOk()
            ->assertJsonPath('attempt.auto_score', 1)
            ->assertJsonPath('attempt.teacher_score', 2)
            ->assertJsonPath('attempt.final_score', 2)
            ->assertJsonPath('attempt.percentage', 100)
            ->assertJsonPath('attempt.teacher_feedback', 'The capital answer was close enough this time.')
            ->assertJsonPath('attempt.graded_by', $this->teacher->name);

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $attemptId,
            'teacher_score' => 2,
            'graded_by_id' => $this->teacher->id,
        ]);

        $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/teacher/assignments/{$this->assignment->id}/results")
            ->assertOk()
            ->assertJsonPath('results.0.best_score', 2)
            ->assertJsonPath('results.0.best_percentage', 100)
            ->assertJsonPath('results.0.attempts.0.teacher_score', 2)
            ->assertJsonPath('results.0.attempts.0.final_score', 2);
    }

    public function test_manual_score_cannot_exceed_the_attempt_total(): void
    {
        $attemptId = $this->submitAttempt();

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/teacher/assignments/{$this->assignment->id}/attempts/{$attemptId}", [
                'teacher_score' => 5,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('teacher_score');

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $attemptId,
            'teacher_score' => null,
        ]);
    }

    public function test_another_teacher_cannot_view_or_grade_the_attempt(): void
    {
        $attemptId = $this->submitAttempt();
        $otherTeacher = $this->user('teacher');

        $this->actingAs($otherTeacher, 'sanctum')
            ->getJson("/api/v1/teacher/assignments/{$this->assignment->id}/attempts/{$attemptId}")
            ->assertStatus(403);

        $this->actingAs($otherTeacher, 'sanctum')
            ->putJson("/api/v1/teacher/assignments/{$this->assignment->id}/attempts/{$attemptId}", [
                'teacher_score' => 2,
            ])
            ->assertStatus(403);

        $this->assertDatabaseHas('quiz_attempts', [
            'id' => $attemptId,
            'teacher_score' => null,
        ]);
    }

    public function test_an_attempt_from_another_assignment_cannot_be_graded(): void
    {
        $attemptId = $this->submitAttempt();

        $otherAssignment = Assignment::create([
            'class_id' => $this->assignment->class_id,
            'quiz_id' => $this->quiz->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => 'Another assignment',
        ]);

        $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/teacher/assignments/{$otherAssignment->id}/attempts/{$attemptId}")
            ->assertStatus(404);

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/teacher/assignments/{$otherAssignment->id}/attempts/{$attemptId}", [
                'teacher_score' => 1,
            ])
            ->assertStatus(404);
    }

    /** Submits a two-question attempt and returns its id. */
    private function submitAttempt(): int
    {
        $single = $this->makeQuestion('single_choice', 'What is the capital of Latvia?');
        $this->makeAnswer($single, 'Riga', true);
        $wrong = $this->makeAnswer($single, 'Vilnius', false);

        $text = $this->makeQuestion('text_input', 'Which river flows through Riga?', [
            'correct_text' => 'Daugava',
            'match_mode' => 'case_insensitive',
        ]);

        return $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'assignment_id' => $this->assignment->id,
                'answers' => [
                    ['question_id' => $single->question_id, 'answer_id' => $wrong->answer_id],
                    ['question_id' => $text->question_id, 'text' => 'Daugava'],
                ],
            ])
            ->assertStatus(201)
            ->json('attempt_id');
    }

    private function makeQuestion(string $type, string $text, array $config = []): Question
    {
        return Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => $text,
            'question_type' => $type,
            'display_order' => $this->quiz->questions()->count() + 1,
            'config' => $config ?: null,
        ]);
    }

    private function makeAnswer(Question $question, string $text, bool $isCorrect): Answer
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
