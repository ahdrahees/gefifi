<!-- gefifi-2/src/frontend/src/routes/(app)/contracts/+page.svelte -->
<script lang="ts">
  // Page-specific logic for listing contracts will go here.
  // This will involve fetching contracts for the user and displaying them.

  type ContractStatus = 'draft' | 'awaiting_signatures' | 'signed' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

  type ContractPreview = {
    id: string;
    title: string; // e.g., "Bathroom Renovation Contract"
    otherPartyName: string; // Customer name or Expert/Supplier name
    status: ContractStatus;
    contractDate: string; // ISO Date string
    workRequestId?: string;
  };

  // Mock contract data for placeholder
  const mockContracts: ContractPreview[] = [
    {
      id: 'contract101',
      title: 'Bathroom Renovation Agreement',
      otherPartyName: 'Expert Ravi Mason',
      status: 'signed',
      contractDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 days ago
      workRequestId: 'workReq001'
    },
    {
      id: 'contract102',
      title: 'Material Supply: Cement & Steel for Site A',
      otherPartyName: 'Kumar Building Materials',
      status: 'completed',
      contractDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString(), // 30 days ago
      workRequestId: 'workReq002'
    },
    {
      id: 'contract103',
      title: 'Compound Wall Construction Plan - Phase 1',
      otherPartyName: 'Customer Anita P.',
      status: 'awaiting_signatures',
      contractDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      workRequestId: 'workReq003'
    },
     {
      id: 'contract104',
      title: 'Interior Painting - Living Room & Hall',
      otherPartyName: 'Expert Painters Co.',
      status: 'draft',
      contractDate: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
      workRequestId: 'workReq004'
    },
    {
      id: 'contract105',
      title: 'Plumbing Work for New Outhouse',
      otherPartyName: 'Customer Suresh G.',
      status: 'in_progress',
      contractDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 15).toISOString(), // 15 days ago
      workRequestId: 'workReq005'
    }
  ];

  function getStatusClasses(status: ContractStatus): string {
    switch (status) {
      case 'draft': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50';
      case 'awaiting_signatures': return 'bg-sky-500/20 text-sky-300 border-sky-500/50';
      case 'signed': return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50';
      case 'in_progress': return 'bg-blue-500/20 text-blue-300 border-blue-500/50';
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/50';
      case 'disputed': return 'bg-red-500/20 text-red-300 border-red-500/50';
      case 'cancelled': return 'bg-slate-600/30 text-slate-400 border-slate-500/50';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/50';
    }
  }

  // import { goto } from '$app/navigation'; // For programmatic navigation
  // function navigateToContract(contractId: string) {
  //   goto(`/contracts/${contractId}`);
  // }
</script>

<div class="space-y-6">
  <div class="flex justify-between items-center">
    <h1 class="text-3xl font-bold text-emerald-400">My Contracts</h1>
    <!-- <button class="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-2 rounded-lg shadow-md text-sm">
      Create New Contract
    </button> -->
  </div>
  
  <div class="p-6 bg-slate-700/50 rounded-xl shadow-lg">
    <p class="text-slate-300">Overview of your construction agreements.</p>
    <p class="mt-2 text-sm text-slate-400">
      This page lists all contracts where you are involved as a customer or a service provider/supplier.
      Click on a contract to view its details, status, and sign if pending.
    </p>
  </div>

  <div class="bg-slate-700/30 p-4 rounded-lg shadow">
    {#if mockContracts.length > 0}
      <div class="space-y-4">
        {#each mockContracts as contract (contract.id)}
          <a 
            href="/contracts/{contract.id}" 
            class="block p-4 bg-slate-600/60 hover:bg-slate-500/70 rounded-lg shadow-md transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500"
            aria-label="View contract details for {contract.title}"
          >
            <div class="flex flex-col sm:flex-row justify-between sm:items-start mb-2">
              <h3 class="text-lg font-semibold text-sky-300 hover:text-sky-200 transition-colors truncate mb-1 sm:mb-0" title={contract.title}>
                {contract.title}
              </h3>
              <span 
                class="text-xs font-medium px-2.5 py-1 rounded-full border whitespace-nowrap {getStatusClasses(contract.status)}"
              >
                {contract.status.replace(/_/g, ' ').toUpperCase()}
              </span>
            </div>
            <div class="text-sm text-slate-400 space-y-0.5">
              <p>With: <span class="font-medium text-slate-200">{contract.otherPartyName}</span></p>
              <p>Date: <span class="font-medium text-slate-300">{new Date(contract.contractDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</span></p>
              {#if contract.workRequestId}
                <p>Work Request: <span class="font-medium text-amber-400 hover:underline">#{contract.workRequestId}</span></p>
              {/if}
            </div>
            <!-- Placeholder for actions like "View Details" or "Sign" -->
            <div class="mt-3 text-right">
                <span class="text-xs text-emerald-400 hover:text-emerald-300 font-medium">View Details &rarr;</span>
            </div>
          </a>
        {/each}
      </div>
    {:else}
      <p class="text-center text-slate-400 py-8">You currently have no contracts.</p>
    {/if}
  </div>
  
  <!-- TODO: 
    - Fetch and display actual contracts for the logged-in user from the API.
    - Implement functionality for the "Create New Contract" button (if applicable on this page, or link to a creation flow).
    - Implement actual navigation or modal display for contract details and signing.
    - Add filtering (by status, date) and sorting options for contracts.
    - Add pagination if the list of contracts can be long.
  -->
</div>