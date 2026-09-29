<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class EmailChangeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $user,
        public string $newEmail,
        public string $currentEmail,
        public string $token,
        public string $step,
    ) {}

    public function envelope(): Envelope
    {
        $subject = match ($this->step) {
            'new_email' => 'Confirm your new email address',
            'current_email' => 'Confirm your email change',
        };

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        $frontendUrl = config('app.frontend_url', 'http://localhost:8080');

        $expireMinutes = config('verification.expire', 15);

        return new Content(
            html: 'emails.email-change',
            with: [
                'url' => $frontendUrl . '/settings?email_change_token=' . urlencode($this->token) . '&step=' . $this->step,
                'expireMinutes' => $expireMinutes,
                'step' => $this->step,
                'newEmail' => $this->newEmail,
                'currentEmail' => $this->currentEmail,
            ],
        );
    }
}
