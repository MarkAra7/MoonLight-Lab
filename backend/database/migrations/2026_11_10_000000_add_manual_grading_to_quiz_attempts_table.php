<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Teachers can override the automatically calculated score of an attempt
     * and leave written feedback. The original score stays untouched so the
     * automatic result can always be compared with the teacher's decision.
     */
    public function up(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->decimal('teacher_score', 5, 2)->nullable()->after('score');
            $table->text('teacher_feedback')->nullable()->after('teacher_score');
            $table->string('graded_by_id')->nullable()->after('teacher_feedback');
            $table->foreign('graded_by_id')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('graded_at')->nullable()->after('graded_by_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('quiz_attempts', function (Blueprint $table) {
            $table->dropForeign(['graded_by_id']);
            $table->dropColumn(['teacher_score', 'teacher_feedback', 'graded_by_id', 'graded_at']);
        });
    }
};
