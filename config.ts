// Using environment variables for configuration
// The VITE_API_BASE_URL is set in .env.development and .env.production
// We check both import.meta.env and process.env to ensure compatibility
export const BASE_URL = import.meta.env.VITE_API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://127.0.0.1:8080';

console.log('[Config] API Base URL:', BASE_URL);
