// Using environment variables for configuration
// The VITE_API_BASE_URL is set in .env.development and .env.production
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';
