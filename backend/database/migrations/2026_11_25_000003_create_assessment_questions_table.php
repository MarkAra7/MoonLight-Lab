<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_questions', function (Blueprint $table) {
            $table->string('question_id')->primary();
            $table->string('assessment_id');
            $table->foreign('assessment_id')->references('assessment_id')->on('assessments')->onDelete('cascade');
            $table->text('question_text');
            $table->string('question_type');
            $table->foreign('question_type')->references('question_type_id')->on('question_types')->onDelete('restrict');
            $table->integer('points')->default(1);
            $table->integer('display_order')->default(0);
            $table->json('config')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_questions');
    }
};
