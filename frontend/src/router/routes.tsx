import type { ReactNode } from "react";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { VerifyEmailPage } from "@/pages/auth/VerifyEmailPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";
import { UserProfilePage } from "@/pages/profile/UserProfilePage";
import { SearchPage } from "@/pages/search/SearchPage";
import { MyQuizzesPage } from "@/pages/quiz/MyQuizzesPage";
import { QuizBrowsePage } from "@/pages/quiz/QuizBrowsePage";
import { QuizEditorPage } from "@/pages/quiz/QuizEditorPage";
import { QuizPlayPage } from "@/pages/quiz/QuizPlayPage";
import { QuizStatsPage } from "@/pages/quiz/QuizStatsPage";
import ShowQ from "@/pages/quiz/ShowQ";
import { JoinPartyPage } from "@/pages/party/JoinPartyPage";
import { PartyRoomPage } from "@/pages/party/PartyRoomPage";
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
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/admin/users", element: <AdminUsersPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/settings", element: <SettingsPage /> },
  { path: "/search", element: <SearchPage /> },
  { path: "/my-quizzes", element: <MyQuizzesPage /> },
  { path: "/users/:username", element: <UserProfilePage /> },
  { path: "/quizzes", element: <QuizBrowsePage /> },
  { path: "/parties/join", element: <JoinPartyPage /> },
  { path: "/parties/:partyCode", element: <PartyRoomPage /> },
  { path: "/quizzes/new", element: <QuizEditorPage /> },
  { path: "/join/:code", element: <JoinClassPage /> },
  { path: "/my-classes", element: <MyClassesPage /> },
  { path: "/my-classes/:id", element: <MyClassDetailPage /> },
  { path: "/teacher/classes", element: <TeacherClassesPage /> },
  { path: "/teacher/classes/:id", element: <TeacherClassDetailPage /> },
  { path: "/teacher/assignments/:id", element: <TeacherAssignmentResultsPage /> },
  { path: "/quizzes/:quizId/edit", element: <QuizEditorPage /> },
  { path: "/quizzes/:quizId/play", element: <QuizPlayPage /> },
  { path: "/quizzes/:quizId/stats", element: <QuizStatsPage /> },
  { path: "/quizzes/:quizId", element: <ShowQ /> },
];