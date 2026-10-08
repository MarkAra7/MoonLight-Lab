<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Category;
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

class QuestionCrudTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;

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

        $this->quiz = Quiz::create([
            'title' => 'Original title',
            'author_id' => $this->teacher->id,
            'quiz_status_id' => QuizStatus::where('status', 'draft')->first()->quiz_status_id,
            'is_public' => false,
        ]);
    }

    public function test_text_input_question_stores_config_as_array(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions", [
                'question_text' => 'What is the longest river in Latvia?',
                'question_type' => 'text_input',
                'config' => [
                    'correct_text' => 'Daugava',
                    'match_mode' => 'case_insensitive',
                ],
            ]);

        $response->assertStatus(201);

        // The stored config must decode back to an array, not a JSON string.
        $stored = Question::find($response->json('question_id'));
        $this->assertIsArray($stored->config);
        $this->assertSame('Daugava', $stored->config['correct_text']);

        // The author-facing resource exposes the derived accessors.
        $this->assertSame('Daugava', $response->json('correct_text'));
        $this->assertSame('case_insensitive', $response->json('match_mode'));
    }

    public function test_theory_question_stores_content_in_config(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions", [
                'question_text' => 'Latvian Song Celebration',
                'question_type' => 'theory',
                'config' => ['content' => 'One of the largest choral events in the world.'],
            ]);

        $response->assertStatus(201);

        $stored = Question::find($response->json('question_id'));
        $this->assertIsArray($stored->config);
        $this->assertStringContainsString('choral events', $stored->config['content']);
    }

    public function test_question_config_can_be_updated(): void
    {
        $question = Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => 'River?',
            'question_type' => 'text_input',
            'display_order' => 1,
            'config' => ['correct_text' => 'Daugava', 'match_mode' => 'exact'],
        ]);

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/questions/{$question->question_id}", [
                'config' => ['correct_text' => 'Gauja', 'match_mode' => 'partial'],
            ])
            ->assertStatus(200)
            ->assertJsonPath('correct_text', 'Gauja')
            ->assertJsonPath('match_mode', 'partial');

        $this->assertSame('Gauja', $question->fresh()->config['correct_text']);
    }

    public function test_answer_config_round_trips(): void
    {
        $question = Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => 'Pick one',
            'question_type' => 'single_choice',
            'display_order' => 1,
        ]);

        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/v1/questions/{$question->question_id}/answers", [
                'answer_text' => 'Riga',
                'is_correct' => true,
                'config' => ['hint' => 'Capital city'],
            ]);

        $response->assertStatus(201);

        $answer = Answer::find($response->json('answer_id'));
        $this->assertIsArray($answer->config);
        $this->assertSame('Capital city', $answer->config['hint']);
    }

    public function test_question_is_created_with_expected_order(): void
    {
        $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions", [
                'question_text' => 'First',
                'question_type' => 'true_false',
            ])
            ->assertStatus(201)
            ->assertJsonPath('display_order', 1);

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions", [
                'question_text' => 'Second',
                'question_type' => 'true_false',
            ])
            ->assertStatus(201)
            ->assertJsonPath('display_order', 2);
    }

    public function test_reorder_endpoint_updates_display_order(): void
    {
        $first = Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => 'First',
            'question_type' => 'true_false',
            'display_order' => 1,
        ]);
        $second = Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => 'Second',
            'question_type' => 'true_false',
            'display_order' => 2,
        ]);

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions/reorder", [
                'questions' => [
                    ['question_id' => $second->question_id, 'display_order' => 1],
                    ['question_id' => $first->question_id, 'display_order' => 2],
                ],
            ])
            ->assertStatus(200);

        $this->assertSame(1, $second->fresh()->display_order);
        $this->assertSame(2, $first->fresh()->display_order);
    }

    public function test_deleting_question_removes_its_answers(): void
    {
        $question = Question::create([
            'quiz_id' => $this->quiz->quiz_id,
            'question_text' => 'Doomed',
            'question_type' => 'single_choice',
            'display_order' => 1,
        ]);
        $question->answers()->create([
            'answer_text' => 'Yes',
            'is_correct' => true,
            'display_order' => 1,
        ]);

        $this->actingAs($this->teacher, 'sanctum')
            ->deleteJson("/api/v1/questions/{$question->question_id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('questions', ['question_id' => $question->question_id]);
        $this->assertSame(0, Answer::where('question_id', $question->question_id)->count());
    }

    public function test_non_author_cannot_edit_questions(): void
    {
        $other = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);

        $this->actingAs($other, 'sanctum')
            ->postJson("/api/v1/quizzes/{$this->quiz->quiz_id}/questions", [
                'question_text' => 'Intruder',
                'question_type' => 'true_false',
            ])
            ->assertStatus(403);
    }

    public function test_quiz_can_be_created_with_status_difficulty_and_time_limit(): void
    {
        $category = Category::create(['name' => 'Geography']);

        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes', [
                'title' => 'Capitals of Europe',
                'description' => 'How well do you know them?',
                'category_id' => $category->category_id,
                'difficulty' => 'medium',
                'time_limit' => 15,
                'language' => 'en',
                'status' => 'published',
                'is_public' => true,
            ]);

        $response->assertStatus(201);

        $quiz = Quiz::find($response->json('quiz_id'));
        $this->assertSame('medium', $quiz->difficulty);
        $this->assertSame(15, $quiz->time_limit);
        $this->assertSame('en', $quiz->language);
        $this->assertSame('published', $quiz->quizStatus->status);
    }

    public function test_quiz_status_can_be_published_after_creation(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/quizzes/{$this->quiz->quiz_id}", [
                'title' => 'Renamed',
                'status' => 'published',
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('quiz_status.status', 'published');

        $this->assertSame('published', $this->quiz->fresh()->quizStatus->status);
    }

    public function test_quiz_show_returns_status_for_author(): void
    {
        $this->actingAs($this->teacher, 'sanctum')
            ->getJson("/api/v1/quizzes/{$this->quiz->quiz_id}")
            ->assertStatus(200)
            ->assertJsonPath('quiz_status.status', 'draft');
    }

    public function test_invalid_status_is_rejected(): void
    {
        $this->actingAs($this->teacher, 'sanctum')
            ->putJson("/api/v1/quizzes/{$this->quiz->quiz_id}", [
                'status' => 'nope',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('status');
    }
}
