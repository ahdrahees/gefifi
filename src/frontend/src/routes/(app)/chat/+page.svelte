<!-- gefifi-2/src/frontend/src/routes/(app)/chat/+page.svelte -->
<script lang="ts">
  // Page-specific logic for the chat inbox will go here.
  // This will involve fetching user's chats, displaying them,
  // and handling navigation to individual chat views.

  // Placeholder for chat data structure
  type ChatPreview = {
    id: string;
    相手の名前: string; // Placeholder for participant name(s) or chat title
    lastMessageSnippet: string;
    unreadCount?: number;
    timestamp: string;
  };

  // Mock chat data
  const mockChats: ChatPreview[] = [
    {
      id: 'chat1',
      相手の名前: 'Expert John D.',
      lastMessageSnippet: 'Okay, I will send you the quote by evening for the bathroom renovation.',
      unreadCount: 2,
      timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    },
    {
      id: 'chat2',
      相手の名前: 'Supplier ABC Materials',
      lastMessageSnippet: 'Yes, we have those tiles in stock. Delivery can be scheduled for tomorrow.',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: 'chat3',
      相手の名前: 'Customer Jane S. (Kitchen Project)',
      lastMessageSnippet: 'Thanks for your interest! Could you provide more details about your experience?',
      unreadCount: 0,
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
  ];

  // function navigateToChat(chatId: string) {
  //   goto(`/chat/${chatId}`); // Requires import { goto } from '$app/navigation';
  // }
</script>

<div class="space-y-6">
  <h1 class="text-3xl font-bold text-emerald-400">Chat Inbox</h1>

  <div class="p-6 bg-slate-700/50 rounded-xl shadow-lg">
    <p class="text-slate-300">Your conversations will appear here.</p>
    <p class="mt-2 text-sm text-slate-400">
      This page lists your active chats. Click on a chat to open the conversation.
    </p>
  </div>

  <!-- Chat List -->
  <div class="bg-slate-700/30 p-4 rounded-lg shadow space-y-3">
    {#if mockChats.length > 0}
      {#each mockChats as chat (chat.id)}
        <a 
          href="/chat/{chat.id}" 
          class="block p-4 bg-slate-600/60 hover:bg-slate-500/60 rounded-lg shadow transition-all duration-150 ease-in-out"
          aria-label="Open chat with {chat.相手の名前}"
        >
          <div class="flex justify-between items-center mb-1">
            <p class="font-semibold text-sky-300 truncate">{chat.相手の名前}</p>
            {#if chat.unreadCount && chat.unreadCount > 0}
              <span class="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {chat.unreadCount}
              </span>
            {/if}
          </div>
          <p class="text-sm text-slate-300 truncate">{chat.lastMessageSnippet}</p>
          <p class="text-xs text-slate-500 mt-1 text-right">
            {new Date(chat.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            -
            {new Date(chat.timestamp).toLocaleDateString([], { day: 'numeric', month: 'short'})}
          </p>
        </a>
      {:else}
        <p class="text-center text-slate-400 py-4">No chats yet. Start a conversation!</p>
      {/each}
    {:else}
      <p class="text-center text-slate-400 py-4">No chats available.</p>
    {/if}
  </div>
  
  <!-- TODO: 
    - Fetch and display actual chats for the logged-in user from the API.
    - Implement click handling to navigate to individual chat rooms (/chat/[chatId])
      (the <a> tag provides basic navigation for now).
    - Real-time updates or polling for new messages/chats.
  -->
</div>