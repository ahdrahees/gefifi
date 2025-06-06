<!-- gefifi-2/src/frontend/src/routes/(app)/customer/create-request/+page.svelte -->
<script lang="ts">
  // import { goto } from '$app/navigation';
  // import { authStore } from '$lib/stores/auth'; // Assuming you have an auth store
  // import api from '$lib/api'; // Assuming you'll have an API client

  let workRequestData = {
    title: '',
    description: '',
    images: [] as string[], // Store paths of uploaded images after successful upload
    location: '',
    expectedCost: undefined as number | undefined,
    timeline: '',
    materialsSuggested: '',
    category: 'General Construction' // Default category
  };

  let imageFiles: FileList | null = null;
  let imagePreviews: string[] = [];
  let formMessage: { type: 'success' | 'error'; text: string } | null = null;
  let isLoading = false;
  let fileInputKey = Date.now(); // Used to reset file input

  // Categories for construction work
  const workCategories = [
    "General Construction",
    "Renovation",
    "Repair",
    "Plumbing",
    "Electrical",
    "Painting",
    "Masonry",
    "Carpentry",
    "Interior Design",
    "Landscaping",
    "Other"
  ];

  function handleImageChange(event: Event) {
    const input = event.target as HTMLInputElement;
    formMessage = null; // Clear previous messages related to image selection
    if (input.files) {
      if (input.files.length > 3) {
        formMessage = { type: 'error', text: 'You can upload a maximum of 3 images.' };
        // Reset file input by changing its key, which forces Svelte to re-render it
        fileInputKey = Date.now();
        imageFiles = null;
        imagePreviews = [];
        return;
      }
      
      imageFiles = input.files;
      imagePreviews = []; // Reset previews

      if (imageFiles && imageFiles.length > 0) {
        for (let i = 0; i < imageFiles.length; i++) {
          const file = imageFiles[i];
          // Basic file type check (can be more robust)
          if (!file.type.startsWith('image/')) {
            formMessage = { type: 'error', text: `File "${file.name}" is not a valid image type.` };
            fileInputKey = Date.now();
            imageFiles = null;
            imagePreviews = [];
            return;
          }
          const reader = new FileReader();
          reader.onload = (e) => {
            if (e.target?.result) {
              imagePreviews = [...imagePreviews, e.target.result as string];
            }
          };
          reader.readAsDataURL(file);
        }
      }
    }
  }

  async function handleSubmit() {
    isLoading = true;
    formMessage = null;

    if (!workRequestData.title.trim() || !workRequestData.description.trim() || !workRequestData.location.trim()) {
      formMessage = { type: 'error', text: 'Title, Description, and Location are required.' };
      isLoading = false;
      return;
    }
    if (workRequestData.expectedCost !== undefined && (isNaN(workRequestData.expectedCost) || workRequestData.expectedCost < 0)) {
        formMessage = { type: 'error', text: 'Expected cost must be a valid positive number if provided.' };
        isLoading = false;
        return;
    }

    const finalWorkRequestData = { ...workRequestData };

    // --- Placeholder for Image Upload Logic & Path Assignment ---
    // In a real app, you'd call your api.uploadFile here for each file in `imageFiles`
    // and then populate `finalWorkRequestData.images` with the returned server paths.
    if (imageFiles && imageFiles.length > 0) {
      // Simulate getting paths (replace with actual API calls)
      const uploadedPaths: string[] = [];
      for (let i = 0; i < imageFiles.length; i++) {
        // Simulate an upload and get a path.
        // In a real app: const uploadResult = await api.uploadFile(imageFiles[i]); uploadedPaths.push(uploadResult.filePath);
        uploadedPaths.push(`/uploads/mock_image_${Date.now()}_${i + 1}.jpg`);
      }
      finalWorkRequestData.images = uploadedPaths;
    } else {
      finalWorkRequestData.images = []; // Ensure it's an empty array if no images
    }

    try {
      // const response = await api.createWorkRequest(finalWorkRequestData); // Your API client
      console.log('Submitting work request (simulated):', finalWorkRequestData);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API delay
      
      formMessage = { type: 'success', text: 'Work request created successfully! (Simulated)' };
      
      // Reset form state after successful submission
      workRequestData = { 
        title: '', description: '', images: [], location: '', 
        expectedCost: undefined, timeline: '', materialsSuggested: '', 
        category: 'General Construction' 
      };
      imagePreviews = [];
      imageFiles = null;
      fileInputKey = Date.now(); // Reset file input
      // goto('/dashboard'); // Navigate to dashboard or relevant page
    } catch (error: any) {
      console.error('Failed to create work request:', error);
      formMessage = { type: 'error', text: error.response?.data?.message || error.message || 'Failed to create work request. Please try again.' };
    } finally {
      isLoading = false;
    }
  }
</script>

<div class="space-y-8 max-w-3xl mx-auto">
  <h1 class="text-3xl font-bold text-emerald-400">Create New Work Request</h1>

  <form on:submit|preventDefault={handleSubmit} class="p-6 sm:p-8 bg-slate-700/50 rounded-xl shadow-2xl space-y-6">
    
    {#if formMessage}
      <div 
        class="p-4 rounded-md text-sm {formMessage.type === 'success' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50' : 'bg-red-500/20 text-red-300 border border-red-500/50'}"
        role="alert"
      >
        {formMessage.text}
      </div>
    {/if}

    <div>
      <label for="title" class="block text-sm font-medium text-sky-300 mb-1.5">Title / Brief Summary of Work <span class="text-red-400">*</span></label>
      <input 
        type="text" 
        id="title" 
        bind:value={workRequestData.title}
        required
        class="w-full bg-slate-600/70 border border-slate-500 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
        placeholder="e.g., Bathroom Renovation, Compound Wall Construction"
      />
    </div>

    <div>
      <label for="category" class="block text-sm font-medium text-sky-300 mb-1.5">Work Category</label>
      <select 
        id="category" 
        bind:value={workRequestData.category}
        class="w-full bg-slate-600/70 border border-slate-500 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors"
      >
        {#each workCategories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>

    <div>
      <label for="description" class="block text-sm font-medium text-sky-300 mb-1.5">Detailed Description of Work <span class="text-red-400">*</span></label>
      <textarea 
        id="description" 
        bind:value={workRequestData.description}
        required
        rows="5"
        class="w-full bg-slate-600/70 border border-slate-500 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
        placeholder="Provide detailed information: dimensions, current state, desired outcome, specific requirements, etc."
      ></textarea>
    </div>

    <div>
      <label for="images" class="block text-sm font-medium text-sky-300 mb-1.5">Upload Images (Max 3, Optional)</label>
      <input 
        type="file" 
        id="images"
        multiple
        accept="image/png, image/jpeg, image/gif, image/webp"
        on:change={handleImageChange}
        class="w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 file:transition-colors cursor-pointer"
        key={fileInputKey}
      />
      {#if imagePreviews.length > 0}
        <div class="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {#each imagePreviews as previewUrl, i}
            <div class="relative aspect-square">
              <img src={previewUrl} alt="Preview {i+1}" class="rounded-md object-cover h-full w-full shadow-md" />
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div>
      <label for="location" class="block text-sm font-medium text-sky-300 mb-1.5">Site Location / Address <span class="text-red-400">*</span></label>
      <input 
        type="text" 
        id="location" 
        bind:value={workRequestData.location}
        required
        class="w-full bg-slate-600/70 border border-slate-500 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
        placeholder="Full address or specific area of the construction site"
      />
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-6">
      <div>
        <label for="expectedCost" class="block text-sm font-medium text-sky-300 mb-1.5">Expected Budget (₹, Optional)</label>
        <input 
          type="number" 
          id="expectedCost" 
          bind:value={workRequestData.expectedCost}
          min="0"
          class="w-full bg-slate-600/70 border border-slate-500 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
          placeholder="e.g., 50000"
        />
      </div>
      <div>
        <label for="timeline" class="block text-sm font-medium text-sky-300 mb-1.5">Expected Timeline (Optional)</label>
        <input 
          type="text" 
          id="timeline" 
          bind:value={workRequestData.timeline}
          class="w-full bg-slate-600/70 border border-slate-500 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
          placeholder="e.g., 2 weeks, Within 1 month"
        />
      </div>
    </div>

    <div>
      <label for="materialsSuggested" class="block text-sm font-medium text-sky-300 mb-1.5">Preferred Materials (Optional)</label>
      <textarea 
        id="materialsSuggested" 
        bind:value={workRequestData.materialsSuggested}
        rows="3"
        class="w-full bg-slate-600/70 border border-slate-500 text-gray-100 px-4 py-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors placeholder:text-slate-400"
        placeholder="e.g., Specific brands, types of tiles, wood, eco-friendly options, etc."
      ></textarea>
    </div>

    <div class="pt-4 border-t border-slate-600">
      <button 
        type="submit"
        disabled={isLoading}
        class="w-full flex justify-center items-center bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-8 py-3 rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-emerald-500 transition-all duration-150 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {#if isLoading}
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Submitting Request...
        {:else}
          Submit Work Request
        {/if}
      </button>
    </div>
  </form>
</div>