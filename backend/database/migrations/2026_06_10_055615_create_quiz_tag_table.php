<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('quiz_tag', function (Blueprint $table) {
            $table->string('quiz_id');
            $table->string('tag_id');
            $table->primary(['quiz_id', 'tag_id']);
            $table->foreign('quiz_id')->references('quiz_id')->on('quizzes')->onDelete('cascade');
            $table->foreign('tag_id')->references('tag_id')->on('tags')->onDelete('cascade');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_tag');
    }
};
