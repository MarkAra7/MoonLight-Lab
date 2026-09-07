<?php

namespace Tests\Feature;

use App\Models\Answer;
use App\Models\Category;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizStatus;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\QuizStatusSeeder;
use Database\Seeders\RoleSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

class PartyTest extends TestCase
{
    use RefreshDatabase;

    protected User $host;

    protected Quiz $quiz;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(RoleSeeder::class);
        $this->seed(QuizStatusSeeder::class);

        $this->host = User::factory()->create([
            'role_id' => Role::where('title', 'teacher')->first()->id,
            'username' => 'partyhost',
            'email_verified_at' => now(),
        ]);

        $status = QuizStatus::where('status', 'published')->first();
        $category = Category::firstOrCreate(['name' => 'Science']);

        $this->quiz = Quiz::create([
            'title' => 'Party Quiz',
            'description' => 'Test party quiz',
            'author_id' => $this->host->id,
            'quiz_status_id' => $status->quiz_status_id,
            'category_id' => $category->category_id,
            'difficulty' => 'easy',
            'is_public' => true,
        ]);

        $q1 = Question::create(['quiz_id' => $this->quiz->quiz_id, 'question_text' => 'What is 2+2?', 'question_type' => 'multiple_choice', 'display_order' => 1]);
        $this->answer($q1, '4', true);
        $this->answer($q1, '5', false);
        $this->answer($q1, '6', false);

        $q2 = Question::create(['quiz_id' => $this->quiz->quiz_id, 'question_text' => 'The sky is blue.', 'question_type' => 'true_false', 'display_order' => 2]);
        $this->answer($q2, 'True', true);
        $this->answer($q2, 'False', false);
    }

    protected function answer(Question $question, string $text, bool $correct): void
    {
        Answer::create([
            'question_id' => $question->question_id,
            'answer_text' => $text,
            'is_correct' => $correct,
            'display_order' => $question->answers()->count() + 1,
        ]);
    }

    protected function createParty(bool $allowGuests = true, int $questionSeconds = 15): array
    {
        $response = $this->actingAs($this->host, 'sanctum')->postJson('/api/v1/parties', [
            'quiz_id' => $this->quiz->quiz_id,
            'allow_guests' => $allowGuests,
            'question_seconds' => $questionSeconds,
            'max_players' => 10,
        ]);

        $response->assertStatus(201);

        return $response->json();
    }

    protected function joinedPartyPayload(): array
    {
        $party = $this->createParty();
        $code = $party['party']['party_code'];

        $join = $this->joinAsGuest($code, 'Guest One');
        $join->assertStatus(201);

        return [$party, $join->json('player_token')];
    }

    protected function joinAsGuest(string $code, string $nickname): TestResponse
    {
        $this->app['auth']->forgetGuards();

        return $this->postJson('/api/v1/parties/join', ['code' => $code, 'nickname' => $nickname]);
    }

    public function test_host_can_create_party(): void
    {
        $party = $this->createParty();

        $this->assertNotNull($party['party']['party_code']);
        $this->assertSame('lobby', $party['party']['status']);
        $this->assertSame('partyhost', $party['player']['nickname']);
        $this->assertNotNull($party['player_token']);
    }

    public function test_guest_can_join_when_allowed(): void
    {
        [, $token] = $this->joinedPartyPayload();

        $this->assertNotNull($token);
    }

    public function test_guest_join_blocked_when_registered_only(): void
    {
        $party = $this->createParty(allowGuests: false);

        $this->joinAsGuest($party['party']['party_code'], 'Sneaky')->assertStatus(422)
            ->assertJsonPath('message', 'This party only allows registered users. Please log in.');
    }

    public function test_duplicate_nickname_rejected(): void
    {
        $party = $this->createParty();

        $this->joinAsGuest($party['party']['party_code'], 'Alice')->assertStatus(201);
        $this->joinAsGuest($party['party']['party_code'], 'alice')->assertStatus(422);
    }

    public function test_cannot_start_with_less_than_two_players(): void
    {
        $party = $this->createParty();

        $this->actingAs($this->host, 'sanctum')
            ->postJson('/api/v1/parties/'.$party['party']['party_code'].'/start')
            ->assertStatus(422)
            ->assertJsonPath('message', 'At least 2 players are needed to start.');
    }

    public function test_cannot_join_after_start(): void
    {
        [$party] = $this->joinedPartyPayload();
        $second = User::factory()->create(['role_id' => Role::where('title', 'student')->first()->id]);

        $this->actingAs($this->host, 'sanctum')
            ->postJson('/api/v1/parties/'.$party['party']['party_code'].'/start')
            ->assertOk();

        $this->actingAs($second, 'sanctum')
            ->postJson('/api/v1/parties/join', ['code' => $party['party']['party_code']])
            ->assertStatus(422)
            ->assertJsonPath('message', 'This party has already started.');
    }

    public function test_full_party_flow_with_scoring_and_ranks(): void
    {
        [$party, $guestToken] = $this->joinedPartyPayload();
        $partyId = $party['party']['party_code'];

        $this->actingAs($this->host, 'sanctum')->postJson('/api/v1/parties/'.$partyId.'/start')->assertOk();

        $state = $this->getJson('/api/v1/parties/'.$partyId.'/state')
            ->assertOk()
            ->json();

        $this->assertSame('playing', $state['phase']);
        $this->assertSame('What is 2+2?', $state['question']['question_text']);
        $this->assertCount(3, $state['question']['answers']);
        $this->assertSame(0, $state['answered_count']);

        $correctAnswer = $state['question']['answers'][0]['answer_id'];

        $answerResponse = $this->withHeader('X-Player-Token', $guestToken)
            ->postJson('/api/v1/parties/'.$partyId.'/answer', [
                'answer_id' => $correctAnswer,
                'answered_at_ms' => 500,
            ])
            ->assertOk()
            ->json();

        $this->assertTrue($answerResponse['is_correct']);
        $this->assertGreaterThan(100, $answerResponse['points']);

        $this->withHeader('X-Player-Token', $guestToken)
            ->postJson('/api/v1/parties/'.$partyId.'/answer', [
                'answer_id' => $correctAnswer,
                'answered_at_ms' => 500,
            ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'You already answered this question.');

        $this->actingAs($this->host, 'sanctum')->postJson('/api/v1/parties/'.$partyId.'/next')->assertOk();

        $state2 = $this->getJson('/api/v1/parties/'.$partyId.'/state')->json();
        $this->assertSame(1, $state2['question_index']);
        $this->assertSame('The sky is blue.', $state2['question']['question_text']);

        $this->withHeader('X-Player-Token', $guestToken)
            ->postJson('/api/v1/parties/'.$partyId.'/answer', [
                'answer_id' => $state2['question']['answers'][0]['answer_id'],
                'answered_at_ms' => 10000,
            ])
            ->assertOk();

        $this->actingAs($this->host, 'sanctum')
            ->postJson('/api/v1/parties/'.$partyId.'/next')
            ->assertOk()
            ->assertJsonPath('status', 'results');

        $results = $this->getJson('/api/v1/parties/'.$partyId.'/results')->assertOk()->json();

        $this->assertCount(2, $results['standings']);
        $this->assertSame('Guest One', $results['standings'][0]['nickname']);
        $this->assertSame(1, $results['standings'][0]['rank']);
        $this->assertSame(2, $results['standings'][0]['correct']);

        $hostStanding = collect($results['standings'])->firstWhere('nickname', 'partyhost');
        $this->assertSame(0, $hostStanding['correct']);
        $this->assertSame(2, $hostStanding['rank']);
    }

    public function test_anticheat_rejects_out_of_window_answers(): void
    {
        [$party, $guestToken] = $this->joinedPartyPayload();
        $partyId = $party['party']['party_code'];

        $this->actingAs($this->host, 'sanctum')->postJson('/api/v1/parties/'.$partyId.'/start')->assertOk();

        $state = $this->getJson('/api/v1/parties/'.$partyId.'/state')->json();
        $answerId = $state['question']['answers'][0]['answer_id'];

        $this->withHeader('X-Player-Token', $guestToken)
            ->postJson('/api/v1/parties/'.$partyId.'/answer', [
                'answer_id' => $answerId,
                'answered_at_ms' => 999999,
            ])
            ->assertStatus(422);

        $this->withHeader('X-Player-Token', $guestToken)
            ->postJson('/api/v1/parties/'.$partyId.'/answer', [
                'answer_id' => 'A-FAKE-ID',
                'answered_at_ms' => 1000,
            ])
            ->assertStatus(422);
    }

    public function test_host_can_kick_player_and_player_can_leave(): void
    {
        [$party, $guestToken] = $this->joinedPartyPayload();
        $partyId = $party['party']['party_code'];

        $state = $this->getJson('/api/v1/parties/'.$partyId.'/state')->json();
        $guest = collect($state['standings'])->firstWhere('nickname', 'Guest One');

        $this->actingAs($this->host, 'sanctum')
            ->deleteJson('/api/v1/parties/'.$partyId.'/players/'.$guest['id'])
            ->assertOk();

        $state = $this->getJson('/api/v1/parties/'.$partyId.'/state')->assertOk()->json();
        $this->assertCount(1, $state['standings']);
    }

    public function test_player_token_is_required_for_guest_answers(): void
    {
        [$party] = $this->joinedPartyPayload();
        $partyId = $party['party']['party_code'];

        $this->actingAs($this->host, 'sanctum')->postJson('/api/v1/parties/'.$partyId.'/start')->assertOk();

        $state = $this->getJson('/api/v1/parties/'.$partyId.'/state')->json();

        $this->app['auth']->forgetGuards();

        $this->postJson('/api/v1/parties/'.$partyId.'/answer', [
            'answer_id' => $state['question']['answers'][0]['answer_id'],
            'answered_at_ms' => 500,
        ])->assertStatus(422);
    }
}
