<?php

namespace App\Providers;

use App\Http\Resources\UserResource;
use App\Models\Media;
use App\Models\Quiz;
use App\Policies\MediaPolicy;
use App\Policies\QuizPolicy;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        UserResource::withoutWrapping();

        Gate::policy(Quiz::class, QuizPolicy::class);
        Gate::policy(Media::class, MediaPolicy::class);

        RateLimiter::for('api', function (Request $request) {
            return Limit::perMinute(60)->by($request->user()?->id ?: $request->ip());
        });
    }
}
