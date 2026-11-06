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

class QuizExportTest extends TestCase
{
    use RefreshDatabase;

    private User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);
        $this->seed(QuestionTypeSeeder::class);

        $this->teacher = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);
    }

    private function importPayload(): array
    {
        return [
            'title' => 'Latvia: Geography, History & Culture',
            'description' => 'Test your knowledge about Latvia.',
            'difficulty' => 'medium',
            'time_limit' => 10,
            'questions' => [
                [
                    'question_type' => 'single_choice',
                    'question_text' => 'What is the capital of Latvia?',
                    'answers' => [
                        ['answer_text' => 'Riga', 'is_correct' => true],
                        ['answer_text' => 'Jelgava', 'is_correct' => false],
                        ['answer_text' => 'Liepaja', 'is_correct' => false],
                    ],
                ],
                [
                    'question_type' => 'text_input',
                    'question_text' => 'What is the longest river in Latvia?',
                    'correct_text' => 'Daugava',
                    'match_mode' => 'case_insensitive',
                ],
                [
                    'question_type' => 'theory',
                    'question_text' => 'Latvian Song Celebration',
                    'config' => [
                        'content' => 'The Latvian Song and Dance Festival is one of the largest choral events in the world.',
                    ],
                ],
            ],
        ];
    }

    private function importQuiz(): array
    {
        return $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $this->importPayload())
            ->assertStatus(201)
            ->json();
    }

    public function test_author_can_export_a_quiz_in_the_import_format(): void
    {
        $quiz = $this->importQuiz();

        $export = $this->actingAs($this->teacher, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$quiz['quiz_id'].'/export')
            ->assertOk()
            ->assertJsonPath('format', 'moonlight-quiz')
            ->assertJsonPath('version', 1)
            ->assertJsonPath('title', 'Latvia: Geography, History & Culture')
            ->assertJsonPath('difficulty', 'medium')
            ->assertJsonPath('time_limit', 10)
            ->assertJsonPath('is_public', false)
            ->assertJsonCount(3, 'questions')
            ->json();

        $single = collect($export['questions'])->firstWhere('question_type', 'single_choice');
        $this->assertCount(3, $single['answers']);
        $this->assertSame(1, collect($single['answers'])->where('is_correct', true)->count());

        $text = collect($export['questions'])->firstWhere('question_type', 'text_input');
        $this->assertSame('Daugava', $text['correct_text']);
        $this->assertSame('case_insensitive', $text['match_mode']);
        $this->assertArrayNotHasKey('answers', $text);

        $theory = collect($export['questions'])->firstWhere('question_type', 'theory');
        $this->assertStringContainsString('Song and Dance Festival', $theory['config']['content']);
    }

    public function test_an_exported_quiz_can_be_imported_again(): void
    {
        $quiz = $this->importQuiz();

        $export = $this->actingAs($this->teacher, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$quiz['quiz_id'].'/export')
            ->assertOk()
            ->json();

        $copy = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $export)
            ->assertStatus(201)
            ->assertJsonPath('title', 'Latvia: Geography, History & Culture')
            ->json();

        $this->assertNotSame($quiz['quiz_id'], $copy['quiz_id']);
        $this->assertCount(3, $copy['questions']);
        $this->assertSame('draft', Quiz::findOrFail($copy['quiz_id'])->quizStatus->status);
    }

    public function test_other_users_cannot_export_a_quiz(): void
    {
        $quiz = $this->importQuiz();

        $otherTeacher = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);

        $this->actingAs($otherTeacher, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$quiz['quiz_id'].'/export')
            ->assertStatus(403);
    }

    public function test_guests_cannot_export_a_quiz(): void
    {
        $quiz = $this->importQuiz();

        // actingAs() above only affects this test instance; drop the guard so
        // the next request really is a guest request.
        $this->app['auth']->forgetGuards();

        $this->getJson('/api/v1/quizzes/'.$quiz['quiz_id'].'/export')
            ->assertStatus(401);
    }
}
