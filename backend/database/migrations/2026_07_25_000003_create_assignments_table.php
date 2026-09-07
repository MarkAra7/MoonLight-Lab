<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assignments', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('class_id');
            $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
            $table->string('quiz_id');
            $table->foreign('quiz_id')->references('quiz_id')->on('quizzes')->onDelete('cascade');
            $table->string('teacher_id');
            $table->foreign('teacher_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('title');
            $table->text('description')->nullable();
            $table->integer('max_attempts')->default(1);
            $table->integer('time_limit_minutes')->nullable();
            $table->timestamp('opens_at')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assignments');
    }
};
