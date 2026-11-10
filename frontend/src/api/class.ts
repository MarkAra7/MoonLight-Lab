import apiClient from "./client";

export interface ClassPayload {
  name: string;
  description?: string | null;
  code_expires_in_hours?: number;
}

export interface AssignmentPayload {
  class_id: string;
  quiz_id: string;
  title: string;
  description?: string | null;
  max_attempts?: number;
  time_limit_minutes?: number;
  opens_at?: string | null;
  due_at?: string | null;
}

export interface ClassLookup {
  id: number;
  name: string;
  description?: string | null;
  teacher_name?: string | null;
}

export interface GradedAttemptQuestion {
  question_id: string;
  question_text: string;
  question_type: string;
  scorable: boolean;
  is_correct: boolean | null;
  given_answer: string;
  given_text: string;
  correct_answer: string;
  correct_text?: string | null;
}

export interface GradedAttempt {
  id: number;
  attempt_number: number;
  auto_score: number;
  teacher_score: number | null;
  final_score: number;
  total: number;
  percentage: number;
  teacher_feedback?: string | null;
  graded_at?: string | null;
  graded_by?: string | null;
  completed_at?: string | null;
  student?: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  } | null;
}

export interface GradedAttemptPayload {
  attempt: GradedAttempt;
  questions: GradedAttemptQuestion[];
}

export interface GradeAttemptPayload {
  teacher_score: number;
  teacher_feedback?: string | null;
}

export const classApi = {
  lookup: (code: string) => apiClient.get<ClassLookup>(`/classes/lookup/${code}`),
  teacherIndex: () => apiClient.get("/teacher/classes"),
  teacherCreate: (payload: ClassPayload) => apiClient.post("/teacher/classes", payload),
  teacherShow: (id: number | string) => apiClient.get(`/teacher/classes/${id}`),
  teacherUpdate: (id: number | string, payload: Partial<ClassPayload>) =>
    apiClient.put(`/teacher/classes/${id}`, payload),
  teacherRemove: (id: number | string) => apiClient.delete(`/teacher/classes/${id}`),
  regenerateCode: (id: number | string) =>
    apiClient.post(`/teacher/classes/${id}/regenerate-code`),
  disableCode: (id: number | string) => apiClient.post(`/teacher/classes/${id}/disable-code`),
  students: (id: number | string) => apiClient.get(`/teacher/classes/${id}/students`),
  addStudent: (id: number | string, payload: { email: string }) =>
    apiClient.post(`/teacher/classes/${id}/students`, payload),
  removeStudent: (id: number | string, studentId: number | string) =>
    apiClient.delete(`/teacher/classes/${id}/students/${studentId}`),
  pending: (id: number | string) => apiClient.get(`/teacher/classes/${id}/pending`),
  approve: (id: number | string, studentId: number | string) =>
    apiClient.post(`/teacher/classes/${id}/approve/${studentId}`),
  reject: (id: number | string, studentId: number | string) =>
    apiClient.post(`/teacher/classes/${id}/reject/${studentId}`),

  myClasses: () => apiClient.get("/my-classes"),
  myClassDetail: (id: number | string) => apiClient.get(`/my-classes/${id}`),
  join: (payload: { code: string }) => apiClient.post("/classes/join", payload),

  assignments: () => apiClient.get("/teacher/assignments"),
  createAssignment: (payload: AssignmentPayload) => apiClient.post("/teacher/assignments", payload),
  assignment: (id: number | string) => apiClient.get(`/teacher/assignments/${id}`),
  updateAssignment: (id: number | string, payload: Partial<AssignmentPayload>) =>
    apiClient.put(`/teacher/assignments/${id}`, payload),
  removeAssignment: (id: number | string) => apiClient.delete(`/teacher/assignments/${id}`),
  assignmentResults: (id: number | string) => apiClient.get(`/teacher/assignments/${id}/results`),
  assignmentAttempt: (id: number | string, attemptId: number | string) =>
    apiClient.get<GradedAttemptPayload>(`/teacher/assignments/${id}/attempts/${attemptId}`),
  gradeAssignmentAttempt: (
    id: number | string,
    attemptId: number | string,
    payload: GradeAttemptPayload,
  ) =>
    apiClient.put<GradedAttemptPayload>(
      `/teacher/assignments/${id}/attempts/${attemptId}`,
      payload,
    ),
};