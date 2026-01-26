<script lang="ts">
	// Optimized WebP versions
	const noBgSm = '/agent/logo/optimized/no-bg-128.webp';
	const noBgMd = '/agent/logo/optimized/no-bg-256.webp';
	const noBgLg = '/agent/logo/optimized/no-bg-512.webp';

	const withBgSm = '/agent/logo/optimized/with-bg-128.webp';
	const withBgMd = '/agent/logo/optimized/with-bg-256.webp';
	const withBgLg = '/agent/logo/optimized/with-bg-512.webp';

	// Tiny base64 placeholder (16x16 low quality)
	const placeholder =
		'data:image/webp;base64,UklGRiIBAABXRUJQVlA4WAoAAAAQAAAADwAADwAAQUxQSLQAAAABgGpr27Hp/jG2bZvJTrZtp39NneTkxAOYOGm67Wjb1h1+HkJETABUbW2nRMDMalhMiVhe5Ba5tzanIyf1gO+v5Jy+DEHZFa8rsvb50WsAQE3ywqN0IGyF7ABgOPjENgBwbO/LBwDjDdZCN6OkoKQyVMp8l03wvCHJESmXU9bBamJq+oETUj43lGjrGRu7rsryuOTZ4vzS0s43h6W0Jyn99/dznCgFm5rWprL0pOQkP4EMJQFWUDggSAAAANABAJ0BKhAAEAAFQHwlsAACNrokelGAAMXeCWHEP0iFKfhd3r/sduKwigjXo2PgI/BJot8GTy0dbUi4/9rSntzg7saUL3AAAA==';

	let { class: klass = 'size-12' } = $props();

	let isLoaded = $state(false);
</script>

<div
	class="relative {klass} group overflow-hidden bg-cover bg-center transition-opacity duration-300"
	style="background-image: url({placeholder}); {isLoaded ? '' : 'filter: blur(4px);'}"
>
	<!-- Base Layer (Without Glow) -->
	<img
		class="absolute inset-0 h-full w-full object-contain mix-blend-lighten transition-opacity duration-500"
		class:opacity-0={!isLoaded}
		class:opacity-100={isLoaded}
		src={noBgMd}
		srcset="{noBgSm} 128w, {noBgMd} 256w, {noBgLg} 512w"
		sizes="(max-width: 640px) 128px, 256px"
		alt="Agent Logo Base"
		onload={() => (isLoaded = true)}
		loading="eager"
		decoding="async"
	/>

	<!-- Animated Layer (With Glow) -->
	{#if isLoaded}
		<img
			class="animate-logo-blink absolute inset-0 h-full w-full object-contain mix-blend-lighten transition-opacity duration-100 group-hover:opacity-0"
			src={withBgMd}
			srcset="{withBgSm} 128w, {withBgMd} 256w, {withBgLg} 512w"
			sizes="(max-width: 640px) 128px, 256px"
			alt="Agent Logo Glow"
			loading="eager"
			decoding="async"
		/>
	{/if}
</div>

<style>
	@keyframes logo-blink {
		/* Cycle is 5 seconds. 100ms is 2% */
		0% {
			opacity: 0;
		}
		2% {
			opacity: 1;
		}
		4% {
			opacity: 0;
		}
		6% {
			opacity: 1;
		}
		100% {
			opacity: 1;
		}
	}

	.animate-logo-blink {
		animation: logo-blink 5s infinite;
	}
</style>
