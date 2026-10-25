<!-- src/frontend/src/lib/components/ui/DropdownMenu.svelte -->
<script lang="ts">
	import { clickOutside } from '$lib/utils/clickOutside';

	interface Props {
		// Props
		isOpen?: boolean;
		position?: 'left' | 'right';
		placement?: 'top' | 'bottom';
		autoPosition?: boolean; // Automatically adjust position based on viewport
		debug?: boolean; // Debug mode for positioning
		trigger?: import('svelte').Snippet;
		children?: import('svelte').Snippet<[any]>;
		onOpen?: () => void;
		onClose?: () => void;
	}

	let {
		isOpen = $bindable(false),
		position = 'right',
		placement = 'bottom',
		autoPosition = true,
		debug = false,
		trigger,
		children,
		onOpen,
		onClose
	}: Props = $props();

	// State for dynamic positioning
	let dropdownElement: HTMLDivElement | undefined = $state();
	let actualPosition = $state(position);
	let actualPlacement = $state(placement);

	// Sync with props when they change
	$effect(() => {
		actualPosition = position;
		actualPlacement = placement;
	});

	// Calculate optimal position
	function calculatePosition() {
		if (!autoPosition || !dropdownElement) return;

		// Use a small delay to ensure the element is rendered
		setTimeout(() => {
			const rect = dropdownElement?.getBoundingClientRect();
			const viewportWidth = window.innerWidth;
			const viewportHeight = window.innerHeight;

			if (debug) {
				console.log('Dropdown positioning debug:', {
					originalPosition: position,
					originalPlacement: placement,
					rect,
					viewportWidth,
					viewportHeight
				});
			}

			// Reset to original values
			actualPosition = position;
			actualPlacement = placement;

			// Check if dropdown would go off-screen horizontally
			if (position === 'right' && rect && rect.right > viewportWidth - 10) {
				actualPosition = 'left';
				if (debug) console.log('Switching to left position - would go off right edge');
			} else if (position === 'left' && rect && rect.left < 10) {
				actualPosition = 'right';
				if (debug) console.log('Switching to right position - would go off left edge');
			}

			// Check if dropdown would go off-screen vertically
			if (placement === 'bottom' && rect && rect.bottom > viewportHeight - 10) {
				actualPlacement = 'top';
				if (debug) console.log('Switching to top placement');
			} else if (placement === 'top' && rect && rect.top < 10) {
				actualPlacement = 'bottom';
				if (debug) console.log('Switching to bottom placement');
			}

			if (debug && rect) {
				console.log('Final positioning:', {
					actualPosition,
					actualPlacement,
					rect: {
						x: rect.x,
						y: rect.y,
						width: rect.width,
						height: rect.height,
						right: rect.right,
						bottom: rect.bottom
					},
					classes: dropdownElement?.className
				});
			}
		}, 10);
	}

	// Toggle dropdown
	function toggleDropdown() {
		isOpen = !isOpen;
		if (isOpen) {
			// Calculate position after opening
			setTimeout(() => {
				calculatePosition();
			}, 0);
			onOpen?.();
		} else {
			onClose?.();
		}
	}

	// Close dropdown
	function closeDropdown() {
		if (isOpen) {
			isOpen = false;
			onClose?.();
		}
	}

	// Handle click outside
	function handleClickOutside() {
		closeDropdown();
	}

	// Handle escape key
	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape') {
			closeDropdown();
		}
	}

	// Handle window resize
	function handleResize() {
		if (isOpen) {
			calculatePosition();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} onresize={handleResize} />

<div class="relative">
	<!-- Trigger Button -->
	<button
		type="button"
		onclick={toggleDropdown}
		class="group flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-all duration-200 hover:bg-slate-700/60 hover:text-slate-200 focus:ring-2 focus:ring-emerald-500/50 focus:outline-none {isOpen
			? 'bg-slate-700/60 text-slate-200 shadow-lg'
			: ''}"
		aria-expanded={isOpen}
		aria-haspopup="true"
		title="More options"
	>
		{#if trigger}{@render trigger()}{:else}
			<!-- Default trigger: vertical ellipsis with rotation animation -->
			<svg
				class="h-4 w-4 transition-transform duration-200 {isOpen ? 'rotate-90' : ''}"
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path
					d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"
				/>
			</svg>
		{/if}
	</button>

	<!-- Dropdown Menu -->
	{#if isOpen}
		<div
			bind:this={dropdownElement}
			use:clickOutside={handleClickOutside}
			class="dropdown-container absolute z-50 w-max max-w-[300px] min-w-[220px] {actualPlacement ===
			'top'
				? 'bottom-full mb-2'
				: 'top-full mt-2'} {actualPosition === 'left'
				? 'right-full mr-2'
				: 'left-0'} {actualPlacement === 'top' ? 'origin-bottom-left' : 'origin-top-left'}"
			role="menu"
			aria-orientation="vertical"
		>
			<div class="dropdown-menu">
				{@render children?.({ closeDropdown })}
			</div>
		</div>
	{/if}
</div>

<style>
	/* Dropdown container with beautiful styling */
	.dropdown-container {
		animation: dropdownFadeIn 0.2s ease-out;
		/* Ensure dropdown is always visible */
		max-height: 80vh;
		overflow-y: auto;
		/* Ensure proper stacking and positioning */
		z-index: 9999;
		/* Add some margin to prevent edge cases */
		margin: 4px;
		/* Ensure dropdown doesn't get cut off */
		min-width: 200px;
		/* Force positioning to work correctly */
		position: absolute !important;
	}

	.dropdown-menu {
		background: linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%);
		backdrop-filter: blur(16px);
		border: 1px solid rgba(71, 85, 105, 0.3);
		border-radius: 12px;
		box-shadow:
			0 20px 25px -5px rgba(0, 0, 0, 0.4),
			0 10px 10px -5px rgba(0, 0, 0, 0.2),
			0 0 0 1px rgba(255, 255, 255, 0.05);
		padding: 6px;
		overflow: hidden;
	}

	/* Beautiful menu items */
	:global(.dropdown-menu-item) {
		display: flex;
		width: 100%;
		align-items: center;
		padding: 12px 16px;
		font-size: 14px;
		font-weight: 500;
		color: rgb(226 232 240);
		background: none;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
		text-align: left;
		white-space: nowrap;
		position: relative;
		overflow: hidden;
	}

	:global(.dropdown-menu-item::before) {
		content: '';
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%);
		opacity: 0;
		transition: opacity 0.15s ease;
		border-radius: 8px;
	}

	:global(.dropdown-menu-item:hover::before) {
		opacity: 1;
	}

	:global(.dropdown-menu-item:hover) {
		background: rgba(51, 65, 85, 0.6);
		color: rgb(255 255 255);
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
	}

	:global(.dropdown-menu-item:active) {
		transform: translateY(0);
		transition-duration: 0.05s;
	}

	:global(.dropdown-menu-item:focus) {
		background: rgba(51, 65, 85, 0.6);
		color: rgb(255 255 255);
		outline: none;
		box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.3);
	}

	:global(.dropdown-menu-item svg) {
		margin-right: 12px;
		height: 16px;
		width: 16px;
		flex-shrink: 0;
		opacity: 0.8;
		transition: opacity 0.15s ease;
	}

	:global(.dropdown-menu-item:hover svg) {
		opacity: 1;
	}

	:global(.dropdown-menu-separator) {
		margin: 6px 0;
		height: 1px;
		background: linear-gradient(90deg, transparent, rgba(71, 85, 105, 0.6), transparent);
	}

	/* Animations */
	@keyframes dropdownFadeIn {
		from {
			opacity: 0;
			transform: translateY(-8px) scale(0.95);
		}
		to {
			opacity: 1;
			transform: translateY(0) scale(1);
		}
	}

	/* Responsive adjustments */
	@media (max-width: 640px) {
		.dropdown-menu {
			min-width: 200px;
			max-width: 250px;
		}

		:global(.dropdown-menu-item) {
			padding: 10px 14px;
			font-size: 13px;
		}
	}

	/* Chat input specific positioning */
	:global(.chat-input-dropdown) {
		/* Ensure dropdown appears above other chat elements */
		z-index: 10000;
	}
</style>
