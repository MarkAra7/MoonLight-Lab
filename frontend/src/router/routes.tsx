import type { ReactNode } from "react";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { UserProfilePage } from "@/pages/profile/UserProfilePage";
import { SearchPage } from "@/pages/search/SearchPage";
import { MyQuizzesPage } from "@/pages/quiz/MyQuizzesPage";
import { QuizBrowsePage } from "@/pages/quiz/QuizBrowsePage";
import ShowQ from "@/pages/quiz/ShowQ";

export interface AppRoute {
  path: string;
  element: ReactNode;
}

export const routes: AppRoute[] = [
  { path: "/", element: <HomePage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register", element: <RegisterPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/my-quizzes", element: <MyQuizzesPage /> },
  { path: "/users/:username", element: <UserProfilePage /> },
  { path: "/quizzes", element: <QuizBrowsePage /> },
  { path: "/quizzes/:quizId", element: <ShowQ /> },
];