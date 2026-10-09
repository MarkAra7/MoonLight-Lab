export interface Media {
  file_id?: string;
  file_path?: string | null;
  url?: string | null;
  type?: "file" | "link" | string;
  file_name?: string | null;
  mime_type?: string | null;
  file_size?: number | null;
  thumbnail_url?: string | null;
  provider?: string | null;
}

export interface User {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  name?: string | null;
  email?: string | null;
  country?: string | null;
  preferred_language?: string | null;
  role_id?: number | null;
  avatar_id?: number | null;
  is_private?: boolean;
  is_verified?: boolean;
  role?: Role | null;
  avatar?: Media | null;
  email_verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface Role {
  id: number;
  title: string;
  description?: string | null;
}

export interface Category {
  category_id: number;
  name: string;
  description?: string | null;
  media?: Media | null;
  quizzes_count?: number | null;
}

export interface QuizAuthor {
  id?: number;
  name?: string | null;
  username?: string | null;
  avatar?: Media | null;
}

export interface Quiz {
  quiz_id: number;
  title: string;
  description?: string | null;
  author_id: number;
  author?: QuizAuthor | null;
  category?: Category | null;
  category_id?: string | null;
  difficulty?: string | null;
  language?: string | null;
  quiz_status?: { status: string } | null;
  media?: Media | null;
  media_id?: string | null;
  questions_count?: number | null;
  questions?: Question[];
  time_limit?: number | null;
  views?: number;
  is_public?: boolean;
  average_score?: number | null;
}

export interface Answer {
  answer_id: string;
  question_id?: string;
  answer_text?: string | null;
  display_order?: number;
  media_id?: string | null;
  config?: Record<string, unknown> | null;
  is_correct?: boolean;
}

export interface Question {
  question_id: string;
  question_text: string;
  question_type: string;
  media_id?: string | null;
  display_order?: number;
  is_private?: boolean;
  config?: Record<string, unknown> | null;
  correct_text?: string | null;
  match_mode?: string | null;
  answers?: Answer[];
}

/** The correct option(s) for a question, revealed only after an attempt. */
export interface QuizAttemptReviewAnswer {
  answer_id: string;
  answer_text: string;
}

export interface QuizAttemptReviewQuestion {
  question_id: string;
  question_text: string;
  question_type: string;
  /** null for theory questions, which award no points. */
  is_correct: boolean | null;
  given_answer_ids: string[];
  given_text: string;
  correct_answers: QuizAttemptReviewAnswer[];
  correct_text: string | null;
}

export interface QuizAttemptResult {
  attempt_id: number;
  quiz_id: string;
  quiz_title: string;
  score: number;
  total: number;
  percentage: number;
  attempt_number: number;
  started_at?: string | null;
  completed_at?: string | null;
  questions: QuizAttemptReviewQuestion[];
}

/**
 * Laravel resource-collection pagination envelope.
 *
 * `data` holds the rows, `links` carries the first/last/prev/next page URLs and
 * `meta` carries the page numbers plus the total row count. `links` values are
 * `null` where that neighbour does not exist, and `from` / `to` are `null` on
 * an empty page.
 */
export interface Paged<T> {
  data: T[];
  links: {
    first: string | null;
    last: string | null;
    prev: string | null;
    next: string | null;
  };
  meta: {
    current_page: number;
    from: number | null;
    last_page: number;
    path: string;
    per_page: number;
    to: number | null;
    total: number;
  };
}

export interface Comment {
  id: number;
  user?: string | null;
  username?: string | null;
  body: string;
  created_at: string;
  replies?: Comment[];
}

export interface RatingSummary {
  average: number;
  count: number;
  ratings?: {
    id: number;
    user: string;
    rating: number;
    created_at: string;
  }[];
}

export interface MyRating {
  rating: number | null;
}