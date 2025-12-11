<script lang="ts">
	import { onMount } from 'svelte';
	const withBg = '/agent/logo/agent-logo-with-bg.png';
	const withoutBg = '/agent/logo/agent-logo-no-bg.png';

	let isWithBg = true;
	let klass = 'size-12';
	export { klass as class };

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
</script>

<img
	class="{klass} mix-blend-lighten transition-opacity"
	src={isWithBg ? withBg : withoutBg}
	alt="Agent Logo 1"
/>
