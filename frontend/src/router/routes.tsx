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
import { JoinClassPage } from "@/pages/classes/JoinClassPage";
import { MyClassesPage } from "@/pages/classes/MyClassesPage";
import { MyClassDetailPage } from "@/pages/classes/MyClassDetailPage";
import { TeacherClassesPage } from "@/pages/classes/TeacherClassesPage";
import { TeacherClassDetailPage } from "@/pages/classes/TeacherClassDetailPage";
import { TeacherAssignmentResultsPage } from "@/pages/classes/TeacherAssignmentResultsPage";

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
  { path: "/join/:code", element: <JoinClassPage /> },
  { path: "/my-classes", element: <MyClassesPage /> },
  { path: "/my-classes/:id", element: <MyClassDetailPage /> },
  { path: "/teacher/classes", element: <TeacherClassesPage /> },
  { path: "/teacher/classes/:id", element: <TeacherClassDetailPage /> },
  { path: "/teacher/assignments/:id", element: <TeacherAssignmentResultsPage /> },
  { path: "/quizzes/:quizId", element: <ShowQ /> },
];