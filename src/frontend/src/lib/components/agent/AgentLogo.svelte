<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	const withBg = '/agent/logo/agent-logo-with-bg.png';
	const withoutBg = '/agent/logo/agent-logo-no-bg.png';

	let isWithBg = true;
	let klass = 'size-12';
	export { klass as class };
	let clickBlinkTimeout: NodeJS.Timeout;

	onMount(() => {
		let blinkTimout: NodeJS.Timeout;
		let blinkTimout2: NodeJS.Timeout;
		let blinkTimout3: NodeJS.Timeout;
		const interval = setInterval(async () => {
			isWithBg = !isWithBg;

			blinkTimout = setTimeout(() => {
				isWithBg = !isWithBg;
			}, 100);

			blinkTimout2 = setTimeout(() => {
				isWithBg = !isWithBg;
			}, 200);

			blinkTimout3 = setTimeout(() => {
				isWithBg = !isWithBg;
			}, 300);
		}, 5000);

		return () => {
			clearInterval(interval);
			clearTimeout(blinkTimout);
			clearTimeout(blinkTimout2);
			clearTimeout(blinkTimout3);
		};
	});

	onDestroy(() => {
		clearTimeout(clickBlinkTimeout);
	});
</script>

<img
	class="{klass} mix-blend-lighten transition-opacity"
	src={isWithBg ? withBg : withoutBg}
	alt="Agent Logo 1"
	onclick={() => {
		clearTimeout(clickBlinkTimeout);

		isWithBg = !isWithBg;
		clickBlinkTimeout = setTimeout(() => {
			isWithBg = !isWithBg;
		}, 100);
	}}
/>
