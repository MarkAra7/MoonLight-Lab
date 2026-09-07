<?php

namespace Tests\Feature;

use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QuizImportTest extends TestCase
{
    use RefreshDatabase;

    protected User $teacher;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);

        $this->teacher = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);
    }

    protected function importPayload(): array
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
                    'question_type' => 'multiple_choice',
                    'question_text' => 'Which countries border Latvia?',
                    'answers' => [
                        ['answer_text' => 'Estonia', 'is_correct' => true],
                        ['answer_text' => 'Lithuania', 'is_correct' => true],
                        ['answer_text' => 'Poland', 'is_correct' => false],
                    ],
                ],
                [
                    'question_type' => 'true_false',
                    'question_text' => 'Riga is a UNESCO World Heritage site.',
                    'answers' => [
                        ['answer_text' => 'True', 'is_correct' => true],
                        ['answer_text' => 'False', 'is_correct' => false],
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

    public function test_imports_mixed_question_types(): void
    {
        $response = $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $this->importPayload());

        $response->assertStatus(201);

        $quiz = $response->json();
        $this->assertCount(5, $quiz['questions']);

        $types = collect($quiz['questions'])->pluck('question_type')->all();
        $this->assertSame(['single_choice', 'multiple_choice', 'true_false', 'text_input', 'theory'], $types);

        $text = collect($quiz['questions'])->firstWhere('question_type', 'text_input');
        $this->assertSame('Daugava', $text['correct_text']);
        $this->assertSame('case_insensitive', $text['match_mode']);
        $this->assertEmpty($text['answers']);

        $theory = collect($quiz['questions'])->firstWhere('question_type', 'theory');
        $this->assertStringContainsString('Song and Dance Festival', $theory['config']['content']);
        $this->assertEmpty($theory['answers']);

        $single = collect($quiz['questions'])->firstWhere('question_type', 'single_choice');
        $this->assertCount(3, $single['answers']);
    }

    public function test_text_input_with_empty_answers_array_is_accepted(): void
    {
        $payload = $this->importPayload();
        $payload['questions'][3] = [
            'question_type' => 'text_input',
            'question_text' => 'What is the longest river in Latvia?',
            'correct_text' => 'Daugava',
            'match_mode' => 'case_insensitive',
            'answers' => [],
        ];
        $payload['questions'][4]['answers'] = [];

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $payload)
            ->assertStatus(201);
    }

    public function test_choice_question_with_less_than_two_answers_rejected(): void
    {
        $payload = $this->importPayload();
        $payload['questions'][0] = [
            'question_type' => 'single_choice',
            'question_text' => 'What is the capital of Latvia?',
            'answers' => [
                ['answer_text' => 'Riga', 'is_correct' => true],
            ],
        ];

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $payload)
            ->assertStatus(422)
            ->assertJsonPath('message', 'Question "What is the capital of Latvia?" needs at least 2 answers.');
    }

    public function test_text_input_requires_correct_text(): void
    {
        $payload = $this->importPayload();
        $payload['questions'][3] = [
            'question_type' => 'text_input',
            'question_text' => 'What is the longest river in Latvia?',
        ];

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $payload)
            ->assertStatus(422);
    }

    public function test_theory_requires_content(): void
    {
        $payload = $this->importPayload();
        $payload['questions'][4] = [
            'question_type' => 'theory',
            'question_text' => 'Latvian Song Celebration',
        ];

        $this->actingAs($this->teacher, 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', $payload)
            ->assertStatus(422);
    }
}
