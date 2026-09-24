<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuizResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $isAuthor = $request->user()?->id === $this->author_id;

        return [
            'quiz_id' => $this->quiz_id,
            'title' => $this->title,
            'description' => $this->description,
            'difficulty' => $this->difficulty,
            'time_limit' => $this->time_limit,
            'views' => $this->views,
            'average_score' => $this->average_score,
            'is_public' => $this->is_public,
            'author_id' => $this->author_id,
            'category_id' => $this->category_id,
            'media_id' => $this->media_id,
            'quiz_status_id' => $this->quiz_status_id,
            'config' => $this->when($isAuthor, $this->config),
            'questions_count' => $this->whenCounted('questions'),
            'category' => $this->whenLoaded('category', fn () => new CategoryResource($this->category)),
            'media' => $this->whenLoaded('media', fn () => new MediaResource($this->media)),
            'author' => $this->whenLoaded('author', fn () => [
                'id' => $this->author->id,
                'name' => $this->author->name,
                'username' => $this->author->username,
                'avatar' => $this->author->relationLoaded('avatar')
                    ? new MediaResource($this->author->avatar)
                    : null,
            ]),
            'quiz_status' => $this->whenLoaded('quizStatus', fn () => [
                'status' => $this->quizStatus->status,
            ]),
            'questions' => $this->whenLoaded('questions', fn () => $this->questions->map(
                fn ($question) => (new QuestionResource($question))->setAuthor($isAuthor)
            )),
        ];
    }
}