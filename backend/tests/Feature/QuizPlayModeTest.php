<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuestionTypeSeeder;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizPlayModeTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);

        $this->teacher = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);
    }

    private function createQuiz(array $overrides = []): array
    {
        return $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes', array_merge([
                'title' => 'Play mode quiz',
                'status' => 'published',
                'is_public' => true,
            ], $overrides))
            ->assertStatus(201)
            ->json();
    }

    public function test_quiz_defaults_to_showing_all_questions_on_one_page(): void
    {
        $quiz = $this->createQuiz();

        $this->assertSame('all', $quiz['play_mode']);
        $this->assertSame('all', Quiz::findOrFail($quiz['quiz_id'])->play_mode);
    }

    public function test_author_can_choose_one_question_at_a_time(): void
    {
        $quiz = $this->createQuiz(['play_mode' => 'one_by_one']);

        $this->assertSame('one_by_one', $quiz['play_mode']);
        $this->assertSame('one_by_one', Quiz::findOrFail($quiz['quiz_id'])->play_mode);

        $this->actingAs($this->teacher, 'sanctum')
            ->putJson('/api/v1/quizzes/'.$quiz['quiz_id'], ['play_mode' => 'all'])
            ->assertOk()
            ->assertJsonPath('play_mode', 'all');

        $this->assertSame('all', Quiz::findOrFail($quiz['quiz_id'])->play_mode);
    }

    public function test_players_can_read_the_play_mode_without_seeing_author_config(): void
    {
        $quiz = $this->createQuiz(['play_mode' => 'one_by_one']);

        $student = User::factory()->create([
            'role_id' => Role::where('title', 'student')->first()->id,
        ]);

        $this->actingAs($student, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$quiz['quiz_id'])
            ->assertOk()
            ->assertJsonPath('play_mode', 'one_by_one')
            ->assertJsonMissingPath('config');
    }

    public function test_invalid_play_mode_is_rejected(): void
    {
        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes', [
                'title' => 'Broken play mode',
                'play_mode' => 'random',
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('play_mode');
    }

    public function test_import_and_export_round_trip_the_play_mode(): void
    {
        $this->seed(QuestionTypeSeeder::class);

        $import = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', [
                'title' => 'Imported play mode',
                'play_mode' => 'one_by_one',
                'questions' => [
                    [
                        'question_type' => 'single_choice',
                        'question_text' => 'Pick one',
                        'answers' => [
                            ['answer_text' => 'A', 'is_correct' => true],
                            ['answer_text' => 'B', 'is_correct' => false],
                        ],
                    ],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('play_mode', 'one_by_one')
            ->json();

        $export = $this->actingAs($this->teacher, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$import['quiz_id'].'/export')
            ->assertOk()
            ->assertJsonPath('play_mode', 'one_by_one')
            ->json();

        $copy = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $export)
            ->assertStatus(201)
            ->assertJsonPath('play_mode', 'one_by_one')
            ->json();

        $this->assertSame('one_by_one', Quiz::findOrFail($copy['quiz_id'])->play_mode);
    }
}
