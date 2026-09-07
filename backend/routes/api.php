<?php

use App\Http\Controllers\Api\V1\Auth\AuthController;
use App\Http\Controllers\Api\V1\Category\CategoryController;
use App\Http\Controllers\Api\V1\Media\MediaController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\Party\PartyController;
use App\Http\Controllers\Api\V1\Quiz\AiQuizController;
use App\Http\Controllers\Api\V1\Quiz\AnswerController;
use App\Http\Controllers\Api\V1\Quiz\QuestionController;
use App\Http\Controllers\Api\V1\Quiz\QuizController;
use App\Http\Controllers\Api\V1\QuizStats\CommentController as QuizCommentController;
use App\Http\Controllers\Api\V1\QuizStats\QuizStatsController;
use App\Http\Controllers\Api\V1\QuizStats\RatingController as QuizRatingController;
use App\Http\Controllers\Api\V1\RunCodeController;
use App\Http\Controllers\Api\V1\Student\QuizAttemptController;
use App\Http\Controllers\Api\V1\Student\StudentClassController;
use App\Http\Controllers\Api\V1\Teacher\AssignmentController;
use App\Http\Controllers\Api\V1\Teacher\ClassController;
use App\Http\Controllers\Api\V1\User\RoleController;
use App\Http\Controllers\Api\V1\User\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {

    Route::get('/roles', [RoleController::class, 'index']);
    Route::get('/categories', [CategoryController::class, 'index']);
    Route::get('/categories/{category}', [CategoryController::class, 'show']);

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::get('/users/profile/{username}', [UserController::class, 'publicProfile']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:5,10,email');
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::get('/user', [UserController::class, 'authenticatedUser']);
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::post('/verify-email', [AuthController::class, 'verify']);
        Route::post('/verify-email/resend', [AuthController::class, 'resendVerification'])->middleware('throttle:3,60');
        Route::apiResource('users', UserController::class);

        Route::get('/media/{media}', [MediaController::class, 'show']);
        Route::post('/media', [MediaController::class, 'store']);
        Route::delete('/media/{media}', [MediaController::class, 'destroy']);

        Route::get('/my-quizzes', [QuizController::class, 'myQuizzes']);
        Route::post('/quizzes', [QuizController::class, 'store']);
        Route::put('/quizzes/{quiz}', [QuizController::class, 'update']);
        Route::delete('/quizzes/{quiz}', [QuizController::class, 'destroy']);

        Route::post('/quizzes/import-json', [AiQuizController::class, 'import']);

        Route::get('/quizzes/{quiz}/questions', [QuestionController::class, 'index']);
        Route::post('/quizzes/{quiz}/questions', [QuestionController::class, 'store']);
        Route::put('/quizzes/{quiz}/questions/reorder', [QuestionController::class, 'reorder']);
        Route::get('/questions/{question}', [QuestionController::class, 'show']);
        Route::put('/questions/{question}', [QuestionController::class, 'update']);
        Route::delete('/questions/{question}', [QuestionController::class, 'destroy']);

        Route::get('/questions/{question}/answers', [AnswerController::class, 'index']);
        Route::post('/questions/{question}/answers', [AnswerController::class, 'store']);
        Route::get('/answers/{answer}', [AnswerController::class, 'show']);
        Route::put('/answers/{answer}', [AnswerController::class, 'update']);
        Route::delete('/answers/{answer}', [AnswerController::class, 'destroy']);

        Route::get('/notifications', [NotificationController::class, 'index']);
        Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
        Route::put('/notifications/{notification}/read', [NotificationController::class, 'markAsRead']);
        Route::put('/notifications/read-all', [NotificationController::class, 'markAllAsRead']);

        Route::get('/my-classes', [StudentClassController::class, 'myClasses']);
        Route::get('/my-classes/{class}', [StudentClassController::class, 'classDetail']);
        Route::post('/classes/join', [StudentClassController::class, 'join']);
        Route::get('/my-attempts', [QuizAttemptController::class, 'myAttempts']);
        Route::post('/quiz-attempts', [QuizAttemptController::class, 'store']);

        Route::get('/quizzes/{quiz}/my-rating', [QuizRatingController::class, 'userRating']);
        Route::post('/quizzes/{quiz}/ratings', [QuizRatingController::class, 'store']);
        Route::post('/quizzes/{quiz}/comments', [QuizCommentController::class, 'store']);
        Route::delete('/comments/{comment}', [QuizCommentController::class, 'destroy']);
    });

    Route::get('/quizzes', [QuizController::class, 'index']);
    Route::get('/quizzes/{quiz}', [QuizController::class, 'show'])->middleware('optional.sanctum');
    Route::get('/quizzes/{quiz}/stats', [QuizStatsController::class, 'stats']);
    Route::post('/quizzes/{quiz}/views', [QuizStatsController::class, 'incrementViews']);
    Route::get('/quizzes/{quiz}/ratings', [QuizRatingController::class, 'index']);
    Route::get('/quizzes/{quiz}/comments', [QuizCommentController::class, 'index']);
    Route::post('/run-code', [RunCodeController::class, 'execute']);

    Route::post('/parties/join', [PartyController::class, 'join'])->middleware('optional.sanctum')->middleware('throttle:6,1');
    Route::get('/parties/{party:party_code}/state', [PartyController::class, 'state']);
    Route::post('/parties/{party:party_code}/answer', [PartyController::class, 'answer'])->middleware('throttle:30,1');
    Route::get('/parties/{party:party_code}/results', [PartyController::class, 'results']);

    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('/parties', [PartyController::class, 'store']);
        Route::post('/parties/{party:party_code}/start', [PartyController::class, 'start']);
        Route::post('/parties/{party:party_code}/next', [PartyController::class, 'next']);
        Route::delete('/parties/{party:party_code}/players/{player}', [PartyController::class, 'kick']);
        Route::delete('/parties/{party:party_code}/leave', [PartyController::class, 'leave']);
    });

    Route::middleware(['auth:sanctum', 'admin'])->group(function () {
        Route::post('/categories', [CategoryController::class, 'store']);
        Route::put('/categories/{category}', [CategoryController::class, 'update']);
        Route::delete('/categories/{category}', [CategoryController::class, 'destroy']);
    });

    Route::middleware(['auth:sanctum', 'teacher'])->group(function () {
        Route::get('/teacher/classes', [ClassController::class, 'index']);
        Route::post('/teacher/classes', [ClassController::class, 'store']);
        Route::get('/teacher/classes/{class}', [ClassController::class, 'show']);
        Route::put('/teacher/classes/{class}', [ClassController::class, 'update']);
        Route::delete('/teacher/classes/{class}', [ClassController::class, 'destroy']);
        Route::post('/teacher/classes/{class}/regenerate-code', [ClassController::class, 'regenerateCode']);
        Route::get('/teacher/classes/{class}/students', [ClassController::class, 'students']);
        Route::post('/teacher/classes/{class}/students', [ClassController::class, 'addStudent']);
        Route::delete('/teacher/classes/{class}/students/{student}', [ClassController::class, 'removeStudent']);
        Route::get('/teacher/classes/{class}/pending', [ClassController::class, 'pending']);
        Route::post('/teacher/classes/{class}/approve/{student}', [ClassController::class, 'approve']);
        Route::post('/teacher/classes/{class}/reject/{student}', [ClassController::class, 'reject']);

        Route::get('/teacher/assignments', [AssignmentController::class, 'index']);
        Route::post('/teacher/assignments', [AssignmentController::class, 'store']);
        Route::get('/teacher/assignments/{assignment}', [AssignmentController::class, 'show']);
        Route::put('/teacher/assignments/{assignment}', [AssignmentController::class, 'update']);
        Route::delete('/teacher/assignments/{assignment}', [AssignmentController::class, 'destroy']);
        Route::get('/teacher/assignments/{assignment}/results', [AssignmentController::class, 'results']);
    });

});
