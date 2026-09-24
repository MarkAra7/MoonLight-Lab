<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    protected ?bool $isAuthor = null;

    /** Mark this question as visible to the quiz author (grants config/correct_text/is_private). */
    public function setAuthor(bool $isAuthor): static
    {
        $this->isAuthor = $isAuthor;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $isAuthor = $this->isAuthor ?? ($request->user()?->id === $this->resource->quiz?->author_id);

        return [
            'question_id' => $this->question_id,
            'question_text' => $this->question_text,
            'question_type' => $this->question_type,
            'media_id' => $this->media_id,
            'display_order' => $this->display_order,
            'is_private' => $this->when($isAuthor, $this->is_private),
            'config' => $this->when($isAuthor, $this->config),
            'correct_text' => $this->when($isAuthor, $this->correct_text),
            'match_mode' => $this->when($isAuthor, $this->match_mode),
            'created_at' => $this->when($isAuthor, $this->created_at),
            'media' => $this->whenLoaded('media', fn () => new MediaResource($this->media)),
            'answers' => $this->whenLoaded('answers', fn () => $this->answers->map(
                fn ($answer) => (new AnswerResource($answer))->setAuthor($isAuthor)
            )),
        ];
    }
}