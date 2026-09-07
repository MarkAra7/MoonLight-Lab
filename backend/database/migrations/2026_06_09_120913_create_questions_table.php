<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('questions', function (Blueprint $table) {
            $table->string('question_id')->primary();
            $table->string('quiz_id');
            $table->foreign('quiz_id')->references('quiz_id')->on('quizzes')->onDelete('cascade');
            $table->text('question_text');
            $table->string('question_type');
            $table->foreign('question_type')->references('question_type_id')->on('question_types')->onDelete('restrict');
            $table->string('media_id')->nullable();
            $table->foreign('media_id')->references('file_id')->on('media')->onDelete('set null');
            $table->integer('display_order')->default(0);
            $table->json('config')->nullable();
            $table->timestamps();

        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('questions');
    }
};
