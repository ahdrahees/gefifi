<script lang="ts">
	type AvatarProps = {
		url?: string;
		size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
		name?: string;
	};

	let { url, size = 'md', name }: AvatarProps = $props();

	let sizeClasses = {
		xs: 'h-6 w-6',
		sm: 'h-8 w-8',
		md: 'h-10 w-10',
		lg: 'h-12 w-12',
		xl: 'h-16 w-16',
		'2xl': 'h-20 w-20'
	};

	let sizeClass = $derived(sizeClasses[size] || sizeClasses.md);
</script>

<div class=" h-fit w-fit shrink-0 rounded-full bg-slate-600/50 p-0.5">
	<img
		src={url || '/images/default-avatar.png'}
		alt="Avatar for {name}"
		class="{sizeClass} rounded-full object-cover"
	/>
</div>
