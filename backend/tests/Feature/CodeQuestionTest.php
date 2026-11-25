<?php

namespace Tests\Feature;

use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuestionTypeSeeder;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CodeQuestionTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    private User $student;

    private Quiz $quiz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);
        $this->seed(QuestionTypeSeeder::class);

        $this->teacher = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);
        $this->student = User::factory()->create([
            'role_id' => Role::where('title', 'student')->first()->id,
        ]);

        $this->quiz = Quiz::create([
            'title' => 'Programming quiz',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
        ]);
    }

    public function test_code_question_is_graded_with_hidden_tests(): void
    {
        // The fake service echoes stdin, so `print(input())` passes every test.
        Http::fake(fn ($request) => Http::response([
            'run' => ['stdout' => (string) ($request['stdin'] ?? ''), 'stderr' => '', 'code' => 0],
        ]));

        $question = $this->codeQuestion();

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id, 'code' => 'print(input())'],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('score', 1)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('questions.0.is_correct', true)
            ->assertJsonPath('questions.0.test_summary', ['passed' => 2, 'total' => 2])
            ->assertJsonMissing(['expected_output' => 'secret']);
    }

    public function test_wrong_code_scores_zero_and_shows_visible_test_results(): void
    {
        Http::fake(fn () => Http::response([
            'run' => ['stdout' => 'wrong', 'stderr' => '', 'code' => 0],
        ]));

        $question = $this->codeQuestion();

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id, 'code' => 'print("wrong")'],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('score', 0)
            ->assertJsonPath('total', 1)
            ->assertJsonPath('questions.0.is_correct', false)
            ->assertJsonPath('questions.0.test_results.0.passed', false)
            ->assertJsonCount(1, 'questions.0.test_results');
    }

    public function test_student_sees_only_visible_tests_and_starter_code(): void
    {
        $question = $this->codeQuestion();

        $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions")
            ->assertOk()
            ->assertJsonPath('0.code_config.language', 'py')
            ->assertJsonPath('0.code_config.starter_code', 'print(input())')
            ->assertJsonCount(1, '0.code_config.tests')
            ->assertJsonMissing(['expected_output' => 'secret'])
            ->assertJsonMissingPath('0.config');
    }

    public function test_teacher_sees_hidden_tests_in_the_config(): void
    {
        $question = $this->codeQuestion();

        $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions")
            ->assertOk()
            ->assertJsonPath('0.config.tests.1.expected_output', 'secret');
    }

    private function codeQuestion(): Question
    {
        return Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => 'Echo the input',
            'question_type' => 'code',
            'display_order' => 1,
            'config' => [
                'language' => 'py',
                'starter_code' => 'print(input())',
                'tests' => [
                    ['input' => "hello\n", 'expected_output' => 'hello'],
                    ['input' => "secret\n", 'expected_output' => 'secret', 'hidden' => true],
                ],
            ],
        ]);
    }
}
