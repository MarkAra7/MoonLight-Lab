<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AnswerResource extends JsonResource
{
    protected ?bool $isAuthor = null;

    /** Mark this answer as visible to the quiz author (grants is_correct/config). */
    public function setAuthor(bool $isAuthor): static
    {
        $this->isAuthor = $isAuthor;

        return $this;
    }

    public function toArray(Request $request): array
    {
        $isAuthor = $this->isAuthor ?? ($request->user()?->id === $this->resource->question?->quiz?->author_id);

        return [
            'answer_id' => $this->answer_id,
            'question_id' => $this->question_id,
            'answer_text' => $this->answer_text,
            'display_order' => $this->display_order,
            'media_id' => $this->media_id,
            'config' => $this->when($isAuthor, $this->config),
            'is_correct' => $this->when($isAuthor, $this->is_correct),
            'media' => $this->whenLoaded('media', fn () => new MediaResource($this->media)),
        ];
    }
}