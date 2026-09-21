/**
 * Shared domain types for the Laravel API.
 *
 * Shapes are derived from the backend controllers (Api\V1) and the
 * consumers in this frontend (components, AuthContext, hooks).
 */

/** Backend media member: either a stored `file_path` or an external `url`. */
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

/** Authenticated user as returned by UserResource (`/user`, login, register). */
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
  role?: Role | null;
  avatar?: Media | null;
  email_verified_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

/** Role as returned by RoleController::index (`/roles`). */
export interface Role {
  id: number;
  title: string;
  description?: string | null;
}

/** Category as returned by CategoryController (`/categories`). */
export interface Category {
  category_id: number;
  name: string;
  description?: string | null;
  media?: Media | null;
  quizzes_count?: number | null;
}

/** Author relation embedded in quiz payloads. */
export interface QuizAuthor {
  id?: number;
  name?: string | null;
  avatar?: Media | null;
}

/** Quiz as returned by QuizController (`/quizzes`, `/quizzes/:id`). */
export interface Quiz {
  quiz_id: number;
  title: string;
  description?: string | null;
  author_id: number;
  author?: QuizAuthor | null;
  category?: Category | null;
  difficulty?: string | null;
  quiz_status?: { status: string } | null;
  media?: Media | null;
  questions_count?: number | null;
  questions?: unknown[];
  time_limit?: number;
  views?: number;
  is_public?: boolean;
  average_score?: number | null;
}

/** Comment as returned by CommentController (`/quizzes/:id/comments`). */
export interface Comment {
  id: number;
  user?: string | null;
  username?: string | null;
  body: string;
  created_at: string;
  replies?: Comment[];
}

/** Rating summary as returned by RatingController::index. */
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

/** Current user's rating as returned by RatingController::userRating. */
export interface MyRating {
  rating: number | null;
}