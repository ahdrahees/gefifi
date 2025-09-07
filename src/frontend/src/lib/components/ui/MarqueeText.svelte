<!-- MarqueeText.svelte - Fixed Smooth Version -->
<script lang="ts">
	import { onMount, tick } from 'svelte';

	export let text: string = '';
	export let maxWidth: string = '120px';
	export let className: string = '';
	export let responsiveMaxWidth: string = '';
	export let disabled: boolean = false;
	export let speed: number = 50; // pixels per second

	let textElement: HTMLSpanElement;
	let containerElement: HTMLSpanElement;
	let shouldMarquee: boolean = false;
	let animationDuration: string = '8s';
	let isChecking: boolean = false;

	// Performance optimizations
	$: useResponsive = responsiveMaxWidth.trim() !== '';
	$: finalMaxWidth = useResponsive ? '' : maxWidth;
	$: maxWidthClasses = useResponsive ? responsiveMaxWidth : '';

	// Debounced resize handler
	let resizeTimeout: number | NodeJS.Timeout;
	const debounceResize = () => {
		clearTimeout(resizeTimeout);
		resizeTimeout = setTimeout(checkOverflow, 100);
	};

	async function checkOverflow(): Promise<void> {
		if (!textElement || !containerElement || !text || disabled || isChecking) {
			shouldMarquee = false;
			return;
		}

		isChecking = true;
		await tick();

		try {
			// Get the actual rendered container width (this respects responsive classes)
			const containerRect = containerElement.getBoundingClientRect();
			const containerStyle = window.getComputedStyle(containerElement);
			const paddingLeft = parseFloat(containerStyle.paddingLeft) || 0;
			const paddingRight = parseFloat(containerStyle.paddingRight) || 0;
			const availableWidth = containerRect.width - paddingLeft - paddingRight;

			// Only measure text if we have a valid container width
			if (availableWidth <= 0) {
				shouldMarquee = false;
				return;
			}

			// Measure actual text width with same font styles
			const temp = document.createElement('span');
			temp.style.cssText = `
				position: absolute;
				visibility: hidden;
				white-space: nowrap;
				font-family: ${containerStyle.fontFamily};
				font-size: ${containerStyle.fontSize};
				font-weight: ${containerStyle.fontWeight};
				letter-spacing: ${containerStyle.letterSpacing};
				line-height: ${containerStyle.lineHeight};
			`;
			temp.textContent = text;
			document.body.appendChild(temp);
			const textWidth = temp.getBoundingClientRect().width;
			document.body.removeChild(temp);

			// Check if text actually overflows (with minimal buffer)
			const needsMarquee = textWidth > availableWidth + 1; // Very small buffer

			// Only change state if there's a real difference
			if (needsMarquee !== shouldMarquee) {
				shouldMarquee = needsMarquee;

				if (shouldMarquee) {
					// Calculate duration for smooth animation
					const totalDistance = textWidth + 32;
					const duration = totalDistance / speed;
					animationDuration = `${Math.max(3, duration)}s`;
				}
			}
		} finally {
			isChecking = false;
		}
	}

	// Intersection Observer for performance
	let isVisible: boolean = true;
	let intersectionObserver: IntersectionObserver;

	onMount(() => {
		checkOverflow();

		intersectionObserver = new IntersectionObserver(
			(entries) => {
				isVisible = entries[0].isIntersecting;
				if (isVisible) {
					checkOverflow();
				}
			},
			{ threshold: 0.1 }
		);

		if (containerElement) {
			intersectionObserver.observe(containerElement);
		}

		const resizeObserver = new ResizeObserver(() => {
			if (isVisible && !disabled) {
				debounceResize();
			}
		});

		if (containerElement) {
			resizeObserver.observe(containerElement);
		}

		window.addEventListener('resize', debounceResize, { passive: true });

		return () => {
			clearTimeout(resizeTimeout);
			clearTimeout(checkTimeout);
			intersectionObserver?.disconnect();
			resizeObserver?.disconnect();
			window.removeEventListener('resize', debounceResize);
		};
	});

	// Reactive check when text changes - but with debounce to prevent juggling
	let checkTimeout: number | NodeJS.Timeout;
	$: if (text && isVisible && containerElement) {
		clearTimeout(checkTimeout);
		checkTimeout = setTimeout(checkOverflow, 50); // Small delay to let DOM settle
	}

	$: if (disabled) {
		shouldMarquee = false;
	}
</script>

<span
	bind:this={containerElement}
	class="inline-block overflow-hidden rounded-md bg-slate-600/30 {maxWidthClasses} {className}"
	class:px-3={shouldMarquee}
	class:px-1.5={!shouldMarquee}
	style={finalMaxWidth ? `max-width: ${finalMaxWidth};` : ''}
>
	{#if shouldMarquee && !disabled}
		<span
			bind:this={textElement}
			class="marquee-wrapper inline-block whitespace-nowrap"
			style="--duration: {animationDuration};"
		>
			<span class="marquee-content">
				<span>{text}</span>
				<span class="marquee-separator">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
				<span>{text}</span>
				<span class="marquee-separator">&nbsp;&nbsp;•&nbsp;&nbsp;</span>
			</span>
		</span>
	{:else}
		<span bind:this={textElement} class="inline-block whitespace-nowrap">
			{text}
		</span>
	{/if}
</span>

<style>
	@keyframes marquee {
		0% {
			transform: translateX(0);
		}
		100% {
			transform: translateX(-50%);
		}
	}

	.marquee-wrapper {
		will-change: transform;
	}

	.marquee-content {
		display: inline-block;
		animation: marquee linear infinite;
		animation-duration: var(--duration, 8s);
	}

	/* Pause on hover */
	span:hover .marquee-content {
		animation-play-state: paused;
	}

	/* Ensure smooth rendering */
	.marquee-content {
		transform: translateZ(0);
		backface-visibility: hidden;
	}
</style>
