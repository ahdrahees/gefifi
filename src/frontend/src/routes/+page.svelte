<!-- gefifi-2/src/frontend/src/routes/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';

	// --- Scroll-aware navbar ---
	let scrolled = $state(false);
	let mobileMenuOpen = $state(false);

	// --- Scroll reveal via IntersectionObserver ---
	function initScrollReveal() {
		const observer = new IntersectionObserver(
			(entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						entry.target.classList.add('is-visible');
					}
				});
			},
			{ threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
		);

		document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach((el) => {
			observer.observe(el);
		});
	}


	// --- Smooth scroll for nav links ---
	function scrollTo(id: string) {
		const el = document.getElementById(id);
		if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		mobileMenuOpen = false;
	}

	onMount(() => {
		// Scroll listener for navbar
		const onScroll = () => {
			scrolled = window.scrollY > 40;
		};
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		initScrollReveal();

		return () => window.removeEventListener('scroll', onScroll);
	});


</script>

<svelte:head>
	<title>GEFIFI — India's Modern Construction Marketplace</title>
</svelte:head>

<div class="landing-page">
	<!-- =============================================
	     NAVIGATION
	     ============================================= -->
	<nav class="nav" class:nav--scrolled={scrolled}>
		<div class="nav__inner">
			<a href="/" class="nav__logo">
				<img src="/images/Gefifi-Logo.png" alt="GEFIFI" class="nav__logo-img" />
			</a>

			<!-- Desktop nav links -->
			<div class="nav__links">
				<button onclick={() => scrollTo('features')} class="nav__link">Features</button>
				<button onclick={() => scrollTo('how-it-works')} class="nav__link">How It Works</button>
			</div>

			<div class="nav__actions">
				<a href="/auth/login" class="nav__btn nav__btn--ghost">Log In</a>
				<a href="/auth/register" class="nav__btn nav__btn--primary">Get Started</a>
			</div>

			<!-- Mobile menu toggle -->
			<button
				class="nav__hamburger"
				onclick={() => (mobileMenuOpen = !mobileMenuOpen)}
				aria-label="Toggle menu"
			>
				<span class="nav__hamburger-line" class:open={mobileMenuOpen}></span>
				<span class="nav__hamburger-line" class:open={mobileMenuOpen}></span>
				<span class="nav__hamburger-line" class:open={mobileMenuOpen}></span>
			</button>
		</div>

		<!-- Mobile menu -->
		{#if mobileMenuOpen}
			<div class="nav__mobile">
				<button onclick={() => scrollTo('features')} class="nav__mobile-link">Features</button>
				<button onclick={() => scrollTo('how-it-works')} class="nav__mobile-link">How It Works</button>
				<hr class="nav__mobile-divider" />
				<a href="/auth/login" class="nav__mobile-link">Log In</a>
				<a href="/auth/register" class="nav__mobile-cta">Get Started Free</a>
			</div>
		{/if}
	</nav>

	<!-- =============================================
	     HERO SECTION
	     ============================================= -->
	<header class="hero">
		<!-- Subtle high-tech grid background -->
		<div class="hero__grid-bg"></div>

		<!-- Ambient glow orbs -->
		<div class="hero__orb hero__orb--1"></div>
		<div class="hero__orb hero__orb--2"></div>

		<div class="hero__container">
			<!-- Left column: Hero content -->
			<div class="hero__content">
				<h1 class="hero__title reveal delay-100">
					Build Your <span class="hero__title-accent">Vision</span>.<br />
					Connect with <span class="hero__title-accent-alt">Pros</span>.
				</h1>

				<p class="hero__subtitle reveal delay-200">
					GEFIFI is your one-stop marketplace for the construction industry in India.
					Find trusted experts, quality materials, and manage your projects seamlessly.
				</p>

				<div class="hero__cta-group reveal delay-300">
					<a href="/auth/register?type=customer" class="btn btn--primary btn--lg">
						Start a Project
						<span class="btn__sub">as a Customer</span>
					</a>
					<a href="/auth/register?type=expert" class="btn btn--blue btn--lg">
						Offer Services
						<span class="btn__sub">as an Expert</span>
					</a>
					<a href="/auth/register?type=supplier" class="btn btn--amber btn--lg">
						Provide Materials
						<span class="btn__sub">as a Supplier</span>
					</a>
				</div>
			</div>

			<!-- Right column: Modern glossy card showcasing the artwork -->
			<div class="hero__visual reveal-right delay-200">
				<div class="hero__image-card">
					<img
						src="/hero/hero-art.jpg"
						alt="GEFIFI Construction Marketplace Blueprint Art"
						class="hero__image-el"
						loading="eager"
						fetchpriority="high"
					/>
					<div class="hero__image-glow"></div>
				</div>
			</div>
		</div>
	</header>



	<!-- =============================================
	     FEATURES SECTION
	     ============================================= -->
	<section id="features" class="features">
		<div class="section-container">
			<div class="section-header reveal">
				<span class="section-tag">Why GEFIFI</span>
				<h2 class="section-title">Why <span class="text-brand">GEFIFI</span>?</h2>
				<p class="section-subtitle">
					Streamline your construction journey from start to finish.
				</p>
			</div>

			<div class="features__grid features__grid--three">
				<!-- Feature 1: Effortless Connections -->
				<div class="feature-card reveal delay-100">
					<div class="feature-card__icon feature-card__icon--brand">
						<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
					</div>
					<h3 class="feature-card__title">Effortless Connections</h3>
					<p class="feature-card__desc">
						Quickly find and connect with verified local experts and material suppliers for any construction need.
					</p>
				</div>

				<!-- Feature 2: Local Market Boost -->
				<div class="feature-card reveal delay-200">
					<div class="feature-card__icon feature-card__icon--blue">
						<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18M3 3v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21"/></svg>
					</div>
					<h3 class="feature-card__title">Local Market Boost</h3>
					<p class="feature-card__desc">
						Empowering local businesses and ensuring timely project completion with nearby resources.
					</p>
				</div>

				<!-- Feature 3: Transparent & Simple -->
				<div class="feature-card reveal delay-300">
					<div class="feature-card__icon feature-card__icon--amber">
						<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
					</div>
					<h3 class="feature-card__title">Transparent & Simple</h3>
					<p class="feature-card__desc">
						From clear communication to straightforward agreements, experience a hassle-free construction process.
					</p>
				</div>
			</div>
		</div>
	</section>

	<!-- =============================================
	     HOW IT WORKS
	     ============================================= -->
	<section id="how-it-works" class="how-it-works">
		<div class="section-container">
			<div class="section-header reveal">
				<span class="section-tag">How It Works</span>
				<h2 class="section-title">Get Started in<br /><span class="text-brand">3 Easy Steps</span></h2>
			</div>

			<div class="steps">
				<div class="steps__connector"></div>

				<div class="step reveal-left delay-100">
					<div class="step__number">
						<span>1</span>
					</div>
					<div class="step__content">
						<h3 class="step__title">Post Your Requirement</h3>
						<p class="step__desc">
							Customers detail their construction needs, budget, and timeline.
						</p>
					</div>
				</div>

				<div class="step reveal-right delay-200">
					<div class="step__number step__number--blue">
						<span>2</span>
					</div>
					<div class="step__content">
						<h3 class="step__title">Connect & Discuss</h3>
						<p class="step__desc">
							Experts and suppliers show interest. Discuss details and negotiate via direct chat.
						</p>
					</div>
				</div>

				<div class="step reveal-left delay-300">
					<div class="step__number step__number--amber">
						<span>3</span>
					</div>
					<div class="step__content">
						<h3 class="step__title">Agree & Build</h3>
						<p class="step__desc">
							Finalize terms, create a simple contract, and start building your project!
						</p>
					</div>
				</div>
			</div>
		</div>
	</section>



	<!-- =============================================
	     CTA BANNER
	     ============================================= -->
	<section class="cta-banner">
		<div class="cta-banner__glow"></div>
		<div class="cta-banner__content reveal">
			<h2 class="cta-banner__title">Ready to build your vision?</h2>
			<p class="cta-banner__subtitle">
				Whether you're a customer, expert, or supplier — GEFIFI is built for you.
			</p>
			<div class="cta-banner__actions">
				<a href="/auth/register?type=customer" class="btn btn--primary btn--lg">
					Start a Project
				</a>
				<a href="/auth/register?type=expert" class="btn btn--outline btn--lg">
					Join as Expert
				</a>
				<a href="/auth/register?type=supplier" class="btn btn--outline btn--lg">
					Join as Supplier
				</a>
			</div>
		</div>
	</section>

	<!-- =============================================
	     FOOTER
	     ============================================= -->
	<footer class="footer">
		<div class="footer__inner">
			<div class="footer__grid">
				<!-- Brand column -->
				<div class="footer__brand">
					<img src="/images/Gefifi-Logo.png" alt="GEFIFI" class="footer__logo" />
					<p class="footer__tagline">
						A construction marketplace connecting customers, experts, and suppliers across India.
					</p>
				</div>

				<!-- Quick Links -->
				<div class="footer__col">
					<h4 class="footer__heading">Platform</h4>
					<ul class="footer__list">
						<li><button onclick={() => scrollTo('features')} class="footer__link">Features</button></li>
						<li><button onclick={() => scrollTo('how-it-works')} class="footer__link">How It Works</button></li>
					</ul>
				</div>

				<!-- For Users -->
				<div class="footer__col">
					<h4 class="footer__heading">Get Started</h4>
					<ul class="footer__list">
						<li><a href="/auth/register?type=customer" class="footer__link">As a Customer</a></li>
						<li><a href="/auth/register?type=expert" class="footer__link">As an Expert</a></li>
						<li><a href="/auth/register?type=supplier" class="footer__link">As a Supplier</a></li>
					</ul>
				</div>

				<!-- Support -->
				<div class="footer__col">
					<h4 class="footer__heading">Support</h4>
					<ul class="footer__list">
						<li><a href="mailto:support@gefifi.com" class="footer__link">Contact Us</a></li>
						<li><a href="#" class="footer__link">Privacy Policy</a></li>
						<li><a href="#" class="footer__link">Terms of Service</a></li>
					</ul>
				</div>
			</div>

			<div class="footer__bottom">
				<p>&copy; {new Date().getFullYear()} GEFIFI. All rights reserved.</p>
			</div>
		</div>
	</footer>
</div>

<style lang="postcss">
	/* ============================================
	   PAGE WRAPPER
	   ============================================ */
	.landing-page {
		font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
		color: #e4e4e7; /* zinc-200 */
		background-color: #06090f;
		overflow-x: hidden;
	}

	/* ============================================
	   NAVIGATION
	   ============================================ */
	.nav {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		z-index: 100;
		transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
		background: transparent;
	}
	.nav--scrolled {
		background: rgba(6, 9, 15, 0.82);
		backdrop-filter: blur(20px) saturate(1.6);
		-webkit-backdrop-filter: blur(20px) saturate(1.6);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		box-shadow: 0 1px 24px rgba(0, 0, 0, 0.3);
	}
	.nav__inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}
	.nav__logo-img {
		height: 2.25rem;
		width: auto;
	}
	.nav__links {
		display: none;
		gap: 0.25rem;
	}
	@media (min-width: 768px) {
		.nav__links {
			display: flex;
		}
	}
	.nav__link {
		background: none;
		border: none;
		color: #a1a1aa;
		font-size: 0.875rem;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		cursor: pointer;
		transition: color 0.2s, background 0.2s;
	}
	.nav__link:hover {
		color: #fff;
		background: rgba(255, 255, 255, 0.06);
	}
	.nav__actions {
		display: none;
		gap: 0.75rem;
		align-items: center;
	}
	@media (min-width: 768px) {
		.nav__actions {
			display: flex;
		}
	}
	.nav__btn {
		font-size: 0.875rem;
		font-weight: 600;
		padding: 0.5rem 1.25rem;
		border-radius: 0.5rem;
		text-decoration: none;
		transition: all 0.2s;
	}
	.nav__btn--ghost {
		color: #a1a1aa;
	}
	.nav__btn--ghost:hover {
		color: #fff;
	}
	.nav__btn--primary {
		background: #10b981;
		color: #fff;
		box-shadow: 0 0 20px rgba(16, 185, 129, 0.25);
	}
	.nav__btn--primary:hover {
		background: #059669;
		box-shadow: 0 0 28px rgba(16, 185, 129, 0.4);
		transform: translateY(-1px);
	}

	/* Hamburger */
	.nav__hamburger {
		display: flex;
		flex-direction: column;
		gap: 5px;
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
	}
	@media (min-width: 768px) {
		.nav__hamburger {
			display: none;
		}
	}
	.nav__hamburger-line {
		display: block;
		width: 22px;
		height: 2px;
		background: #a1a1aa;
		border-radius: 2px;
		transition: all 0.3s;
	}
	.nav__hamburger-line.open:first-child {
		transform: translateY(7px) rotate(45deg);
	}
	.nav__hamburger-line.open:nth-child(2) {
		opacity: 0;
	}
	.nav__hamburger-line.open:last-child {
		transform: translateY(-7px) rotate(-45deg);
	}

	/* Mobile menu */
	.nav__mobile {
		display: flex;
		flex-direction: column;
		padding: 1rem 1.5rem 1.5rem;
		background: rgba(6, 9, 15, 0.95);
		backdrop-filter: blur(20px);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	@media (min-width: 768px) {
		.nav__mobile {
			display: none;
		}
	}
	.nav__mobile-link {
		background: none;
		border: none;
		color: #a1a1aa;
		font-size: 1rem;
		font-weight: 500;
		padding: 0.75rem 0;
		text-align: left;
		cursor: pointer;
		text-decoration: none;
		transition: color 0.2s;
	}
	.nav__mobile-link:hover {
		color: #fff;
	}
	.nav__mobile-divider {
		border: none;
		border-top: 1px solid rgba(255, 255, 255, 0.08);
		margin: 0.5rem 0;
	}
	.nav__mobile-cta {
		display: block;
		text-align: center;
		background: #10b981;
		color: #fff;
		font-weight: 600;
		padding: 0.75rem;
		border-radius: 0.5rem;
		text-decoration: none;
		margin-top: 0.5rem;
	}

	/* ============================================
	   HERO
	   ============================================ */
	.hero {
		position: relative;
		min-height: 100vh;
		min-height: 100dvh;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		background-color: #06090f;
	}
	.hero__grid-bg {
		position: absolute;
		inset: 0;
		background-image: radial-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px);
		background-size: 24px 24px;
		opacity: 0.35;
		mask-image: radial-gradient(ellipse at center, black, transparent 75%);
		-webkit-mask-image: radial-gradient(ellipse at center, black, transparent 75%);
		z-index: 0;
	}
	.hero__container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 3rem;
		max-width: 1200px;
		width: 100%;
		margin: 0 auto;
		padding: 7rem 1.5rem 4rem;
		position: relative;
		z-index: 10;
	}
	@media (min-width: 1024px) {
		.hero__container {
			flex-direction: row;
			justify-content: space-between;
			padding: 8rem 1.5rem 5rem;
		}
	}
	.hero__content {
		position: relative;
		max-width: 600px;
		text-align: center;
		z-index: 2;
	}
	@media (min-width: 1024px) {
		.hero__content {
			text-align: left;
			width: 50%;
		}
	}
	.hero__visual {
		width: 100%;
		display: flex;
		justify-content: center;
		z-index: 2;
	}
	@media (min-width: 1024px) {
		.hero__visual {
			width: 45%;
		}
	}
	.hero__image-card {
		position: relative;
		border-radius: 1.5rem;
		padding: 0.5rem;
		background: rgba(255, 255, 255, 0.02);
		border: 1px solid rgba(255, 255, 255, 0.06);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
		transition: transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.3s;
		overflow: hidden;
		max-width: 500px;
		width: 100%;
	}
	.hero__image-card:hover {
		transform: scale(1.01) translateY(-4px);
		border-color: rgba(16, 185, 129, 0.25);
	}
	.hero__image-el {
		width: 100%;
		height: auto;
		border-radius: 1.2rem;
		display: block;
	}
	.hero__image-glow {
		position: absolute;
		inset: 0;
		background: linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(56, 189, 248, 0.08));
		pointer-events: none;
		border-radius: 1.2rem;
	}

	/* Ambient orbs */
	.hero__orb {
		position: absolute;
		border-radius: 50%;
		filter: blur(80px);
		z-index: 1;
		pointer-events: none;
	}
	.hero__orb--1 {
		width: 400px;
		height: 400px;
		top: 10%;
		left: -5%;
		background: radial-gradient(circle, rgba(16, 185, 129, 0.15), transparent 70%);
		animation: float 8s ease-in-out infinite;
	}
	.hero__orb--2 {
		width: 300px;
		height: 300px;
		bottom: 15%;
		right: -5%;
		background: radial-gradient(circle, rgba(59, 130, 246, 0.12), transparent 70%);
		animation: float 10s ease-in-out infinite reverse;
	}

	@keyframes float {
		0%, 100% { transform: translate(0, 0); }
		50% { transform: translate(20px, -15px); }
	}

	.hero__badge {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.4rem 1rem;
		border-radius: 999px;
		font-size: 0.8rem;
		font-weight: 600;
		color: #10b981;
		background: rgba(16, 185, 129, 0.1);
		border: 1px solid rgba(16, 185, 129, 0.2);
		margin-bottom: 1.5rem;
		letter-spacing: 0.02em;
	}
	.hero__badge-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #10b981;
		animation: pulse-dot 2s ease-in-out infinite;
	}
	@keyframes pulse-dot {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(1.5); }
	}

	.hero__title {
		font-size: clamp(2.5rem, 6vw, 4.5rem);
		font-weight: 800;
		line-height: 1.1;
		color: #fff;
		letter-spacing: -0.03em;
		margin-bottom: 1.25rem;
	}
	.hero__title-accent {
		background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}
	.hero__title-accent-alt {
		background: linear-gradient(135deg, #38bdf8, #60a5fa, #93c5fd);
		-webkit-background-clip: text;
		background-clip: text;
		-webkit-text-fill-color: transparent;
	}

	.hero__subtitle {
		font-size: clamp(1rem, 2.5vw, 1.25rem);
		color: #a1a1aa;
		line-height: 1.7;
		max-width: 540px;
		margin: 0 auto 2rem;
		font-weight: 400;
	}

	.hero__cta-group {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
		flex-direction: column;
		align-items: center;
	}
	@media (min-width: 640px) {
		.hero__cta-group {
			flex-direction: row;
		}
	}

	/* ============================================
	   BUTTONS
	   ============================================ */
	.btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-weight: 600;
		border-radius: 0.75rem;
		text-decoration: none;
		border: none;
		cursor: pointer;
		transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
		font-family: inherit;
	}
	.btn--lg {
		padding: 0.875rem 2rem;
		font-size: 1rem;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 160px;
		text-align: center;
		justify-content: center;
	}
	.btn__sub {
		display: block;
		font-size: 0.8rem;
		opacity: 0.75;
		font-weight: 400;
	}
	.btn--primary {
		background: #10b981;
		color: #fff;
		box-shadow: 0 0 24px rgba(16, 185, 129, 0.3);
	}
	.btn--primary:hover {
		background: #059669;
		box-shadow: 0 0 36px rgba(16, 185, 129, 0.5);
		transform: translateY(-2px);
	}
	.btn--ghost {
		background: rgba(255, 255, 255, 0.06);
		color: #d4d4d8;
		border: 1px solid rgba(255, 255, 255, 0.1);
	}
	.btn--ghost:hover {
		background: rgba(255, 255, 255, 0.1);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.2);
	}
	.btn--outline {
		background: transparent;
		color: #d4d4d8;
		border: 1px solid rgba(255, 255, 255, 0.15);
	}
	.btn--outline:hover {
		background: rgba(255, 255, 255, 0.06);
		color: #fff;
		border-color: rgba(255, 255, 255, 0.3);
		transform: translateY(-1px);
	}
	.btn--blue {
		background: #0ea5e9;
		color: #fff;
		box-shadow: 0 0 24px rgba(14, 165, 233, 0.3);
	}
	.btn--blue:hover {
		background: #0284c7;
		box-shadow: 0 0 36px rgba(14, 165, 233, 0.5);
		transform: translateY(-2px);
	}
	.btn--amber {
		background: #f59e0b;
		color: #fff;
		box-shadow: 0 0 24px rgba(245, 158, 11, 0.3);
	}
	.btn--amber:hover {
		background: #d97706;
		box-shadow: 0 0 36px rgba(245, 158, 11, 0.5);
		transform: translateY(-2px);
	}

	/* ============================================
	   STATS BAR
	   ============================================ */
	.stats {
		position: relative;
		z-index: 10;
		background: rgba(255, 255, 255, 0.03);
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
	}
	.stats__inner {
		max-width: 1000px;
		margin: 0 auto;
		padding: 2.5rem 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 2rem;
		flex-wrap: wrap;
	}
	.stats__item {
		text-align: center;
		flex: 1;
		min-width: 120px;
	}
	.stats__number {
		display: block;
		font-size: 2.25rem;
		font-weight: 800;
		color: #fff;
		letter-spacing: -0.02em;
		line-height: 1;
	}
	.stats__label {
		display: block;
		font-size: 0.8rem;
		color: #71717a;
		margin-top: 0.4rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	.stats__divider {
		width: 1px;
		height: 40px;
		background: rgba(255, 255, 255, 0.08);
		display: none;
	}
	@media (min-width: 640px) {
		.stats__divider {
			display: block;
		}
	}

	/* ============================================
	   SECTION COMMON
	   ============================================ */
	.section-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 5rem 1.5rem;
	}
	.section-header {
		text-align: center;
		margin-bottom: 3.5rem;
	}
	.section-tag {
		display: inline-block;
		font-size: 0.75rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		color: #10b981;
		margin-bottom: 0.75rem;
		padding: 0.3rem 0.8rem;
		border-radius: 999px;
		background: rgba(16, 185, 129, 0.08);
		border: 1px solid rgba(16, 185, 129, 0.15);
	}
	.section-title {
		font-size: clamp(1.75rem, 4vw, 2.75rem);
		font-weight: 800;
		color: #fff;
		letter-spacing: -0.02em;
		line-height: 1.2;
	}
	.text-brand {
		color: #10b981;
	}
	.section-subtitle {
		margin-top: 1rem;
		font-size: 1.05rem;
		color: #71717a;
		max-width: 540px;
		margin-left: auto;
		margin-right: auto;
		line-height: 1.7;
	}

	/* ============================================
	   FEATURES
	   ============================================ */
	.features {
		background: #06090f;
	}
	.features__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}
	@media (min-width: 640px) {
		.features__grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.features__grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.feature-card {
		background: rgba(255, 255, 255, 0.03);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 2rem;
		transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
	}
	.feature-card:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.12);
		transform: translateY(-4px);
		box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
	}

	.feature-card__icon {
		width: 48px;
		height: 48px;
		border-radius: 0.75rem;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-bottom: 1.25rem;
	}
	.feature-card__icon--brand {
		background: rgba(16, 185, 129, 0.1);
		color: #34d399;
	}
	.feature-card__icon--blue {
		background: rgba(59, 130, 246, 0.1);
		color: #60a5fa;
	}
	.feature-card__icon--amber {
		background: rgba(245, 158, 11, 0.1);
		color: #fbbf24;
	}
	.feature-card__icon--purple {
		background: rgba(139, 92, 246, 0.1);
		color: #a78bfa;
	}
	.feature-card__icon--rose {
		background: rgba(244, 63, 94, 0.1);
		color: #fb7185;
	}
	.feature-card__icon--teal {
		background: rgba(20, 184, 166, 0.1);
		color: #2dd4bf;
	}

	.feature-card__title {
		font-size: 1.125rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 0.5rem;
	}
	.feature-card__desc {
		font-size: 0.9rem;
		color: #71717a;
		line-height: 1.65;
	}

	/* ============================================
	   HOW IT WORKS
	   ============================================ */
	.how-it-works {
		background: linear-gradient(180deg, #06090f 0%, #0a0f1a 100%);
	}

	.steps {
		position: relative;
		max-width: 600px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}
	.steps__connector {
		position: absolute;
		left: 27px;
		top: 28px;
		bottom: 28px;
		width: 2px;
		background: linear-gradient(180deg, #10b981, #3b82f6, #f59e0b);
		opacity: 0.25;
		border-radius: 2px;
	}

	.step {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
	}
	.step__number {
		flex-shrink: 0;
		width: 56px;
		height: 56px;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 800;
		color: #fff;
		background: rgba(16, 185, 129, 0.15);
		border: 2px solid rgba(16, 185, 129, 0.3);
		box-shadow: 0 0 24px rgba(16, 185, 129, 0.15);
	}
	.step__number--blue {
		background: rgba(59, 130, 246, 0.15);
		border-color: rgba(59, 130, 246, 0.3);
		box-shadow: 0 0 24px rgba(59, 130, 246, 0.15);
	}
	.step__number--amber {
		background: rgba(245, 158, 11, 0.15);
		border-color: rgba(245, 158, 11, 0.3);
		box-shadow: 0 0 24px rgba(245, 158, 11, 0.15);
	}

	.step__content {
		padding-top: 0.5rem;
	}
	.step__title {
		font-size: 1.2rem;
		font-weight: 700;
		color: #fff;
		margin-bottom: 0.4rem;
	}
	.step__desc {
		font-size: 0.9rem;
		color: #71717a;
		line-height: 1.65;
	}

	/* ============================================
	   TESTIMONIALS
	   ============================================ */
	.testimonials {
		background: #06090f;
	}
	.testimonials__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 1.25rem;
	}
	@media (min-width: 768px) {
		.testimonials__grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}

	.testimonial-card {
		background: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 1rem;
		padding: 2rem;
		transition: all 0.35s;
	}
	.testimonial-card:hover {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.testimonial-card__stars {
		display: flex;
		gap: 0.15rem;
		margin-bottom: 1rem;
	}
	.testimonial-card__star {
		color: #3f3f46;
	}
	.testimonial-card__star.filled {
		color: #fbbf24;
	}

	.testimonial-card__text {
		font-size: 0.95rem;
		color: #a1a1aa;
		line-height: 1.65;
		margin-bottom: 1.5rem;
		font-style: italic;
	}

	.testimonial-card__author {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}
	.testimonial-card__avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: linear-gradient(135deg, #10b981, #059669);
		color: #fff;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 700;
		font-size: 1rem;
	}
	.testimonial-card__name {
		font-weight: 600;
		color: #e4e4e7;
		font-size: 0.9rem;
	}
	.testimonial-card__role {
		font-size: 0.8rem;
		color: #52525b;
	}

	/* ============================================
	   CTA BANNER
	   ============================================ */
	.cta-banner {
		position: relative;
		padding: 5rem 1.5rem;
		text-align: center;
		overflow: hidden;
		background: linear-gradient(180deg, #06090f 0%, #0a1a12 50%, #06090f 100%);
	}
	.cta-banner__glow {
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 500px;
		height: 500px;
		border-radius: 50%;
		background: radial-gradient(circle, rgba(16, 185, 129, 0.12), transparent 60%);
		pointer-events: none;
	}
	.cta-banner__content {
		position: relative;
		z-index: 1;
		max-width: 600px;
		margin: 0 auto;
	}
	.cta-banner__title {
		font-size: clamp(1.75rem, 4vw, 2.5rem);
		font-weight: 800;
		color: #fff;
		margin-bottom: 0.75rem;
		letter-spacing: -0.02em;
	}
	.cta-banner__subtitle {
		font-size: 1.05rem;
		color: #71717a;
		margin-bottom: 2rem;
		line-height: 1.7;
	}
	.cta-banner__actions {
		display: flex;
		gap: 0.75rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	/* ============================================
	   FOOTER
	   ============================================ */
	.footer {
		background: #06090f;
		border-top: 1px solid rgba(255, 255, 255, 0.06);
	}
	.footer__inner {
		max-width: 1200px;
		margin: 0 auto;
		padding: 3.5rem 1.5rem 2rem;
	}
	.footer__grid {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2.5rem;
		margin-bottom: 3rem;
	}
	@media (min-width: 640px) {
		.footer__grid {
			grid-template-columns: 2fr 1fr 1fr 1fr;
		}
	}

	.footer__logo {
		height: 2rem;
		width: auto;
		margin-bottom: 0.75rem;
	}
	.footer__tagline {
		font-size: 0.875rem;
		color: #52525b;
		line-height: 1.6;
		max-width: 260px;
	}

	.footer__heading {
		font-size: 0.8rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: #a1a1aa;
		margin-bottom: 1rem;
	}
	.footer__list {
		list-style: none;
		padding: 0;
		margin: 0;
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}
	.footer__link {
		background: none;
		border: none;
		font-family: inherit;
		font-size: 0.875rem;
		color: #52525b;
		text-decoration: none;
		cursor: pointer;
		padding: 0;
		text-align: left;
		transition: color 0.2s;
	}
	.footer__link:hover {
		color: #d4d4d8;
	}

	.footer__bottom {
		border-top: 1px solid rgba(255, 255, 255, 0.06);
		padding-top: 1.5rem;
		text-align: center;
		font-size: 0.8rem;
		color: #3f3f46;
	}
</style>
