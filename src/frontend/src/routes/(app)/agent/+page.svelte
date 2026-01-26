<script lang="ts">
	import { authStore } from '$lib/stores/auth';
</script>

<div class="flex flex-1 flex-col items-center justify-center p-6 text-center">
	<!-- Ambient Background Glow -->
	<div
		class="pointer-events-none absolute top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 opacity-30"
	>
		<div
			class="h-full w-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.15),transparent_70%)]"
		></div>
	</div>

	<!-- Content -->
	<div class="relative z-10 flex flex-col items-center gap-8">
		<!-- Glass Card Logo -->
		<div
			class="relative flex h-32 w-32 items-center justify-center rounded-3xl border border-slate-700/30 bg-slate-800/30 p-6 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl transition-transform duration-500 hover:scale-105 hover:bg-slate-800/50"
		>
			<!-- Agent Logo -->
			<img
				class="h-full w-full object-contain mix-blend-lighten drop-shadow-lg transition-opacity"
				src="/agent/logo/agent-logo-with-bg.png"
				alt="Agent Logo 1"
			/>

			<!-- Inner Glow -->
			<div class="absolute inset-0 -z-10 rounded-3xl bg-emerald-500/20 blur-xl"></div>
		</div>

		<h1 class="flex flex-col gap-3 font-light">
			<span class="text-2xl text-slate-400 lg:text-3xl">
				Hi, <span class="font-medium text-slate-200"
					>{$authStore.user?.profile.fullName?.split(' ')[0] ?? 'there'}</span
				>
			</span>
			<span
				class="bg-gradient-to-br from-white via-slate-100 to-slate-400 bg-clip-text text-4xl font-semibold tracking-tight text-transparent drop-shadow-sm lg:text-6xl"
			>
				How can I help you?
			</span>
		</h1>
	</div>
</div>
