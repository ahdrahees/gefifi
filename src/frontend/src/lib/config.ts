export const API_BASE_URL = (
	import.meta.env.PROD
		? import.meta.env.VITE_API_BASE_URL
		: import.meta.env.VITE_API_BASE_LOCAL_URL || 'http://localhost:3000'
) as string;

export const AGENT_API_URL = (
	import.meta.env.PROD
		? import.meta.env.VITE_AGENT_API_URL
		: import.meta.env.VITE_AGENT_API_LOCAL_URL || 'http://localhost:3000'
) as string;

export const CUSTOMER_AGENT_NAME = 'build_assist_agent';
export const EXPERT_AGENT_NAME = 'expert_assist_agent';
export const SUPPLIER_AGENT_NAME = 'supplier_assist_agent';
