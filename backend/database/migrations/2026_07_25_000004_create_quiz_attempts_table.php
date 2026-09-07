<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quiz_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('assignment_id')->nullable();
            $table->foreign('assignment_id')->references('id')->on('assignments')->onDelete('cascade');
            $table->string('quiz_id');
            $table->foreign('quiz_id')->references('quiz_id')->on('quizzes')->onDelete('cascade');
            $table->string('student_id');
            $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
            $table->integer('attempt_number');
            $table->decimal('score', 5, 2)->default(0);
            $table->integer('total')->default(0);
            $table->json('answers_data')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['assignment_id', 'student_id', 'attempt_number'], 'unique_attempt');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_attempts');
    }
};
