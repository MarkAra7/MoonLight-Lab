import { lazy } from "react";

// Every page is loaded on demand, so the first visit only downloads the shell
// plus the page the visitor actually opened.
export const HomePage = lazy(() =>
  import("@/pages/HomePage").then((module) => ({ default: module.HomePage }))
);
export const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((module) => ({ default: module.LoginPage }))
);
export const RegisterPage = lazy(() =>
  import("@/pages/auth/RegisterPage").then((module) => ({ default: module.RegisterPage }))
);
export const ForgotPasswordPage = lazy(() =>
  import("@/pages/auth/ForgotPasswordPage").then((module) => ({
    default: module.ForgotPasswordPage,
  }))
);
export const ResetPasswordPage = lazy(() =>
  import("@/pages/auth/ResetPasswordPage").then((module) => ({
    default: module.ResetPasswordPage,
  }))
);
export const VerifyEmailPage = lazy(() =>
  import("@/pages/auth/VerifyEmailPage").then((module) => ({
    default: module.VerifyEmailPage,
  }))
);
export const AdminUsersPage = lazy(() =>
  import("@/pages/admin/AdminUsersPage").then((module) => ({
    default: module.AdminUsersPage,
  }))
);
export const SettingsPage = lazy(() =>
  import("@/pages/settings/SettingsPage").then((module) => ({ default: module.SettingsPage }))
);
export const UserProfilePage = lazy(() =>
  import("@/pages/profile/UserProfilePage").then((module) => ({
    default: module.UserProfilePage,
  }))
);
export const SearchPage = lazy(() =>
  import("@/pages/search/SearchPage").then((module) => ({ default: module.SearchPage }))
);
export const MyQuizzesPage = lazy(() =>
  import("@/pages/quiz/MyQuizzesPage").then((module) => ({ default: module.MyQuizzesPage }))
);
export const QuizBrowsePage = lazy(() =>
  import("@/pages/quiz/QuizBrowsePage").then((module) => ({ default: module.QuizBrowsePage }))
);
export const QuizEditorPage = lazy(() =>
  import("@/pages/quiz/QuizEditorPage").then((module) => ({ default: module.QuizEditorPage }))
);
export const QuizPlayPage = lazy(() =>
  import("@/pages/quiz/QuizPlayPage").then((module) => ({ default: module.QuizPlayPage }))
);
export const QuizStatsPage = lazy(() =>
  import("@/pages/quiz/QuizStatsPage").then((module) => ({ default: module.QuizStatsPage }))
);
export const ShowQ = lazy(() => import("@/pages/quiz/ShowQ"));
export const JoinPartyPage = lazy(() =>
  import("@/pages/party/JoinPartyPage").then((module) => ({ default: module.JoinPartyPage }))
);
export const PartyRoomPage = lazy(() =>
  import("@/pages/party/PartyRoomPage").then((module) => ({ default: module.PartyRoomPage }))
);
export const JoinClassPage = lazy(() =>
  import("@/pages/classes/JoinClassPage").then((module) => ({ default: module.JoinClassPage }))
);
export const MyClassesPage = lazy(() =>
  import("@/pages/classes/MyClassesPage").then((module) => ({ default: module.MyClassesPage }))
);
export const MyClassDetailPage = lazy(() =>
  import("@/pages/classes/MyClassDetailPage").then((module) => ({
    default: module.MyClassDetailPage,
  }))
);
export const TeacherClassesPage = lazy(() =>
  import("@/pages/classes/TeacherClassesPage").then((module) => ({
    default: module.TeacherClassesPage,
  }))
);
export const TeacherClassDetailPage = lazy(() =>
  import("@/pages/classes/TeacherClassDetailPage").then((module) => ({
    default: module.TeacherClassDetailPage,
  }))
);
export const TeacherAssignmentResultsPage = lazy(() =>
  import("@/pages/classes/TeacherAssignmentResultsPage").then((module) => ({
    default: module.TeacherAssignmentResultsPage,
  }))
);
