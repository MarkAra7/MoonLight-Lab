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
        Schema::create('quizzes', function (Blueprint $table) {
            $table->string('quiz_id')->primary();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('author_id');
            $table->foreign('author_id')->references('id')->on('users')->onDelete('cascade');
            $table->foreignId('quiz_status_id')->constrained('quiz_statuses', 'quiz_status_id')->onDelete('restrict');

            $table->string('category_id')->nullable();
            $table->foreign('category_id')->references('category_id')->on('categories')->onDelete('set null');

            $table->string('media_id')->nullable();
            $table->foreign('media_id')->references('file_id')->on('media')->onDelete('set null');

            $table->string('language')->default('en');

            $table->string('difficulty')->nullable();
            $table->integer('time_limit')->nullable();



            $table->integer('views')->default(0);

            $table->decimal('average_score', 5, 2)->default(0.00);

            $table->json('config')->nullable();

            $table->boolean('is_public')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('quizzes');
    }
};
