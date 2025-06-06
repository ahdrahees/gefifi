// This file configures the rendering mode for the root layout and its children.

// Disable Server-Side Rendering (SSR) for the entire application.
// This makes the application behave like a Single Page Application (SPA)
// after the initial HTML shell is loaded. Client-side JavaScript will be
// responsible for rendering all content and handling authentication logic.
export const ssr = false;

// Disable pre-rendering for the root layout by default.
// Since SSR is false and the application relies heavily on client-side
// JavaScript for authentication and dynamic content, pre-rendering
// most authenticated pages is not beneficial or straightforward.
// Specific static pages (if any) can opt-in to pre-rendering individually
// via their own +page.ts or +layout.ts files if desired and appropriate.
export const prerender = false;