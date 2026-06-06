/**
 * services/api.js
 * Configured Axios instance with auth token injection and error normalisation.
 */

import axios from 'axios';

const BASE_URL = `${import.meta.env.VITE_API_URL}api` || '/api';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,   // Send HTTP-only cookie
  timeout: 360_000,         // 60 s (LLM calls can be slow)
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor: attach JWT from localStorage if present ─────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ─── Response interceptor: normalise errors, handle 401 ──────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message =
      error.response?.data?.message ||
      error.message ||
      'An unexpected error occurred.';

    // Auto-logout on token expiry
    if (status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Avoid redirect loop on the auth pages themselves
      if (!window.location.pathname.startsWith('/login') &&
          !window.location.pathname.startsWith('/signup')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject({ message, status, raw: error });
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// ─── Books ────────────────────────────────────────────────────────────────
export const booksAPI = {
  upload: (formData, onProgress) =>
    api.post('/books/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress) {
          onProgress(Math.round((e.loaded * 100) / e.total));
        }
      },
    }),
  getAll: (page = 1, limit = 12) =>
    api.get('/books', { params: { page, limit } }),
  getById: (id) => api.get(`/books/${id}`),
  delete: (id) => api.delete(`/books/${id}`),
};

// ─── Chat ─────────────────────────────────────────────────────────────────
export const chatAPI = {
  ask: (bookId, question) => api.post('/chat/ask', { bookId, question }),
  getHistory: (bookId) => api.get(`/chat/${bookId}`),
  clearHistory: (bookId) => api.delete(`/chat/${bookId}`),
};

export default api;
