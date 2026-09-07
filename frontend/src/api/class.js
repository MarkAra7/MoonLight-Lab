import apiClient from "./client";

export const classApi = {
 
  teacherIndex: () => apiClient.get("/teacher/classes"),
  teacherCreate: (payload) => apiClient.post("/teacher/classes", payload),
  teacherShow: (id) => apiClient.get(`/teacher/classes/${id}`),
  teacherUpdate: (id, payload) => apiClient.put(`/teacher/classes/${id}`, payload),
  teacherRemove: (id) => apiClient.delete(`/teacher/classes/${id}`),
  regenerateCode: (id) => apiClient.post(`/teacher/classes/${id}/regenerate-code`),
  students: (id) => apiClient.get(`/teacher/classes/${id}/students`),
  addStudent: (id, payload) => apiClient.post(`/teacher/classes/${id}/students`, payload),
  removeStudent: (id, studentId) => apiClient.delete(`/teacher/classes/${id}/students/${studentId}`),
  pending: (id) => apiClient.get(`/teacher/classes/${id}/pending`),
  approve: (id, studentId) => apiClient.post(`/teacher/classes/${id}/approve/${studentId}`),
  reject: (id, studentId) => apiClient.post(`/teacher/classes/${id}/reject/${studentId}`),

 
  myClasses: () => apiClient.get("/my-classes"),
  myClassDetail: (id) => apiClient.get(`/my-classes/${id}`),
  join: (payload) => apiClient.post("/classes/join", payload),

  assignments: () => apiClient.get("/teacher/assignments"),
  createAssignment: (payload) => apiClient.post("/teacher/assignments", payload),
  assignment: (id) => apiClient.get(`/teacher/assignments/${id}`),
  updateAssignment: (id, payload) => apiClient.put(`/teacher/assignments/${id}`, payload),
  removeAssignment: (id) => apiClient.delete(`/teacher/assignments/${id}`),
  assignmentResults: (id) => apiClient.get(`/teacher/assignments/${id}/results`),
};
