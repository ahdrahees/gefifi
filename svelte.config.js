import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		// adapter-auto only supports some environments, see https://svelte.dev/docs/kit/adapter-auto for a list.
		// If your environment is not supported, or you settled on a specific environment, switch out the adapter.
		// See https://svelte.dev/docs/kit/adapters for more information about adapters.
		// adapter: adapter({
		// 	// default options are generally good for SPAs
		// 	// pages: 'build', // default
		// 	// assets: 'build', // default
		// 	// fallback: null, // will be '200.html' or 'index.html' if not specified and ssr is false.
		// 	// precompress: false, // default
		// 	// strict: true // default
		// }),
		adapter: adapter({
			fallback: 'index.html',
			precompress: false
		}),
		files: {
			assets: 'src/frontend/static',
			lib: 'src/frontend/src/lib',
			routes: 'src/frontend/src/routes',
			appTemplate: 'src/frontend/src/app.html'
		}
		// If your app is a true SPA (no server-side rendering at all),
		// you might need to explicitly turn off SSR.
		// However, adapter-static usually handles this by default.
		// Check SvelteKit docs if you still face issues.
		// ssr: false, // Uncomment if explicitly needed
	}
};

export default config;
