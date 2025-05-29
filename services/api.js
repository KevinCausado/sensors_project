import axios from 'axios';

const api = axios.create({
  // --- ¡CAMBIO CRUCIAL AQUÍ! ---
  baseURL: 'http://localhost:3001/api', // Reemplaza 3000 si tu backend usa otro puerto
  // --- FIN DEL CAMBIO ---
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor for auth token (sin cambios)
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth:token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling (sin cambios)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('auth:token');
      localStorage.removeItem('auth:user');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);

export default api;