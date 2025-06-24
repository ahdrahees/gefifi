export const API_BASE_URL = import.meta.env.PROD
	? import.meta.env.VITE_API_BASE_URL
	: import.meta.env.VITE_API_BASE_LOCAL_URL;

console.log('API BASE URL ', API_BASE_URL);
