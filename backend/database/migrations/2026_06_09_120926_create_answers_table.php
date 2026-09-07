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
        Schema::create('answers', function (Blueprint $table) {
            $table->string('answer_id')->primary();
            $table->string('question_id');
            $table->foreign('question_id')->references('question_id')->on('questions')->onDelete('cascade');
            $table->text('answer_text')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->integer('display_order')->default(0);
            $table->json('config')->nullable();
            $table->string('media_id')->nullable();
            $table->foreign('media_id')->references('file_id')->on('media')->onDelete('set null');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('answers');
    }
};
