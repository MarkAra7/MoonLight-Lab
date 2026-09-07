<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $types = [
            ['question_type_id' => 'single_choice', 'name' => 'Single Choice', 'description' => 'Select one correct answer from several options.', 'config' => null, 'display_order' => 1],
            ['question_type_id' => 'multiple_choice', 'name' => 'Multiple Choice', 'description' => 'Select all correct answers from several options.', 'config' => null, 'display_order' => 2],
            ['question_type_id' => 'true_false', 'name' => 'True / False', 'description' => 'Determine whether the statement is true or false.', 'config' => null, 'display_order' => 3],
            ['question_type_id' => 'text_input', 'name' => 'Text Input', 'description' => 'Type a short answer; matched with exact, case-insensitive or partial matching.', 'config' => null, 'display_order' => 4],
            ['question_type_id' => 'theory', 'name' => 'Theory / Info', 'description' => 'Reading material only, no points.', 'config' => null, 'display_order' => 5],
        ];

        DB::table('question_types')->insertOrIgnore($types);
    }

    public function down(): void
    {
        Schema::table('question_types', function (Blueprint $table) {
            DB::table('question_types')->whereIn('question_type_id', ['single_choice', 'text_input', 'theory'])->delete();
        });
    }
};
