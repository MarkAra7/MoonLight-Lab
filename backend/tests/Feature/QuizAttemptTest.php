<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuestionTypeSeeder;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizAttemptTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;

    protected User $student;

    protected Quiz $quiz;

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
            'title' => 'Grading',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'is_public' => true,
        ]);
    }

    public function test_it_grades_choice_and_short_answer_questions(): void
    {
        $single = $this->makeQuestion('single_choice');
        $correct = $this->makeAnswer($single, 'Riga', true);
        $this->makeAnswer($single, 'Vilnius', false);

        $multiple = $this->makeQuestion('multiple_choice');
        $first = $this->makeAnswer($multiple, 'Liepaja', true);
        $this->makeAnswer($multiple, 'Ventspils', true);
        $this->makeAnswer($multiple, 'Jelgava', false);

        $text = $this->makeQuestion('text_input', [
            'correct_text' => 'Daugava',
            'match_mode' => 'case_insensitive',
        ]);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $single->question_id, 'answer_id' => $correct->answer_id],
                    ['question_id' => $multiple->question_id, 'answer_ids' => [$first->answer_id]],
                    ['question_id' => $text->question_id, 'text' => 'daugava'],
                ],
            ]);

        // The multiple choice answer is only half right, so it scores nothing.
        $response->assertStatus(201)
            ->assertJsonPath('score', 2)
            ->assertJsonPath('total', 3)
            ->assertJsonPath('percentage', 67)
            ->assertJsonPath('questions.0.is_correct', true)
            ->assertJsonPath('questions.1.is_correct', false)
            ->assertJsonPath('questions.2.is_correct', true);

        $this->assertNotEmpty($correct->answer_id);
        $this->assertDatabaseCount('quiz_attempts', 1);
    }

    public function test_multiple_choice_accepts_every_correct_option(): void
    {
        $question = $this->makeQuestion('multiple_choice');
        $first = $this->makeAnswer($question, 'One', true);
        $second = $this->makeAnswer($question, 'Two', true);
        $this->makeAnswer($question, 'Three', false);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    [
                        'question_id' => $question->question_id,
                        'answer_ids' => [$second->answer_id, $first->answer_id],
                    ],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('score', 1)
            ->assertJsonPath('total', 1);
    }

    public function test_true_false_question_is_graded_against_the_picked_option(): void
    {
        $question = $this->makeQuestion('true_false');
        $this->makeAnswer($question, 'True', false);
        $wrong = $this->makeAnswer($question, 'False', true);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id, 'answer_id' => $wrong->answer_id],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('score', 1);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id, 'text' => 'False'],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('score', 0);
    }

    public function test_partial_match_mode_accepts_a_containing_answer(): void
    {
        $question = $this->makeQuestion('text_input', [
            'correct_text' => 'Riga',
            'match_mode' => 'partial',
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id, 'text' => 'the capital is Riga, Latvia'],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('score', 1);
    }

    public function test_theory_questions_are_not_scored(): void
    {
        $question = $this->makeQuestion('theory', ['content' => 'Read this first.']);

        $response = $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id],
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('score', 0)
            ->assertJsonPath('total', 0)
            ->assertJsonPath('percentage', 0);

        $this->assertNull($response->json('questions.0.is_correct'));
    }

    public function test_the_review_reveals_the_correct_answers(): void
    {
        $question = $this->makeQuestion('text_input', [
            'correct_text' => 'Daugava',
            'match_mode' => 'exact',
        ]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id, 'text' => 'wrong'],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('questions.0.correct_text', 'Daugava')
            ->assertJsonPath('questions.0.given_text', 'wrong');
    }

    public function test_a_private_quiz_cannot_be_attempted_by_another_user(): void
    {
        $this->quiz->update(['is_public' => false]);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", ['answers' => []])
            ->assertStatus(403);
    }

    public function test_an_attempt_is_recorded_for_the_signed_in_student(): void
    {
        $question = $this->makeQuestion('true_false');
        $correct = $this->makeAnswer($question, 'True', true);
        $this->makeAnswer($question, 'False', false);

        $this->actingAs($this->student, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/attempts", [
                'answers' => [
                    ['question_id' => $question->question_id, 'answer_id' => $correct->answer_id],
                ],
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('quiz_attempts', [
            'quiz_id' => $this->quiz->quiz_id,
            'student_id' => $this->student->id,
            'score' => 1,
            'total' => 1,
        ]);
    }

    public function test_takers_see_theory_content_but_not_correct_answers(): void
    {
        $this->makeQuestion('theory', ['content' => 'Read this first.']);
        $this->makeQuestion('text_input', ['correct_text' => 'Daugava', 'match_mode' => 'exact']);

        $response = $this->actingAs($this->student, 'sanctum')
            ->getJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions");

        $response->assertStatus(200)
            ->assertJsonPath('0.theory_content', 'Read this first.')
            ->assertJsonPath('1.theory_content', null);

        $this->assertArrayNotHasKey('correct_text', $response->json('1'));
        $this->assertArrayNotHasKey('config', $response->json('1'));
    }

    private function makeQuestion(string $type, array $config = []): Question
    {
        return Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => "A {$type} question",
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
}
