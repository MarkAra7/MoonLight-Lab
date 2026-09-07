<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parties', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->string('party_code', 8)->unique();
            $table->string('host_id');
            $table->foreign('host_id')->references('id')->on('users')->onDelete('cascade');
            $table->string('quiz_id');
            $table->foreign('quiz_id')->references('quiz_id')->on('quizzes')->onDelete('cascade');
            $table->string('status', 16)->default('lobby'); // lobby | playing | results | cancelled
            $table->integer('current_question_index')->default(0);
            $table->timestamp('question_started_at')->nullable();
            $table->integer('question_seconds')->default(15);
            $table->integer('max_players')->default(20);
            $table->json('settings')->nullable();
            $table->timestamps();
        });

        Schema::create('party_players', function (Blueprint $table) {
            $table->id();
            $table->string('party_id');
            $table->foreign('party_id')->references('id')->on('parties')->onDelete('cascade');
            $table->string('user_id')->nullable();
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->string('nickname', 30);
            $table->string('nickname_slug', 30);
            $table->string('player_token', 64);
            $table->integer('score')->default(0);
            $table->integer('correct')->default(0);
            $table->integer('total')->default(0);
            $table->integer('total_time_ms')->default(0);
            $table->integer('rank')->nullable();
            $table->timestamp('joined_at')->useCurrent();
            $table->timestamps();
            $table->unique(['party_id', 'nickname_slug']);
        });

        Schema::create('party_answers', function (Blueprint $table) {
            $table->id();
            $table->string('party_id');
            $table->foreign('party_id')->references('id')->on('parties')->onDelete('cascade');
            $table->unsignedBigInteger('player_id');
            $table->foreign('player_id')->references('id')->on('party_players')->onDelete('cascade');
            $table->integer('question_index');
            $table->string('answer_id')->nullable();
            $table->boolean('is_correct')->default(false);
            $table->integer('points')->default(0);
            $table->integer('answered_at_ms')->nullable();
            $table->timestamps();
            $table->unique(['player_id', 'question_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('party_answers');
        Schema::dropIfExists('party_players');
        Schema::dropIfExists('parties');
    }
};
