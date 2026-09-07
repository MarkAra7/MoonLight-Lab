<?php

namespace App\Http\Controllers\Api\V1\Quiz;

use App\Http\Controllers\Controller;
use App\Http\Requests\ImportQuizRequest;
use App\Models\Answer;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizStatus;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class AiQuizController extends Controller
{
    public function import(ImportQuizRequest $request): JsonResponse
    {
        Gate::authorize('create', Quiz::class);

        try {
            $result = DB::transaction(function () use ($request) {
                $status = QuizStatus::firstOrCreate(['status' => 'draft']);

                $quiz = Quiz::create([
                    'title' => $request->title,
                    'description' => $request->description,
                    'author_id' => $request->user()->id,
                    'quiz_status_id' => $status->quiz_status_id,
                    'category_id' => $request->category_id,
                    'difficulty' => $request->difficulty,
                    'time_limit' => $request->time_limit,
                    'language' => $request->language ?? 'en',
                    'is_public' => $request->boolean('is_public'),
                ]);

                $choiceTypes = ['single_choice', 'multiple_choice', 'true_false'];

                foreach ($request->questions as $qData) {
                    $type = $qData['question_type'];

                    if (in_array($type, $choiceTypes) && count($qData['answers'] ?? []) < 2) {
                        throw ValidationException::withMessages([
                            'questions' => "Question \"{$qData['question_text']}\" needs at least 2 answers.",
                        ]);
                    }

                    if ($type === 'text_input' && empty($qData['correct_text'] ?? '') && empty($qData['config']['correct_text'] ?? '')) {
                        throw ValidationException::withMessages([
                            'questions' => 'Text input questions need a "correct_text" field.',
                        ]);
                    }

                    if ($type === 'theory' && empty($qData['config']['content'] ?? '') && empty($qData['content'] ?? '')) {
                        throw ValidationException::withMessages([
                            'questions' => 'Theory questions need a "config" object with "content".',
                        ]);
                    }

                    $config = null;

                    if (($qData['question_type'] ?? null) === 'text_input') {
                        $config = [
                            'correct_text' => $qData['correct_text'] ?? ($qData['config']['correct_text'] ?? null),
                            'match_mode' => $qData['match_mode'] ?? 'case_insensitive',
                        ];
                    } elseif (($qData['question_type'] ?? null) === 'theory') {
                        $config = [
                            'content' => $qData['config']['content'] ?? ($qData['content'] ?? ''),
                        ];
                    }

                    $question = Question::create([
                        'quiz_id' => $quiz->quiz_id,
                        'question_text' => $qData['question_text'],
                        'question_type' => $qData['question_type'],
                        'display_order' => $qData['display_order'] ?? 0,
                        'config' => $config,
                    ]);

                    foreach ($qData['answers'] ?? [] as $aData) {
                        Answer::create([
                            'question_id' => $question->question_id,
                            'answer_text' => $aData['answer_text'],
                            'is_correct' => $aData['is_correct'],
                            'display_order' => $aData['display_order'] ?? 0,
                        ]);
                    }
                }

                return $quiz->load(['category', 'media', 'author', 'questions.answers']);
            });

            return response()->json($result, 201);
        } catch (ValidationException $e) {
            throw $e;
        } catch (\Throwable $e) {
            Log::error('Quiz import failed', ['error' => $e->getMessage()]);

            return response()->json([
                'message' => 'Quiz import failed: '.$e->getMessage(),
            ], 500);
        }
    }
}
