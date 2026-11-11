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

class AttemptHistoryTest extends TestCase
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
            'title' => 'History quiz',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
        ]);

        $class = Classes::create([
            'name' => 'History class',
            'teacher_id' => $this->teacher->id,
            'code' => strtoupper(Str::random(6)),
        ]);

        $this->assignment = Assignment::create([
            'class_id' => $class->id,
            'quiz_id' => $this->quiz->quiz_id,
            'teacher_id' => $this->teacher->id,
            'title' => 'History assignment',
            'max_attempts' => 3,
        ]);
    }

    public function test_student_sees_the_teachers_grade_and_feedback_in_the_history(): void
    {
        $attemptId = $this->submitAttempt();
        $this->gradeAttempt($attemptId, 2, 'Nice improvement.');

        $this->actingAs($this->student, 'sanctum')
            ->getJson('/api/v1/my-attempts')
            ->assertOk()
            ->assertJsonPath('0.attempt_id', $attemptId)
            ->assertJsonPath('0.quiz_title', 'History quiz')
            ->assertJsonPath('0.assignment_title', 'History assignment')
            ->assertJsonPath('0.score', 1)
            ->assertJsonPath('0.teacher_score', 2)
            ->assertJsonPath('0.final_score', 2)
            ->assertJsonPath('0.percentage', 100)
            ->assertJsonPath('0.teacher_feedback', 'Nice improvement.');
    }

    public function test_student_can_reopen_an_attempt_with_answers_and_the_manual_grade(): void
    {
        $attemptId = $this->submitAttempt();
        $this->gradeAttempt($attemptId, 2, 'Well done.');

        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/my-attempts/{$attemptId}")
            ->assertOk()
            ->assertJsonPath('attempt_id', $attemptId)
            ->assertJsonPath('score', 1)
            ->assertJsonPath('final_score', 2)
            ->assertJsonPath('percentage', 100)
            ->assertJsonPath('teacher_feedback', 'Well done.')
            ->assertJsonPath('graded_by', $this->teacher->name)
            ->assertJsonPath('questions.0.question_text', 'What is the capital of Latvia?')
            ->assertJsonPath('questions.0.given_answers.0.answer_text', 'Vilnius')
            ->assertJsonPath('questions.0.correct_answers.0.answer_text', 'Riga')
            ->assertJsonPath('questions.0.is_correct', false);
    }

    public function test_an_ungraded_attempt_shows_the_automatic_score_only(): void
    {
        $attemptId = $this->submitAttempt();

        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/my-attempts/{$attemptId}")
            ->assertOk()
            ->assertJsonPath('teacher_score', null)
            ->assertJsonPath('final_score', 1)
            ->assertJsonPath('percentage', 50)
            ->assertJsonPath('teacher_feedback', null);
    }

    public function test_another_student_cannot_open_someone_elses_attempt(): void
    {
        $attemptId = $this->submitAttempt();
        $other = $this->user('student');

        $this->actingAs($other, 'sanctum')
            ->getJson("/api/v1/my-attempts/{$attemptId}")
            ->assertStatus(403);

        $this->actingAs($other, 'sanctum')
            ->getJson('/api/v1/my-attempts')
            ->assertOk()
            ->assertJsonCount(0);
    }

    public function test_guests_cannot_read_attempt_history(): void
    {
        $this->getJson('/api/v1/my-attempts')->assertStatus(401);
    }

    private function submitAttempt(): int
    {
        $single = $this->makeQuestion('single_choice', 'What is the capital of Latvia?');
        $this->createAnswer($single, 'Riga', true);
        $wrong = $this->createAnswer($single, 'Vilnius', false);

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

    private function gradeAttempt(int $attemptId, int $score, string $feedback): void
    {
        $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/teacher/assignments/{$this->assignment->id}/attempts/{$attemptId}", [
                'teacher_score' => $score,
                'teacher_feedback' => $feedback,
            ])
            ->assertOk();
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
