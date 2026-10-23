<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Comment;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class QuizSecurityTest extends TestCase
{
    use RefreshDatabase;

    protected User $author;

    protected User $other;

    protected Quiz $publicQuiz;

    protected Quiz $privateQuiz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);

        $this->author = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
        ]);

        $this->other = User::factory()->create([
            'role_id' => Role::where('title', 'student')->first()->id,
        ]);

        $status = QuizStatus::where('status', 'published')->first();
        $category = Category::firstOrCreate(['name' => 'Science']);

        $this->publicQuiz = Quiz::create([
            'title' => 'Public Quiz',
            'description' => 'Open to everyone',
            'author_id' => $this->author->id,
            'quiz_status_id' => $status->quiz_status_id,
            'category_id' => $category->category_id,
            'difficulty' => 'easy',
            'is_public' => true,
        ]);

        $this->privateQuiz = Quiz::create([
            'title' => 'Private Quiz',
            'description' => 'Only for the author',
            'author_id' => $this->author->id,
            'quiz_status_id' => $status->quiz_status_id,
            'category_id' => $category->category_id,
            'difficulty' => 'easy',
            'is_public' => false,
        ]);
    }

    public function test_code_runner_requires_authentication(): void
    {
        $this->postJson('/api/v1/run-code', [
            'code' => 'print(1)',
            'language' => 'py',
        ])->assertStatus(401);
    }

    public function test_code_runner_does_not_leak_exception_details(): void
    {
        Http::fake(function () {
            throw new ConnectionException('Secret internal host: refused');
        });

        $this->actingAs($this->other, 'sanctum')
            ->postJson('/api/v1/run-code', [
                'code' => 'print(1)',
                'language' => 'py',
            ])
            ->assertStatus(502)
            ->assertJsonPath('error', 'Could not reach the execution service. Please try again.')
            ->assertDontSee('Secret internal host');
    }

    public function test_quiz_stats_are_only_visible_to_the_author(): void
    {
        $this->actingAs($this->other, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$this->publicQuiz->quiz_id.'/stats')
            ->assertStatus(403);

        $this->actingAs($this->author, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$this->publicQuiz->quiz_id.'/stats')
            ->assertOk()
            ->assertJsonPath('quiz.quiz_id', $this->publicQuiz->quiz_id);
    }

    public function test_quiz_stats_require_authentication(): void
    {
        $this->getJson('/api/v1/quizzes/'.$this->publicQuiz->quiz_id.'/stats')
            ->assertStatus(401);
    }

    public function test_class_code_lookup_is_rate_limited(): void
    {
        for ($attempt = 1; $attempt <= 20; $attempt++) {
            $this->getJson('/api/v1/classes/lookup/NOPE00')->assertStatus(404);
        }

        $this->getJson('/api/v1/classes/lookup/NOPE00')->assertStatus(429);
    }

    public function test_private_quiz_rejects_ratings_and_comments(): void
    {
        $this->actingAs($this->other, 'sanctum')
            ->postJson('/api/v1/quizzes/'.$this->privateQuiz->quiz_id.'/ratings', ['rating' => 5])
            ->assertStatus(403);

        $this->actingAs($this->other, 'sanctum')
            ->postJson('/api/v1/quizzes/'.$this->privateQuiz->quiz_id.'/comments', ['body' => 'Hello'])
            ->assertStatus(403);

        $this->actingAs($this->other, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$this->privateQuiz->quiz_id.'/ratings')
            ->assertStatus(403);

        $this->actingAs($this->other, 'sanctum')
            ->getJson('/api/v1/quizzes/'.$this->privateQuiz->quiz_id.'/comments')
            ->assertStatus(403);
    }

    public function test_comment_reply_must_belong_to_the_same_quiz(): void
    {
        $this->actingAs($this->other, 'sanctum')
            ->postJson('/api/v1/quizzes/'.$this->publicQuiz->quiz_id.'/comments', ['body' => 'On the public quiz'])
            ->assertStatus(201);

        $foreignCommentId = Comment::where('quiz_id', $this->publicQuiz->quiz_id)->value('comment_id');

        $this->actingAs($this->other, 'sanctum')
            ->postJson('/api/v1/quizzes/'.$this->privateQuiz->quiz_id.'/comments', [
                'body' => 'Cross-quiz reply',
                'parent_id' => $foreignCommentId,
            ])
            ->assertStatus(403);

        $this->actingAs($this->author, 'sanctum')
            ->postJson('/api/v1/quizzes/'.$this->privateQuiz->quiz_id.'/comments', [
                'body' => 'Cross-quiz reply',
                'parent_id' => $foreignCommentId,
            ])
            ->assertStatus(422)
            ->assertJsonValidationErrors('parent_id');
    }

    public function test_repeated_views_from_one_device_only_count_once(): void
    {
        $url = '/api/v1/quizzes/'.$this->publicQuiz->quiz_id.'/views';

        $this->postJson($url)->assertOk()->assertJsonPath('views', 1);
        $this->postJson($url)->assertOk()->assertJsonPath('views', 1);
        $this->postJson($url)->assertOk()->assertJsonPath('views', 1);

        $this->assertSame(1, (int) $this->publicQuiz->fresh()->views);
    }
}
