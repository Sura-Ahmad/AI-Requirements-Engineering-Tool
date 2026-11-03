import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || (
  typeof window !== 'undefined'
    ? (console.error('NEXT_PUBLIC_API_URL is not set — falling back to localhost'), 'http://localhost:8000')
    : 'http://localhost:8000'
);

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 120000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let isRefreshing = false;
let pendingQueue: { resolve: (token: string) => void; reject: (err: unknown) => void }[] = [];

const processPendingQueue = (error: unknown, token: string | null) => {
  pendingQueue.forEach(p => (token ? p.resolve(token) : p.reject(error)));
  pendingQueue = [];
};

api.interceptors.response.use(
  res => res,
  async error => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry || original.url?.includes('/auth/')) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingQueue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }

    isRefreshing = true;
    const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('refresh_token') : null;

    if (!refreshToken) {
      isRefreshing = false;
      if (typeof window !== 'undefined') window.location.href = '/auth';
      return Promise.reject(error);
    }

    try {
      const res = await axios.post(`${API_URL}/auth/refresh`, { refresh_token: refreshToken });
      const { access_token, refresh_token: newRefresh } = res.data;
      if (!access_token || !newRefresh) throw new Error('Invalid refresh response');
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', newRefresh);
      api.defaults.headers.common.Authorization = `Bearer ${access_token}`;
      original.headers.Authorization = `Bearer ${access_token}`;
      processPendingQueue(null, access_token);
      return api(original);
    } catch (refreshError) {
      processPendingQueue(refreshError, null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (typeof window !== 'undefined') window.location.href = '/auth';
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// Auth
export const login = (email: string, password: string) =>
  api.post('/auth/login', { email, password });

export const register = (full_name: string, email: string, password: string) =>
  api.post('/auth/register', { full_name, email, password });

export const verifyEmail = (token: string) =>
  api.get(`/auth/verify-email?token=${token}`);

export const resendVerification = (email: string) =>
  api.post('/auth/resend-verification', { email });

export const logout = (refresh_token: string) =>
  api.post('/auth/logout', { refresh_token });

export const forgotPassword = (email: string) =>
  api.post('/auth/forgot-password', { email });

export const resetPassword = (token: string, new_password: string) =>
  api.post('/auth/reset-password', { token, new_password });

// Domains
export const getDomains = (country: string) =>
  api.get(`/domains/?country=${country}`);

export const getQuestions = (domain_id: string) =>
  api.get(`/domains/${domain_id}/questions`);

export const createSession = (data: any) =>
  api.post('/domains/session', data);

// Input
export const processText = (text: string, session_id: string) =>
  api.post('/input/text', { text, session_id });

export const processDocument = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post('/input/document', formData, {
    headers: { 'Content-Type': undefined },
  });
};

// Requirements
export const generateRequirements = (session_id: string, document_text: string = '') =>
  api.post('/requirements/generate', { session_id, document_text });

export const getRequirements = (session_id: string) =>
  api.get(`/requirements/${session_id}`);

export const updateRequirement = (requirement_id: string, description: string) =>
  api.put(`/requirements/${requirement_id}`, { description });

export const deleteRequirement = (requirement_id: string) =>
  api.delete(`/requirements/${requirement_id}`);

export const addRequirement = (session_id: string, type: string, description: string) =>
  api.post('/requirements/add', { session_id, type, description });

// Cross-check
export const crossCheck = (session_id: string) =>
  api.get(`/crosscheck/${session_id}`);

// SRS
export const generateSRS = (session_id: string, project_name: string) =>
  api.post('/srs/generate', { session_id, project_name });

// Use Cases
export const generateUseCases = (session_id: string) =>
  api.post('/usecases/generate', { session_id });

// Auth — current user
export const getMe = () => api.get('/auth/me');

// Admin
export const getStats = () => api.get('/admin/stats');
export const getUsers = () => api.get('/admin/users');
export const toggleUser = (user_id: string) => api.put(`/admin/users/${user_id}/toggle-active`);
export const getSessions = () => api.get('/admin/sessions');
export const getDomainsAdmin = () => api.get('/admin/domains');
export const createDomain = (data: { name: string; country: string }) =>
  api.post('/admin/domains', data);
export const updateDomain = (domain_id: string, data: { name?: string; country?: string; is_active?: boolean }) =>
  api.put(`/admin/domains/${domain_id}`, data);
export const deleteDomain = (domain_id: string) => api.delete(`/admin/domains/${domain_id}`);
export const getQuestionsAdmin = (domain_id: string) => api.get(`/admin/domains/${domain_id}/questions`);
export const createQuestion = (domain_id: string, data: { question_text: string }) =>
  api.post(`/admin/domains/${domain_id}/questions`, data);
export const updateQuestion = (question_id: string, data: { question_text?: string; is_active?: boolean }) =>
  api.put(`/admin/questions/${question_id}`, data);
export const deleteQuestion = (question_id: string) => api.delete(`/admin/questions/${question_id}`);

export const getAuditLog = (params?: {
  page?: number;
  limit?: number;
  user_id?: string;
  action?: string;
  date_from?: string;
  date_to?: string;
}) => api.get('/admin/audit-log', { params });

export const getLoginHistory = (params?: {
  page?: number;
  limit?: number;
  email?: string;
  success?: boolean;
  date_from?: string;
  date_to?: string;
}) => api.get('/admin/login-history', { params });

export const getFailedAttempts = () => api.get('/admin/login-history/failed-attempts');

// Documents
export const getDocuments = () => api.get('/admin/documents');
export const getDocument = (session_id: string) => api.get(`/admin/documents/${session_id}`);

// Knowledge Base
export const getKbFiles = () => api.get('/admin/knowledge-base');
export const uploadKbFile = (file: File, domain: string, country: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('domain', domain);
  formData.append('country', country);
  return api.post('/admin/knowledge-base/upload', formData, {
    headers: { 'Content-Type': undefined },
  });
};
export const deleteKbFile = (entryId: string) => api.delete(`/admin/knowledge-base/${entryId}`);

// Profile
export const getMyProfile = () => api.get('/profile/me');
export const getMySessions = () => api.get('/profile/sessions');
export const getSessionById = (session_id: string) => api.get(`/profile/sessions/${session_id}`);
export const updateProfile = (data: { full_name?: string; email?: string }) =>
  api.put('/profile/update', data);
export const changePassword = (current_password: string, new_password: string) =>
  api.put('/profile/change-password', { current_password, new_password });

export default api;