<!-- gefifi-2/src/frontend/src/routes/(app)/dashboard/+page.svelte -->
<script lang="ts">
  // Page-specific logic for the dashboard can go here.
  // For now, it's just a placeholder.
</script>

<div class="space-y-6">
  <h1 class="text-3xl font-bold text-emerald-400">Dashboard</h1>
  
  <div class="p-6 bg-slate-700/50 rounded-xl shadow-lg">
    <p class="text-slate-300">Welcome to your GEFIFI Dashboard!</p>
    <p class="mt-2 text-sm text-slate-400">
      This is where your main application content for the authenticated user will be displayed.
      Specific content will vary based on user type (Customer, Expert, Supplier).
    </p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <div class="bg-slate-700/30 p-4 rounded-lg shadow">
        <h2 class="text-xl font-semibold text-sky-400 mb-2">My Work Requests</h2>
        <p class="text-sm text-slate-400">View and manage your active work requests here.</p>
        <!-- Placeholder for actual data or link -->
    </div>
    <div class="bg-slate-700/30 p-4 rounded-lg shadow">
        <h2 class="text-xl font-semibold text-sky-400 mb-2">Recent Chats</h2>
        <p class="text-sm text-slate-400">Quick access to your ongoing conversations.</p>
    </div>
    <div class="bg-slate-700/30 p-4 rounded-lg shadow">
        <h2 class="text-xl font-semibold text-sky-400 mb-2">Active Contracts</h2>
        <p class="text-sm text-slate-400">Review your current contracts and their statuses.</p>
    </div>
  </div>
  
  <!-- TODO: Add user-type specific dashboard components -->
  <!-- 
    For Customer: Overview of their posts, interested experts/suppliers.
    For Expert: Feed of relevant work requests, ongoing discussions.
    For Supplier: Feed of material requests, ongoing discussions.
  -->
</div>