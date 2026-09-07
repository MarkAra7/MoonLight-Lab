<?php

namespace App\Http\Controllers\Api\V1\Party;

use App\Http\Controllers\Controller;
use App\Models\Party;
use App\Models\PartyAnswer;
use App\Models\PartyPlayer;
use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PartyController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'quiz_id' => ['required', 'string', 'exists:quizzes,quiz_id'],
            'allow_guests' => ['sometimes', 'boolean'],
            'question_seconds' => ['sometimes', 'integer', 'min:5', 'max:60'],
            'max_players' => ['sometimes', 'integer', 'min:2', 'max:50'],
        ]);

        $quiz = Quiz::withCount('questions')->findOrFail($data['quiz_id']);

        Gate::authorize('view', $quiz);

        if ($quiz->questions_count < 1) {
            return response()->json(['message' => 'The quiz has no questions.'], 422);
        }

        $party = Party::create([
            'party_code' => $this->uniqueCode(),
            'host_id' => $request->user()->id,
            'quiz_id' => $quiz->quiz_id,
            'status' => Party::STATUS_LOBBY,
            'question_seconds' => $data['question_seconds'] ?? 15,
            'max_players' => $data['max_players'] ?? 20,
            'settings' => [
                'allow_guests' => (bool) ($data['allow_guests'] ?? false),
            ],
        ]);

        $host = PartyPlayer::create([
            'party_id' => $party->id,
            'user_id' => $request->user()->id,
            'nickname' => $request->user()->username,
            'nickname_slug' => $this->slug($request->user()->username),
            'player_token' => $this->playerToken(),
        ]);

        return response()->json([
            'party' => $party,
            'player' => $host,
            'player_token' => $host->player_token,
        ], 201);
    }

    public function join(Request $request): JsonResponse
    {
        $data = $request->validate([
            'code' => ['required', 'string', 'size:6', Rule::exists('parties', 'party_code')],
            'nickname' => ['nullable', 'string'],
        ]);

        $party = Party::where('party_code', Str::upper($data['code']))->firstOrFail();

        if ($party->status !== Party::STATUS_LOBBY) {
            return response()->json(['message' => 'This party has already started.'], 422);
        }

        $user = $request->user();

        if ($user) {
            $existing = PartyPlayer::where('party_id', $party->id)->where('user_id', $user->id)->first();

            if ($existing) {
                return response()->json([
                    'party' => $party,
                    'player' => $existing,
                    'player_token' => $existing->player_token,
                    'already_joined' => true,
                ]);
            }
        }

        if (! $party->allowsGuests() && ! $user) {
            return response()->json(['message' => 'This party only allows registered users. Please log in.'], 422);
        }

        $nickname = $user ? $user->username : Str::limit(trim($data['nickname'] ?? ''), 20);
        $nickname = $nickname ?: 'guest-'.strtoupper(Str::random(4));

        if (! $user && ! preg_match('/^[\p{L}\p{N}_\- ]{2,20}$/u', $nickname)) {
            return response()->json(['message' => 'Nickname must be 2-20 characters (letters, numbers, spaces, - or _).'], 422);
        }

        $slug = $this->slug($nickname);

        if (PartyPlayer::where('party_id', $party->id)->where('nickname_slug', $slug)->exists()) {
            return response()->json(['message' => 'That nickname is already taken in this party.'], 422);
        }

        if ($party->players()->count() >= $party->max_players) {
            return response()->json(['message' => 'This party is full.'], 422);
        }

        if (! $this->joinAllowedForIp($request, $party)) {
            return response()->json(['message' => 'Too many connections from this device. Suspicious activity blocked.'], 429);
        }

        $player = PartyPlayer::create([
            'party_id' => $party->id,
            'user_id' => $user?->id,
            'nickname' => $nickname,
            'nickname_slug' => $slug,
            'player_token' => $this->playerToken(),
        ]);

        Log::info('Party join', ['party_id' => $party->id, 'player_id' => $player->id, 'nickname' => $nickname, 'registered' => (bool) $user]);

        return response()->json([
            'party' => $party,
            'player' => $player,
            'player_token' => $player->player_token,
        ], 201);
    }

    public function start(Request $request, Party $party): JsonResponse
    {
        $this->authorizeHost($request, $party);

        if ($party->status !== Party::STATUS_LOBBY) {
            return response()->json(['message' => 'Party already started.'], 422);
        }

        if ($party->players()->count() < 2) {
            return response()->json(['message' => 'At least 2 players are needed to start.'], 422);
        }

        $party->update([
            'status' => Party::STATUS_PLAYING,
            'current_question_index' => 0,
            'question_started_at' => now(),
        ]);

        return response()->json(['message' => 'Party started.']);
    }

    public function next(Request $request, Party $party): JsonResponse
    {
        $this->authorizeHost($request, $party);

        if ($party->status !== Party::STATUS_PLAYING) {
            return response()->json(['message' => 'Party is not in progress.'], 422);
        }

        $total = $party->quiz->questions()->count();
        $nextIndex = $party->current_question_index + 1;

        if ($nextIndex >= $total) {
            $this->finalizeRanks($party);
            $party->update(['status' => Party::STATUS_RESULTS]);

            return response()->json(['message' => 'Party finished.', 'status' => Party::STATUS_RESULTS]);
        }

        $party->update([
            'current_question_index' => $nextIndex,
            'question_started_at' => now(),
        ]);

        return response()->json(['message' => 'Next question.', 'question_index' => $nextIndex]);
    }

    public function state(Request $request, Party $party): JsonResponse
    {
        $player = $this->resolvePlayer($request, $party);

        return response()->json($this->buildState($party, $player));
    }

    public function answer(Request $request, Party $party): JsonResponse
    {
        $player = $this->resolvePlayer($request, $party);

        if (! $player) {
            return response()->json(['message' => 'Player not found in this party.'], 422);
        }

        if ($party->status !== Party::STATUS_PLAYING) {
            return response()->json(['message' => 'No question is active right now.'], 422);
        }

        $data = $request->validate([
            'answer_id' => ['required', 'string'],
            'answered_at_ms' => ['required', 'integer'],
        ]);

        $questionIndex = $party->current_question_index;
        $question = $party->quiz->questions()->skip($questionIndex)->first();

        if (! $question) {
            return response()->json(['message' => 'Question not found.'], 422);
        }

        $answer = $question->answers()->find($data['answer_id']);

        if (! $answer) {
            return response()->json(['message' => 'Invalid answer for this question.'], 422);
        }

        $maxMs = $party->question_seconds * 1000;

        if ($data['answered_at_ms'] < -500 || $data['answered_at_ms'] > $maxMs + 500) {
            return response()->json(['message' => 'Answer time is out of range. Anti-cheat triggered.'], 422);
        }

        if ($party->questionExpired() && $data['answered_at_ms'] >= $maxMs) {
            return response()->json(['message' => 'Time is up for this question.'], 422);
        }

        $already = PartyAnswer::where('player_id', $player->id)
            ->where('question_index', $questionIndex)
            ->exists();

        if ($already) {
            return response()->json(['message' => 'You already answered this question.'], 422);
        }

        $points = 0;
        if ($answer->is_correct && ! $party->questionExpired()) {
            $timeLeft = max(0, $maxMs - $data['answered_at_ms']);
            $speedBonus = (int) round(($timeLeft / $maxMs) * 100);
            $points = 100 + $speedBonus;
        }

        $partyAnswer = PartyAnswer::create([
            'party_id' => $party->id,
            'player_id' => $player->id,
            'question_index' => $questionIndex,
            'answer_id' => $answer->answer_id,
            'is_correct' => $answer->is_correct,
            'points' => $points,
            'answered_at_ms' => $data['answered_at_ms'],
        ]);

        $player->increment('score', $points);
        $player->increment('total');
        if ($answer->is_correct) {
            $player->increment('correct');
        }
        $player->increment('total_time_ms', max(0, $data['answered_at_ms']));

        return response()->json([
            'message' => $answer->is_correct ? 'Correct!' : 'Wrong!',
            'is_correct' => (bool) $answer->is_correct,
            'points' => $points,
            'correct_answer_id' => $answer->is_correct ? null : $answer->answer_id,
        ]);
    }

    public function results(Request $request, Party $party): JsonResponse
    {
        if ($party->status !== Party::STATUS_RESULTS) {
            return response()->json(['message' => 'Party is not finished yet.'], 422);
        }

        $player = $this->resolvePlayer($request, $party);

        return response()->json([
            'party' => $party,
            'standings' => $party->players()
                ->orderBy('rank')
                ->orderByDesc('score')
                ->get(['nickname', 'score', 'correct', 'total', 'rank'])
                ->map(fn ($p) => ['nickname' => $p->nickname, 'score' => $p->score, 'correct' => $p->correct, 'total' => $p->total, 'rank' => $p->rank]),
            'my_rank' => $player?->rank,
            'my_score' => $player?->score,
        ]);
    }

    public function kick(Request $request, Party $party, PartyPlayer $player): JsonResponse
    {
        $this->authorizeHost($request, $party);

        if ($player->party_id !== $party->id) {
            abort(404);
        }

        $player->delete();

        Log::info('Player kicked from party', ['party_id' => $party->id, 'player_id' => $player->id, 'kicked_by' => $request->user()->id]);

        return response()->json(['message' => 'Player removed.']);
    }

    public function leave(Request $request, Party $party): JsonResponse
    {
        $player = $this->resolvePlayer($request, $party);

        if (! $player) {
            return response()->json(['message' => 'Player not found in this party.'], 422);
        }

        if ($party->host_id === $player->user_id) {
            $party->update(['status' => Party::STATUS_CANCELLED]);
            PartyPlayer::where('party_id', $party->id)->delete();

            return response()->json(['message' => 'Party cancelled.']);
        }

        $player->delete();

        return response()->json(['message' => 'You left the party.']);
    }

    protected function authorizeHost(Request $request, Party $party): void
    {
        abort_unless($request->user() && $party->host_id === $request->user()->id, 403, 'Only the host can do that.');
    }

    protected function resolvePlayer(Request $request, Party $party): ?PartyPlayer
    {
        $token = $request->header('X-Player-Token') ?: $request->query('player_token') ?: $request->input('player_token');

        if ($token) {
            return PartyPlayer::where('party_id', $party->id)->where('player_token', $token)->first();
        }

        if ($request->user()) {
            return PartyPlayer::where('party_id', $party->id)->where('user_id', $request->user()->id)->first();
        }

        return null;
    }

    protected function buildState(Party $party, ?PartyPlayer $player): array
    {
        $total = $party->quiz->questions()->count();
        $answeredCount = 0;
        $question = null;
        $questionEndsAt = null;

        if ($party->status === Party::STATUS_PLAYING && $party->quiz) {
            $question = $party->quiz->questions()->skip($party->current_question_index)->first();

            $answeredCount = $party->players()
                ->whereHas('answers', fn ($q) => $q->where('question_index', $party->current_question_index))
                ->count();

            if ($question) {
                $questionEndsAt = $party->questionEndsAt()?->toIso8601String();
            }
        }

        return [
            'party' => [
                'id' => $party->id,
                'party_code' => $party->party_code,
                'status' => $party->status,
                'allow_guests' => $party->allowsGuests(),
                'question_seconds' => $party->question_seconds,
                'max_players' => $party->max_players,
                'host_nickname' => $party->host?->username,
                'host_id' => $party->host_id,
                'quiz_title' => $party->quiz?->title,
            ],
            'player' => $player ? [
                'id' => $player->id,
                'nickname' => $player->nickname,
                'score' => $player->score,
                'correct' => $player->correct,
                'total' => $player->total,
                'rank' => $player->rank,
                'is_host' => $party->host_id === $player->user_id,
                'is_registered' => (bool) $player->user_id,
                'player_token' => $player->player_token,
            ] : null,
            'phase' => $party->status,
            'question_index' => $party->current_question_index,
            'total_questions' => $total,
            'question' => $question ? [
                'question_text' => $question->question_text,
                'question_type' => $question->question_type,
                'answers' => $question->answers()->orderBy('display_order')->get(['answer_id', 'answer_text']),
            ] : null,
            'question_end_at' => $questionEndsAt,
            'answered_count' => $answeredCount,
            'players_count' => $party->players()->count(),
            'standings' => $party->players()
                ->orderByDesc('score')
                ->orderBy('total_time_ms')
                ->get(['id', 'nickname', 'score', 'correct', 'total'])
                ->map(fn ($p) => ['id' => $p->id, 'nickname' => $p->nickname, 'score' => $p->score, 'correct' => $p->correct, 'total' => $p->total]),
        ];
    }

    protected function finalizeRanks(Party $party): void
    {
        $ranked = $party->players()
            ->orderByDesc('score')
            ->orderBy('total_time_ms')
            ->get();

        foreach ($ranked as $index => $player) {
            $player->update(['rank' => $index + 1]);
        }
    }

    protected function joinAllowedForIp(Request $request, Party $party): bool
    {
        $ip = $request->ip();
        $key = "party_join_{$party->id}_{$ip}";
        $joined = (int) Cache::get($key, 0);

        if ($joined >= 3) {
            return false;
        }

        Cache::put($key, $joined + 1, now()->addMinutes(10));

        return true;
    }

    protected function slug(string $nickname): string
    {
        return Str::lower(Str::slug($nickname, '_'));
    }

    protected function playerToken(): string
    {
        return bin2hex(random_bytes(32));
    }

    protected function uniqueCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (Party::where('party_code', $code)->exists());

        return $code;
    }
}
