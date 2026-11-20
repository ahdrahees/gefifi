import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// required for svelte5 + jsdom as jsdom does not support matchMedia
Object.defineProperty(window, 'matchMedia', {
	writable: true,
	enumerable: true,
	value: vi.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		dispatchEvent: vi.fn()
	}))
});

// jsdom does not implement IntersectionObserver; the landing page uses it.
class MockIntersectionObserver {
	root = null;
	rootMargin = '';
	thresholds: number[] = [];
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
	takeRecords = vi.fn(() => []);
}

Object.defineProperty(window, 'IntersectionObserver', {
	writable: true,
	value: MockIntersectionObserver
});

// jsdom can run without a localStorage backing file; keep a small in-memory one.
const localStore = new Map<string, string>();
Object.defineProperty(window, 'localStorage', {
	writable: true,
	value: {
		getItem: (key: string) => localStore.get(key) ?? null,
		setItem: (key: string, value: string) => localStore.set(key, String(value)),
		removeItem: (key: string) => localStore.delete(key),
		clear: () => localStore.clear()
	}
});

// add more mocks here if you need them
