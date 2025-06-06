<!-- gefifi-2/src/frontend/src/routes/+page.svelte -->
<script lang="ts">
  // For Svelte 4, no specific script needed for this static content yet.
  // If we add interactivity or state, it will go here.

  // Placeholder for navigation functions if we add them later
  // import { goto } from '$app/navigation';

  // function navigateTo(path: string) {
  //   goto(path);
  // }
</script>

<div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-gray-900 text-gray-100 flex flex-col font-sans">

  <!-- Navigation Bar -->
  <nav class="bg-slate-900/80 backdrop-blur-md shadow-lg sticky top-0 z-50">
    <div class="container mx-auto px-6 py-4 flex justify-between items-center">
      <a href="/" class="text-3xl font-bold text-emerald-400 hover:text-emerald-300 transition-colors">
        GEFIFI
      </a>
      <div class="space-x-2 sm:space-x-4">
        <a href="/auth/login" class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out text-sm sm:text-base">
          Login
        </a>
        <a href="/auth/register" class="bg-sky-500 hover:bg-sky-600 text-white font-semibold px-3 py-2 sm:px-4 sm:py-2 rounded-lg shadow-md hover:shadow-lg transition-all duration-150 ease-in-out text-sm sm:text-base">
          Register
        </a>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <header class="flex-grow container mx-auto px-6 py-12 md:py-20 lg:py-24 flex flex-col md:flex-row items-center justify-center">
    <div class="md:w-1/2 lg:w-3/5 text-center md:text-left mb-10 md:mb-0 md:pr-8 lg:pr-12">
      <h1 class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-6 leading-tight">
        Build Your <span class="text-emerald-400">Vision</span>.
        <br />
        Connect with <span class="text-sky-400">Pros</span>.
      </h1>
      <p class="text-md sm:text-lg md:text-xl text-slate-300 mb-8 max-w-xl mx-auto md:mx-0">
        GEFIFI is your one-stop marketplace revolutionizing the construction industry in India. Find trusted experts, quality materials, and manage your projects seamlessly.
      </p>
      <div class="flex flex-col sm:flex-row justify-center md:justify-start space-y-3 sm:space-y-0 sm:space-x-4">
        <a href="/auth/register?type=customer" class="bg-emerald-500 hover:bg-emerald-600 text-white text-base sm:text-lg font-semibold px-6 py-3 sm:px-8 sm:py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150 ease-in-out w-full sm:w-auto text-center">
          Start a Project
        </a>
        <a href="/auth/register?type=expert" class="bg-sky-500 hover:bg-sky-600 text-white text-base sm:text-lg font-semibold px-6 py-3 sm:px-8 sm:py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-150 ease-in-out w-full sm:w-auto text-center">
          Offer Services
        </a>
      </div>
       <p class="mt-6 text-sm text-slate-400">
        Are you a material supplier? <a href="/auth/register?type=supplier" class="text-amber-400 hover:text-amber-300 underline font-semibold">Register here!</a>
      </p>
    </div>
    <div class="md:w-1/2 lg:w-2/5 flex justify-center items-center relative mt-8 md:mt-0">
      <div class="bg-gradient-to-br from-emerald-500/20 via-sky-500/20 to-amber-500/10 p-1.5 sm:p-2 rounded-full shadow-2xl animate-pulse-slow">
        <div class="bg-slate-800 p-0.5 sm:p-1 rounded-full">
            <img 
                src="/hero/Construction Cat Ready for Work.png" 
                alt="GEFIFI Construction Marketplace Hero Cat" 
                class="rounded-full object-cover w-60 h-60 sm:w-72 sm:h-72 md:w-80 md:h-80 lg:w-96 lg:h-96 shadow-xl border-2 sm:border-4 border-slate-700"
            />
        </div>
      </div>
       <div class="absolute -top-4 -left-4 sm:-top-8 sm:-left-8 w-20 h-20 sm:w-24 sm:h-24 bg-emerald-500/30 rounded-full filter blur-xl opacity-70 animate-blob"></div>
       <div class="absolute -bottom-4 -right-4 sm:-bottom-8 sm:-right-8 w-20 h-20 sm:w-24 sm:h-24 bg-sky-500/30 rounded-full filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
       <div class="absolute top-1/2 -right-6 sm:-right-12 w-16 h-16 sm:w-20 sm:h-20 bg-amber-500/20 rounded-full filter blur-lg opacity-60 animate-blob animation-delay-4000"></div>
    </div>
  </header>

  <!-- Value Proposition Section -->
  <section class="py-12 md:py-16 bg-slate-800/50">
    <div class="container mx-auto px-6 text-center">
      <h2 class="text-3xl md:text-4xl font-bold mb-4 text-emerald-400">Why GEFIFI?</h2>
      <p class="text-slate-300 mb-10 md:mb-12 max-w-2xl mx-auto">Streamline your construction journey from start to finish.</p>
      <div class="grid md:grid-cols-3 gap-6 md:gap-8">
        <div class="bg-slate-700/70 p-6 md:p-8 rounded-xl shadow-xl hover:shadow-emerald-500/20 transition-shadow duration-300 transform hover:-translate-y-1">
          <div class="text-emerald-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 sm:w-16 sm:h-16 mx-auto"><path stroke-linecap="round" stroke-linejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>
          </div>
          <h3 class="text-xl sm:text-2xl font-semibold mb-3 text-sky-300">Effortless Connections</h3>
          <p class="text-slate-400 text-sm sm:text-base">Quickly find and connect with verified local experts and material suppliers for any construction need.</p>
        </div>
        <div class="bg-slate-700/70 p-6 md:p-8 rounded-xl shadow-xl hover:shadow-sky-500/20 transition-shadow duration-300 transform hover:-translate-y-1">
          <div class="text-sky-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 sm:w-16 sm:h-16 mx-auto"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" /></svg>
          </div>
          <h3 class="text-xl sm:text-2xl font-semibold mb-3 text-sky-300">Local Market Boost</h3>
          <p class="text-slate-400 text-sm sm:text-base">Empowering local businesses and ensuring timely project completion with nearby resources.</p>
        </div>
        <div class="bg-slate-700/70 p-6 md:p-8 rounded-xl shadow-xl hover:shadow-amber-500/20 transition-shadow duration-300 transform hover:-translate-y-1">
          <div class="text-amber-400 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-12 h-12 sm:w-16 sm:h-16 mx-auto"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 class="text-xl sm:text-2xl font-semibold mb-3 text-sky-300">Transparent & Simple</h3>
          <p class="text-slate-400 text-sm sm:text-base">From clear communication to straightforward agreements, experience a hassle-free construction process.</p>
        </div>
      </div>
    </div>
  </section>

  <!-- How It Works Section -->
    <section class="py-12 md:py-20 lg:py-24">
        <div class="container mx-auto px-6 text-center">
            <h2 class="text-3xl md:text-4xl font-bold mb-12 md:mb-16 text-sky-400">Get Started in 3 Easy Steps</h2>
            <div class="relative">
                <div class="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 transform -translate-y-1/2" style="width: calc(66% - 2rem); margin-left: calc(17% + 1rem);"></div>
                
                <div class="grid md:grid-cols-3 gap-8 md:gap-12 relative">
                    <div class="bg-slate-800/60 p-6 md:p-8 rounded-xl shadow-2xl z-10 border border-emerald-500/30">
                        <div class="bg-emerald-500 text-slate-900 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mb-4 sm:mb-6 mx-auto ring-4 ring-emerald-500/30">1</div>
                        <h3 class="text-lg sm:text-xl font-semibold mb-2 text-emerald-300">Post Your Requirement</h3>
                        <p class="text-slate-400 text-sm">Customers detail their construction needs, budget, and timeline.</p>
                    </div>
                    <div class="bg-slate-800/60 p-6 md:p-8 rounded-xl shadow-2xl z-10 border border-sky-500/30">
                        <div class="bg-sky-500 text-slate-900 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mb-4 sm:mb-6 mx-auto ring-4 ring-sky-500/30">2</div>
                        <h3 class="text-lg sm:text-xl font-semibold mb-2 text-sky-300">Connect & Discuss</h3>
                        <p class="text-slate-400 text-sm">Experts and suppliers show interest. Discuss details and negotiate via direct chat.</p>
                    </div>
                    <div class="bg-slate-800/60 p-6 md:p-8 rounded-xl shadow-2xl z-10 border border-amber-500/30">
                        <div class="bg-amber-500 text-slate-900 w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mb-4 sm:mb-6 mx-auto ring-4 ring-amber-500/30">3</div>
                        <h3 class="text-lg sm:text-xl font-semibold mb-2 text-amber-300">Agree & Build</h3>
                        <p class="text-slate-400 text-sm">Finalize terms, create a simple contract, and start building your project!</p>
                    </div>
                </div>
            </div>
        </div>
    </section>

  <!-- Footer -->
  <footer class="bg-slate-900/80 border-t border-slate-700/50 py-8 text-center">
    <div class="container mx-auto px-6">
      <p class="text-slate-400">&copy; {new Date().getFullYear()} GEFIFI. All rights reserved.</p>
      <p class="text-sm text-slate-500 mt-1">Revolutionizing Construction in India.</p>
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
    0%, 100% {
        opacity: 0.8;
        transform: scale(1.0);
    }
    50% {
        opacity: 1;
        transform: scale(1.02);
    }
  }

  /* Ensures a base font style if not globally set */
  :global(body) {
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  }
</style>