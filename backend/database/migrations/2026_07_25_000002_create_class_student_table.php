<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('class_student', function (Blueprint $table) {
            $table->id();
            $table->string('class_id');
            $table->foreign('class_id')->references('id')->on('classes')->onDelete('cascade');
            $table->string('student_id');
            $table->foreign('student_id')->references('id')->on('users')->onDelete('cascade');
            $table->enum('status', ['active', 'pending'])->default('pending');
            $table->enum('joined_by', ['manual', 'code']);
            $table->string('added_by')->nullable();
            $table->foreign('added_by')->references('id')->on('users')->onDelete('set null');
            $table->timestamp('joined_at')->useCurrent();
            $table->unique(['class_id', 'student_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_student');
    }
};
