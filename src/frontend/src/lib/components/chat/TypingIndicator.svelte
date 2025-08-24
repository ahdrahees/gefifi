<!-- gefifi-2/src/frontend/src/lib/components/chat/TypingIndicator.svelte -->
<script lang="ts">
	export let typingUsers: Array<{ userId: string; userName: string }> = [];

	$: typingText = formatTypingText(typingUsers);

	function formatTypingText(users: Array<{ userId: string; userName: string }>): string {
		if (users.length === 0) return '';

		if (users.length === 1) {
			return `${users[0].userName} is typing...`;
		} else if (users.length === 2) {
			return `${users[0].userName} and ${users[1].userName} are typing...`;
		} else {
			const remaining = users.length - 2;
			return `${users[0].userName}, ${users[1].userName} and ${remaining} other${remaining > 1 ? 's' : ''} are typing...`;
		}
	}
</script>

{#if typingUsers.length > 0}
	<div class="typing-indicator px-4 py-2 text-sm text-slate-400">
		<div class="flex items-center gap-2">
			<!-- Animated typing dots -->
			<div class="flex gap-1">
				<div class="typing-dot"></div>
				<div class="typing-dot" style="animation-delay: 0.2s;"></div>
				<div class="typing-dot" style="animation-delay: 0.4s;"></div>
			</div>
			<!-- Typing text -->
			<span>{typingText}</span>
		</div>
	</div>
{/if}

<style>
	.typing-dot {
		width: 6px;
		height: 6px;
		background-color: #94a3b8; /* slate-400 */
		border-radius: 50%;
		animation: typing-bounce 1.4s infinite ease-in-out;
	}

	@keyframes typing-bounce {
		0%,
		80%,
		100% {
			transform: scale(0.8);
			opacity: 0.5;
		}
		40% {
			transform: scale(1);
			opacity: 1;
		}
	}
</style>
