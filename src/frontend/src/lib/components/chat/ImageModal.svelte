<!-- gefifi-2/src/frontend/src/lib/components/chat/ImageModal.svelte -->
<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	// --- PROPS ---
	export let show: boolean = false;
	export let imageSrc: string = '';

	// --- INTERNAL STATE ---
	let imageScale = 1;
	let imagePosition = { x: 0, y: 0 };
	let isDragging = false;
	let dragStart = { x: 0, y: 0 };
	let imageElement: HTMLImageElement;

	// Reset state when modal opens
	$: if (show) {
		imageScale = 1;
		imagePosition = { x: 0, y: 0 };
		isDragging = false;
	}

	function close() {
		dispatch('close');
	}

	function handleWheel(event: WheelEvent) {
		event.preventDefault();
		const delta = event.deltaY > 0 ? 0.9 : 1.1;
		const newScale = Math.max(0.1, Math.min(5, imageScale * delta));
		imageScale = newScale;
	}

	function handleMouseDown(event: MouseEvent) {
		if (imageScale > 1) {
			event.preventDefault();
			isDragging = true;
			dragStart = { x: event.clientX - imagePosition.x, y: event.clientY - imagePosition.y };
		}
	}

	function handleMouseMove(event: MouseEvent) {
		if (isDragging && imageScale > 1) {
			imagePosition = {
				x: event.clientX - dragStart.x,
				y: event.clientY - dragStart.y
			};
		}
	}

	function handleMouseUp() {
		isDragging = false;
	}

	// Touch support for mobile
	function handleTouchStart(event: TouchEvent) {
		if (imageScale > 1 && event.touches.length === 1) {
			event.preventDefault();
			isDragging = true;
			const touch = event.touches[0];
			dragStart = { x: touch.clientX - imagePosition.x, y: touch.clientY - imagePosition.y };
		}
	}

	function handleTouchMove(event: TouchEvent) {
		if (isDragging && imageScale > 1 && event.touches.length === 1) {
			event.preventDefault();
			const touch = event.touches[0];
			imagePosition = {
				x: touch.clientX - dragStart.x,
				y: touch.clientY - dragStart.y
			};
		}
	}

	function handleTouchEnd() {
		isDragging = false;
	}

	function resetZoom() {
		imageScale = 1;
		imagePosition = { x: 0, y: 0 };
	}

	function fitToScreen() {
		if (!imageElement) return;

		const container = imageElement.parentElement;
		if (!container) return;

		const containerRect = container.getBoundingClientRect();
		const imageRect = imageElement.getBoundingClientRect();

		const scaleX = (containerRect.width - 40) / imageRect.width; // 40px padding
		const scaleY = (containerRect.height - 40) / imageRect.height;
		const scale = Math.min(scaleX, scaleY, 1); // Don't scale up beyond original size

		imageScale = scale;
		imagePosition = { x: 0, y: 0 };
	}

	async function downloadImage() {
		if (!imageSrc) return;

		try {
			const response = await fetch(imageSrc);
			const blob = await response.blob();
			const url = URL.createObjectURL(blob);

			const link = document.createElement('a');
			link.href = url;

			// Generate filename from URL or use default
			const urlPath = new URL(imageSrc, window.location.origin).pathname;
			const fileName = urlPath.split('/').pop() || `image-${Date.now()}.png`;
			link.download = fileName;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Failed to download image:', error);
		}
	}
</script>

{#if show}
	<div
		class="image-modal-container fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
		class:dragging={isDragging}
		on:click={close}
		on:keydown={(e) => e.key === 'Escape' && close()}
		on:wheel={handleWheel}
		on:mousemove={handleMouseMove}
		on:mouseup={handleMouseUp}
		on:touchmove={handleTouchMove}
		on:touchend={handleTouchEnd}
		role="dialog"
		aria-modal="true"
		tabindex="-1"
	>
		<!-- Image Container -->
		<div
			class="relative flex h-full w-full items-center justify-center overflow-hidden p-4"
			role="button"
			tabindex="0"
			on:click={(e) => e.stopPropagation()}
			on:keydown={(e) => e.key === 'Enter' && e.stopPropagation()}
		>
			<!-- Image with zoom and pan -->
			<div
				class="relative flex items-center justify-center"
				style="transform: scale({imageScale}) translate({imagePosition.x}px, {imagePosition.y}px); transition: {isDragging
					? 'none'
					: 'transform 0.2s ease-out'};"
			>
				<button
					class="relative rounded-lg focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-black focus:outline-none"
					style="cursor: {imageScale > 1 ? 'grab' : 'zoom-in'};"
					on:mousedown={handleMouseDown}
					on:touchstart={handleTouchStart}
					on:keydown={(e) => e.key === 'Enter' && e.preventDefault()}
					aria-label="Image viewer - scroll to zoom, drag to pan"
				>
					<img
						bind:this={imageElement}
						src={imageSrc}
						alt=""
						class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl"
						on:load={fitToScreen}
					/>
				</button>
			</div>
		</div>

		<!-- Control Buttons -->
		<div class="absolute top-4 right-4 flex gap-2">
			<!-- Fit to Screen Button -->
			<button
				on:click={(e) => {
					e.stopPropagation();
					fitToScreen();
				}}
				class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
				aria-label="Fit to screen"
				title="Fit to screen"
			>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M3 4a1 1 0 011-1h4a1 1 0 010 2H6.414l2.293 2.293a1 1 0 11-1.414 1.414L5 6.414V8a1 1 0 01-2 0V4zm9 1a1 1 0 010-2h4a1 1 0 011 1v4a1 1 0 01-2 0V6.414l-2.293 2.293a1 1 0 11-1.414-1.414L13.586 5H12zm-9 7a1 1 0 012 0v1.586l2.293-2.293a1 1 0 111.414 1.414L6.414 15H8a1 1 0 010 2H4a1 1 0 01-1-1v-4zm13-1a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 010-2h1.586l-2.293-2.293a1 1 0 111.414-1.414L15 13.586V12a1 1 0 011-1z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>

			<!-- Reset Zoom Button -->
			<button
				on:click={(e) => {
					e.stopPropagation();
					resetZoom();
				}}
				class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
				aria-label="Reset zoom"
				title="Reset zoom (100%)"
			>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>

			<!-- Download Button -->
			<button
				on:click={(e) => {
					e.stopPropagation();
					downloadImage();
				}}
				class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
				aria-label="Download image"
				title="Download image"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="20"
					height="20"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="lucide lucide-download"
				>
					<path d="M12 15V3" />
					<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
					<path d="m7 10 5 5 5-5" />
				</svg>
			</button>

			<!-- Close Button -->
			<button
				on:click={(e) => {
					e.stopPropagation();
					close();
				}}
				class="flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
				aria-label="Close image"
				title="Close image"
			>
				<svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
					<path
						fill-rule="evenodd"
						d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
						clip-rule="evenodd"
					/>
				</svg>
			</button>
		</div>

		<!-- Zoom Level Indicator -->
		<div class="absolute bottom-4 left-4 rounded-lg bg-black/50 px-3 py-2 text-sm text-white">
			{Math.round(imageScale * 100)}%
		</div>

		<!-- Instructions -->
		<div class="absolute right-4 bottom-4 rounded-lg bg-black/50 px-3 py-2 text-xs text-white">
			<div>Scroll to zoom • Drag to pan</div>
		</div>
	</div>
{/if}

<style>
	/* Image modal styles */
	:global(.image-modal-container) {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
	}

	:global(.image-modal-container img) {
		user-select: none;
		-webkit-user-select: none;
		-moz-user-select: none;
		-ms-user-select: none;
		pointer-events: auto;
	}

	:global(.image-modal-container.dragging) {
		cursor: grabbing;
	}

	:global(.image-modal-container.dragging img) {
		cursor: grabbing;
	}
</style>
