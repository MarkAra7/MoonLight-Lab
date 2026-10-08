<?php

namespace Database\Seeders;

use App\Models\QuestionType;
use Illuminate\Database\Seeder;

class QuestionTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['question_type_id' => 'single_choice', 'name' => 'Single Choice', 'description' => 'Select one correct answer from several options.', 'display_order' => 1],
            ['question_type_id' => 'multiple_choice', 'name' => 'Multiple Choice', 'description' => 'Select all correct answers from several options.', 'display_order' => 2],
            ['question_type_id' => 'true_false', 'name' => 'True / False', 'description' => 'Determine whether the statement is true or false.', 'display_order' => 3],
            ['question_type_id' => 'text_input', 'name' => 'Text Input', 'description' => 'Type a short answer; matched with exact, case-insensitive or partial matching.', 'display_order' => 4],
            ['question_type_id' => 'theory', 'name' => 'Theory / Info', 'description' => 'Reading material only, no points.', 'display_order' => 5],
        ];

        foreach ($types as $type) {
            QuestionType::firstOrCreate(
                ['question_type_id' => $type['question_type_id']],
                $type
            );
        }
    }
}
