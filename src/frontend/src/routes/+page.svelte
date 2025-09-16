<!-- gefifi-2/src/frontend/src/routes/+page.svelte -->
<script lang="ts">
	let imageLoaded = false;
</script>

<div
	class="flex min-h-screen flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 font-sans text-gray-100"
>
	<!-- Navigation Bar -->
	<nav class="sticky top-0 z-50 bg-slate-900/80 shadow-lg backdrop-blur-md">
		<div class="container mx-auto flex items-center justify-between px-6 py-4">
			<a href="/">
				<img src="/images/Gefifi-Logo.png" alt="GEFIFI Logo" class="h-9 w-auto sm:h-10" />
			</a>
			<div class="space-x-2 sm:space-x-4">
				<a
					href="/auth/login"
					class="rounded-lg bg-emerald-500 px-3 py-2 text-sm font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-emerald-600 hover:shadow-lg sm:px-4 sm:py-2 sm:text-base"
				>
					Login
				</a>
				<a
					href="/auth/register"
					class="rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white shadow-md transition-all duration-150 ease-in-out hover:bg-sky-600 hover:shadow-lg sm:px-4 sm:py-2 sm:text-base"
				>
					Register
				</a>
			</div>
		</div>
	</nav>

	<!-- Hero Section -->
	<header
		class="container mx-auto flex flex-grow flex-col items-center justify-center px-6 py-12 md:flex-row md:py-20 lg:py-24"
	>
		<div class="mb-10 text-center md:mb-0 md:w-1/2 md:pr-8 md:text-left lg:w-3/5 lg:pr-12">
			<h1 class="mb-6 text-4xl leading-tight font-extrabold sm:text-5xl md:text-6xl lg:text-7xl">
				Build Your <span class="text-emerald-400">Vision</span>.
				<br />
				Connect with <span class="text-sky-400">Pros</span>.
			</h1>
			<p class="text-md mx-auto mb-8 max-w-xl text-slate-300 sm:text-lg md:mx-0 md:text-xl">
				GEFIFI is your one-stop marketplace revolutionizing the construction industry in India. Find
				trusted experts, quality materials, and manage your projects seamlessly.
			</p>
			<div
				class="flex w-full flex-col justify-center space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 md:flex-col md:justify-start md:space-y-3 md:space-x-0 lg:flex-row lg:space-y-0 lg:space-x-4"
			>
				<a
					href="/auth/register?type=customer"
					class="w-full grow transform rounded-lg bg-emerald-500 px-6 py-3 text-center text-base font-semibold text-white shadow-lg transition-all duration-150 ease-in-out hover:scale-105 hover:bg-emerald-600 hover:shadow-xl sm:w-auto sm:px-8 sm:py-3 sm:text-lg"
				>
					Start a Project
					<span class="block text-sm opacity-80">as a Customer</span>
				</a>
				<a
					href="/auth/register?type=expert"
					class="w-full grow transform rounded-lg bg-sky-500 px-6 py-3 text-center text-base font-semibold text-white shadow-lg transition-all duration-150 ease-in-out hover:scale-105 hover:bg-sky-600 hover:shadow-xl sm:w-auto sm:px-8 sm:py-3 sm:text-lg"
				>
					Offer Services
					<span class="block text-sm opacity-80">as an Expert</span>
				</a>
				<a
					href="/auth/register?type=supplier"
					class="w-full grow transform rounded-lg bg-amber-500 px-6 py-3 text-center text-base font-semibold text-white shadow-lg transition-all duration-150 ease-in-out hover:scale-105 hover:bg-amber-600 hover:shadow-xl sm:w-auto sm:px-8 sm:py-3 sm:text-lg"
				>
					Provide Materials
					<span class="block text-sm opacity-80">as a Supplier</span>
				</a>
			</div>
			<!-- <p class="mt-6 text-sm text-slate-400">
				Are you a material supplier? <a
					href="/auth/register?type=supplier"
					class="font-semibold text-amber-400 underline hover:text-amber-300">Register here!</a
				>
			</p> -->
		</div>
		<div class="relative mt-8 flex items-center justify-center md:mt-0 md:w-1/2 lg:w-2/5">
			<div
				class="animate-pulse-slow rounded-3xl bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-amber-500/10 p-1.5 shadow-2xl sm:p-2"
			>
				<img
					src="/hero/Construction Cat Ready for Work.png"
					alt="GEFIFI Construction Marketplace Hero Cat"
					class="h-auto w-full rounded-2xl shadow-xl transition-opacity duration-700 ease-in-out"
					class:opacity-0={!imageLoaded}
					class:opacity-100={imageLoaded}
					on:load={() => (imageLoaded = true)}
					loading="eager"
					fetchpriority="high"
				/>
			</div>
			<div
				class="animate-blob absolute -top-4 -left-4 h-20 w-20 rounded-full bg-emerald-500/30 opacity-70 blur-xl filter sm:-top-8 sm:-left-8 sm:h-24 sm:w-24"
			></div>
			<div
				class="animate-blob animation-delay-2000 absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-sky-500/30 opacity-70 blur-xl filter sm:-right-8 sm:-bottom-8 sm:h-24 sm:w-24"
			></div>
			<div
				class="animate-blob animation-delay-4000 absolute top-1/2 -right-6 h-16 w-16 rounded-full bg-amber-500/20 opacity-60 blur-lg filter sm:-right-12 sm:h-20 sm:w-20"
			></div>
		</div>
	</header>

	<!-- Value Proposition Section -->
	<section class="bg-slate-800/50 py-12 md:py-16">
		<div class="container mx-auto px-6 text-center">
			<h2 class="mb-4 text-3xl font-bold text-emerald-400 md:text-4xl">Why GEFIFI?</h2>
			<p class="mx-auto mb-10 max-w-2xl text-slate-300 md:mb-12">
				Streamline your construction journey from start to finish.
			</p>
			<div class="grid gap-6 md:grid-cols-3 md:gap-8">
				<div
					class="transform rounded-xl bg-slate-700/70 p-6 shadow-xl transition-shadow duration-300 hover:-translate-y-1 hover:shadow-emerald-500/20 md:p-8"
				>
					<div class="mb-4 text-emerald-400">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="mx-auto h-12 w-12 sm:h-16 sm:w-16"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
							/></svg
						>
					</div>
					<h3 class="mb-3 text-xl font-semibold text-sky-300 sm:text-2xl">
						Effortless Connections
					</h3>
					<p class="text-sm text-slate-400 sm:text-base">
						Quickly find and connect with verified local experts and material suppliers for any
						construction need.
					</p>
				</div>
				<div
					class="transform rounded-xl bg-slate-700/70 p-6 shadow-xl transition-shadow duration-300 hover:-translate-y-1 hover:shadow-sky-500/20 md:p-8"
				>
					<div class="mb-4 text-sky-400">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="mx-auto h-12 w-12 sm:h-16 sm:w-16"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z"
							/></svg
						>
					</div>
					<h3 class="mb-3 text-xl font-semibold text-sky-300 sm:text-2xl">Local Market Boost</h3>
					<p class="text-sm text-slate-400 sm:text-base">
						Empowering local businesses and ensuring timely project completion with nearby
						resources.
					</p>
				</div>
				<div
					class="transform rounded-xl bg-slate-700/70 p-6 shadow-xl transition-shadow duration-300 hover:-translate-y-1 hover:shadow-amber-500/20 md:p-8"
				>
					<div class="mb-4 text-amber-400">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
							stroke-width="1.5"
							stroke="currentColor"
							class="mx-auto h-12 w-12 sm:h-16 sm:w-16"
							><path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
							/></svg
						>
					</div>
					<h3 class="mb-3 text-xl font-semibold text-sky-300 sm:text-2xl">Transparent & Simple</h3>
					<p class="text-sm text-slate-400 sm:text-base">
						From clear communication to straightforward agreements, experience a hassle-free
						construction process.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- How It Works Section -->
	<section class="py-12 md:py-20 lg:py-24">
		<div class="container mx-auto px-6 text-center">
			<h2 class="mb-12 text-3xl font-bold text-sky-400 md:mb-16 md:text-4xl">
				Get Started in 3 Easy Steps
			</h2>
			<div class="relative">
				<div
					class="absolute top-1/2 right-0 left-0 hidden h-0.5 -translate-y-1/2 transform bg-slate-700 md:block"
					style="width: calc(66% - 2rem); margin-left: calc(17% + 1rem);"
				></div>

				<div class="relative grid gap-8 md:grid-cols-3 md:gap-12">
					<div
						class="z-10 rounded-xl border border-emerald-500/30 bg-slate-800/60 p-6 shadow-2xl md:p-8"
					>
						<div
							class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-xl font-bold text-slate-900 ring-4 ring-emerald-500/30 sm:mb-6 sm:h-12 sm:w-12 sm:text-2xl"
						>
							1
						</div>
						<h3 class="mb-2 text-lg font-semibold text-emerald-300 sm:text-xl">
							Post Your Requirement
						</h3>
						<p class="text-sm text-slate-400">
							Customers detail their construction needs, budget, and timeline.
						</p>
					</div>
					<div
						class="z-10 rounded-xl border border-sky-500/30 bg-slate-800/60 p-6 shadow-2xl md:p-8"
					>
						<div
							class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-sky-500 text-xl font-bold text-slate-900 ring-4 ring-sky-500/30 sm:mb-6 sm:h-12 sm:w-12 sm:text-2xl"
						>
							2
						</div>
						<h3 class="mb-2 text-lg font-semibold text-sky-300 sm:text-xl">Connect & Discuss</h3>
						<p class="text-sm text-slate-400">
							Experts and suppliers show interest. Discuss details and negotiate via direct chat.
						</p>
					</div>
					<div
						class="z-10 rounded-xl border border-amber-500/30 bg-slate-800/60 p-6 shadow-2xl md:p-8"
					>
						<div
							class="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-amber-500 text-xl font-bold text-slate-900 ring-4 ring-amber-500/30 sm:mb-6 sm:h-12 sm:w-12 sm:text-2xl"
						>
							3
						</div>
						<h3 class="mb-2 text-lg font-semibold text-amber-300 sm:text-xl">Agree & Build</h3>
						<p class="text-sm text-slate-400">
							Finalize terms, create a simple contract, and start building your project!
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Footer -->
	<footer class="border-t border-slate-700/50 bg-slate-900/80 py-8 text-center">
		<div class="container mx-auto px-6">
			<p class="text-slate-400">&copy; {new Date().getFullYear()} GEFIFI. All rights reserved.</p>
			<p class="mt-1 text-sm text-slate-500">Revolutionizing Construction in India.</p>
		</div>
	</footer>
</div>

<style lang="postcss">
	/* Custom animation for hero blobs if needed */
	.animate-blob {
		animation: blob 7s infinite;
	}
	.animation-delay-2000 {
		animation-delay: 2s;
	}
	.animation-delay-4000 {
		animation-delay: 4s;
	}
	@keyframes blob {
		0% {
			transform: scale(1) translate(0px, 0px);
		}
		33% {
			transform: scale(1.1) translate(20px, -30px);
		}
		66% {
			transform: scale(0.9) translate(-20px, 20px);
		}
		100% {
			transform: scale(1) translate(0px, 0px);
		}
	}
	.animate-pulse-slow {
		animation: pulse-slow 5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}

	@keyframes pulse-slow {
		0%,
		100% {
			opacity: 0.8;
			transform: scale(1);
		}
		50% {
			opacity: 1;
			transform: scale(1.02);
		}
	}

	/* Ensures a base font style if not globally set */
	:global(body) {
		font-family:
			ui-sans-serif,
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial,
			'Noto Sans',
			sans-serif,
			'Apple Color Emoji',
			'Segoe UI Emoji',
			'Segoe UI Symbol',
			'Noto Color Emoji';
	}
</style>
