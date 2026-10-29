<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VerifiedEmailTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);
    }

    private function user(string $role = 'student', bool $verified = false): User
    {
        return User::factory()->create([
            'role_id' => Role::where('title', $role)->first()->id,
            'email_verified_at' => $verified ? now() : null,
        ]);
    }

    private function publishedQuiz(User $author): Quiz
    {
        return Quiz::create([
            'title' => 'Test quiz',
            'description' => 'A quiz used by the verification tests.',
            'author_id' => $author->id,
            'quiz_status_id' => QuizStatus::where('status', 'published')->first()->quiz_status_id,
            'category_id' => Category::firstOrCreate(['name' => 'Science'])->category_id,
            'difficulty' => 'easy',
            'is_public' => true,
        ]);
    }

    private function assertVerificationRequired($response): void
    {
        $response->assertStatus(403)
            ->assertJsonPath('message', 'Verify your email address before creating content.');
    }

    public function test_unverified_user_cannot_create_a_quiz(): void
    {
        $this->actingAs($this->user(), 'sanctum')
            ->postJson('/api/v1/quizzes', ['title' => 'Blocked quiz'])
            ->tap(fn ($response) => $this->assertVerificationRequired($response));

        $this->assertDatabaseMissing('quizzes', ['title' => 'Blocked quiz']);
    }

    public function test_verified_user_can_create_a_quiz(): void
    {
        $category = Category::firstOrCreate(['name' => 'Science']);

        $this->actingAs($this->user(verified: true), 'sanctum')
            ->postJson('/api/v1/quizzes', [
                'title' => 'Allowed quiz',
                'category_id' => $category->category_id,
                'difficulty' => 'easy',
                'status' => 'draft',
            ])
            ->assertStatus(201);

        $this->assertDatabaseHas('quizzes', ['title' => 'Allowed quiz']);
    }

    public function test_unverified_user_cannot_import_a_quiz(): void
    {
        $this->actingAs($this->user(), 'sanctum')
            ->postJson('/api/v1/quizzes/import-json', ['title' => 'Blocked import'])
            ->tap(fn ($response) => $this->assertVerificationRequired($response));
    }

    public function test_unverified_user_cannot_add_a_question(): void
    {
        $author = $this->user();
        $quiz = $this->publishedQuiz($author);

        $this->actingAs($author, 'sanctum')
            ->postJson('/api/v1/quizzes/'.$quiz->quiz_id.'/questions', [
                'question_text' => 'Blocked question?',
                'question_type' => 'multiple_choice',
            ])
            ->tap(fn ($response) => $this->assertVerificationRequired($response));

        $this->assertDatabaseMissing('questions', ['question_text' => 'Blocked question?']);
    }

    public function test_unverified_user_cannot_add_an_answer(): void
    {
        $author = $this->user();
        $quiz = $this->publishedQuiz($author);
        $question = Question::create([
            'quiz_id' => $quiz->quiz_id,
            'question_text' => 'Existing question?',
            'question_type' => 'multiple_choice',
            'display_order' => 1,
        ]);

        $this->actingAs($author, 'sanctum')
            ->postJson('/api/v1/questions/'.$question->question_id.'/answers', [
                'answer_text' => 'Blocked answer',
                'is_correct' => true,
            ])
            ->tap(fn ($response) => $this->assertVerificationRequired($response));

        $this->assertDatabaseMissing('answers', ['answer_text' => 'Blocked answer']);
    }

    public function test_unverified_teacher_cannot_create_a_class(): void
    {
        $this->actingAs($this->user('teacher'), 'sanctum')
            ->postJson('/api/v1/teacher/classes', ['name' => 'Blocked class'])
            ->tap(fn ($response) => $this->assertVerificationRequired($response));

        $this->assertDatabaseMissing('classes', ['name' => 'Blocked class']);
    }

    public function test_unverified_teacher_cannot_create_an_assignment(): void
    {
        $this->actingAs($this->user('teacher'), 'sanctum')
            ->postJson('/api/v1/teacher/assignments', ['title' => 'Blocked assignment'])
            ->tap(fn ($response) => $this->assertVerificationRequired($response));
    }

    public function test_unverified_user_cannot_host_a_party(): void
    {
        $host = $this->user();
        $quiz = $this->publishedQuiz($host);
        Question::create([
            'quiz_id' => $quiz->quiz_id,
            'question_text' => 'Ready?',
            'question_type' => 'true_false',
            'display_order' => 1,
        ]);

        $this->actingAs($host, 'sanctum')
            ->postJson('/api/v1/parties', ['quiz_id' => $quiz->quiz_id])
            ->tap(fn ($response) => $this->assertVerificationRequired($response));

        $this->assertDatabaseCount('parties', 0);
    }
}
