import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor
api.interceptors.request.use(
  (config) => {
    // You can add auth tokens here if needed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add a response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const customError = new Error(
      error.response?.data?.message || 'An error occurred'
    );
    customError.status = error.response?.status;
    customError.details = error.response?.data?.details;
    return Promise.reject(customError);
  }
);

// Videos API
export const videosApi = {
  getTitles: () => api.get('/videos/titles'),
  uploadVideo: (formData) => {
    return api.post('/videos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  generateTranscript: (videoId) => api.post(`/videos/${videoId}/transcript`),
  generateNotes: (videoId) => api.post(`/videos/${videoId}/notes`),
  generateSlides: (videoId) => api.post(`/videos/${videoId}/slides`),
  generateScreenshots: (videoId) => api.post(`/videos/${videoId}/screenshots`),
};

// Notes API
export const notesApi = {
  getTitles: () => api.get('/notes/titles'),
  generateNotes: (data) => api.post('/notes/generate', data),
  getNote: (noteId) => api.get(`/notes/${noteId}`),
};

// Slides API
export const slidesApi = {
  generate: (data) => api.post('/slides/generate', data),
  getSlides: (slideId) => api.get(`/slides/${slideId}`),
};

export default api;
