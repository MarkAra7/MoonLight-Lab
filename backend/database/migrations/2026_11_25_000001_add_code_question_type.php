<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('question_types')->insertOrIgnore([
            'question_type_id' => 'code',
            'name' => 'Code Task',
            'description' => 'Write and run code against a set of tests.',
            'config' => null,
            'display_order' => 6,
        ]);
    }

    public function down(): void
    {
        DB::table('question_types')->where('question_type_id', 'code')->delete();
    }
};
