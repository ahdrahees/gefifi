import { tick } from 'svelte';

/**
 * Marquee Action for Text Overflow
 *
 * Automatically creates a scrolling marquee effect when text content exceeds its container width.
 * The animation only activates when necessary and adapts its speed based on content length.
 *
 * Features:
 * - Smart overflow detection - only animates when text is actually truncated
 * - Dynamic animation speed - longer text gets proportionally longer duration
 * - Hover pause support - works with CSS :hover selectors to pause animation
 * - Responsive behavior - recalculates on container resize events
 * - Efficient updates - uses ResizeObserver for performance
 * - Reactive content - automatically updates when text changes
 *
 * Usage:
 * ```svelte
https://claude.ai/public/artifacts/bd7c67d1-5e69-4857-9a10-e7ff7e2e7901
 * ```
 *
 * @param node - The HTML element to apply marquee animation to
 * @param text - The text content to measure and animate
 */
function marqueeAction(node: HTMLElement, text: string) {
	let shouldMarquee: boolean = false;
	let animationDuration: string = '8s';

	async function checkOverflow(): Promise<void> {
		if (!text) return;

		await tick();

		// Reset animation
		node.style.animation = 'none';
		node.style.transform = 'none';

		// Measure text width
		const temp: HTMLSpanElement = document.createElement('span');
		temp.style.visibility = 'hidden';
		temp.style.position = 'absolute';
		temp.style.whiteSpace = 'nowrap';
		temp.style.font = window.getComputedStyle(node).font;
		temp.textContent = text;
		temp.className = node.className.replace(/marquee-\w+/g, '');

		document.body.appendChild(temp);
		const textWidth: number = temp.offsetWidth;
		document.body.removeChild(temp);

		const containerWidth: number = node.parentElement!.offsetWidth - 12; // Account for padding

		if (textWidth > containerWidth) {
			shouldMarquee = true;
			const duration: number = Math.max(3, (textWidth / containerWidth) * 2);
			animationDuration = `${duration}s`;

			node.style.animation = `marquee ${animationDuration} linear infinite`;
			node.classList.add('marquee-active');
		} else {
			shouldMarquee = false;
			node.style.animation = 'none';
			node.classList.remove('marquee-active');
		}
	}

	checkOverflow();

	// Watch for resize
	const resizeObserver: ResizeObserver = new ResizeObserver(checkOverflow);
	if (node.parentElement) {
		resizeObserver.observe(node.parentElement);
	}

	return {
		update(newText: string): void {
			text = newText;
			checkOverflow();
		},
		destroy(): void {
			resizeObserver.disconnect();
		}
	};
}
