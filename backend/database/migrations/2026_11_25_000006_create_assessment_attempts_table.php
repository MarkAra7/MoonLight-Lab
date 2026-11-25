<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessment_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('assessment_id');
            $table->foreign('assessment_id')->references('assessment_id')->on('assessments')->onDelete('cascade');
            $table->string('assignment_id')->nullable();
            $table->foreign('assignment_id')->references('id')->on('assessment_assignments')->onDelete('cascade');
            $table->string('student_id');
            $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
            $table->integer('attempt_number');
            $table->decimal('score', 6, 2)->default(0);
            $table->integer('total')->default(0);
            $table->json('answers_data')->nullable();
            $table->decimal('teacher_score', 6, 2)->nullable();
            $table->text('teacher_feedback')->nullable();
            $table->string('graded_by_id')->nullable();
            $table->foreign('graded_by_id')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('graded_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['assignment_id', 'student_id', 'attempt_number'], 'unique_assessment_attempt');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessment_attempts');
    }
};
