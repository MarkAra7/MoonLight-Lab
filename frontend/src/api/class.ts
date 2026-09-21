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

export const classApi = {
  teacherIndex: () => apiClient.get("/teacher/classes"),
  teacherCreate: (payload: ClassPayload) => apiClient.post("/teacher/classes", payload),
  teacherShow: (id: number | string) => apiClient.get(`/teacher/classes/${id}`),
  teacherUpdate: (id: number | string, payload: Partial<ClassPayload>) =>
    apiClient.put(`/teacher/classes/${id}`, payload),
  teacherRemove: (id: number | string) => apiClient.delete(`/teacher/classes/${id}`),
  regenerateCode: (id: number | string) => apiClient.post(`/teacher/classes/${id}/regenerate-code`),
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
};