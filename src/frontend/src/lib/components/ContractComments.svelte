<!-- src/frontend/src/lib/components/ContractComments.svelte -->
<script lang="ts">
	import type { Contract, ContractComment } from '$lib/types';
	import AttachmentList from './AttachmentList.svelte';
	import Avatar from './Avatar.svelte';
	import FileUpload from './FileUpload.svelte';
	import type { AuthUser } from '$lib/stores/auth';

	interface Props {
		contract: Contract;
		currentUser?: AuthUser | null;
		customerProfile?: AuthUser | null;
		expertSupplierProfile?: AuthUser | null;
		onAddComment?: (detail: {
			comment: string;
			type: ContractComment['type'];
			files: File[];
		}) => void;
	}

	let {
		contract,
		currentUser = null,
		customerProfile = null,
		expertSupplierProfile = null,
		onAddComment
	}: Props = $props();

	let showAddCommentModal = $state(false);
	let commentText = $state('');
	let commentType: ContractComment['type'] = $state('general');
	let commentFiles = $state<File[]>([]);
	let isSubmitting = false;

	// Validation state
	let commentError = $state('');
	let isCommentValid = $state(false);

	// Reactive statement to validate comment and remove leading spaces
	$effect(() => {
		// Remove leading spaces
		if (commentText && commentText !== commentText.trimStart()) {
			commentText = commentText.trimStart();
		}

		// Validate comment length (minimum 1 character for emojis)
		const trimmedComment = commentText.trim();
		if (trimmedComment.length === 0) {
			commentError = '';
			isCommentValid = false;
		} else {
			commentError = '';
			isCommentValid = true;
		}
	});

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString('en-GB', {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	function getCommentTypeLabel(type: ContractComment['type']): string {
		switch (type) {
			case 'revision_request':
				return 'Revision Request';
			case 'signature_comment':
				return 'Signature Comment';
			case 'general':
				return 'General Comment';
			default:
				return 'Comment';
		}
	}

	function getCommentTypeClasses(type: ContractComment['type']): string {
		switch (type) {
			case 'revision_request':
				return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
			case 'signature_comment':
				return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
			case 'general':
				return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
			default:
				return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
		}
	}

	function openAddCommentModal() {
		showAddCommentModal = true;
		commentText = '';
		commentType = 'general';
		commentFiles = [];
		commentError = '';
		isCommentValid = false;
	}

	function closeAddCommentModal() {
		showAddCommentModal = false;
	}

	function handleAddComment() {
		if (!isCommentValid) return;

		onAddComment?.({
			comment: commentText.trim(),
			type: commentType,
			files: commentFiles
		});

		closeAddCommentModal();
	}

	function getAuthorInfo(authorId: string): { name: string; avatarUrl?: string } {
		// Check if it's the customer
		if (customerProfile && customerProfile.id === authorId) {
			return {
				name:
					customerProfile.profile?.fullName ||
					customerProfile.email?.split('@')[0] ||
					customerProfile.phoneNumber ||
					'Customer',
				avatarUrl: customerProfile.profile?.avatarUrl
			};
		}

		// Check if it's the expert/supplier
		if (expertSupplierProfile && expertSupplierProfile.id === authorId) {
			return {
				name:
					expertSupplierProfile.profile?.fullName ||
					expertSupplierProfile.email?.split('@')[0] ||
					expertSupplierProfile.phoneNumber ||
					'Expert/Supplier',
				avatarUrl: expertSupplierProfile.profile?.avatarUrl
			};
		}

		// Fallback
		return {
			name: 'Unknown User',
			avatarUrl: undefined
		};
	}

	function canAddComment(): boolean {
		if (!currentUser || !contract) return false;

		// Only contract participants can add comments
		if (currentUser.id !== contract.customerId && currentUser.id !== contract.expertSupplierId) {
			return false;
		}

		// Can add comments in draft, revision_requested, awaiting_signatures, signed, and in_progress states
		return ['draft', 'revision_requested', 'awaiting_signatures', 'signed', 'in_progress'].includes(
			contract.status
		);
	}
</script>

<section
	class="rounded-2xl border border-slate-600/30 bg-slate-800/40 p-6 shadow-xl backdrop-blur-sm"
>
	<div class="mb-4 flex items-center justify-between">
		<div class="flex items-center gap-3">
			<div class="rounded-lg bg-amber-500/20 p-2">
				<svg class="h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
					/>
				</svg>
			</div>
			<h2 class="text-lg font-bold text-amber-300">Comments & Feedback</h2>
		</div>
		{#if canAddComment()}
			<button
				onclick={openAddCommentModal}
				class="rounded-lg bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
			>
				Add Comment
			</button>
		{/if}
	</div>

	<div class="space-y-4">
		{#if contract.comments && contract.comments.length > 0}
			{#each contract.comments as comment (comment.id)}
				{#if comment.type === 'signature_comment'}
					<!-- Signature Comment - Special Styling -->
					<div
						class="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 p-4"
					>
						<!-- Signature Comment Header -->
						<div class="mb-3 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Avatar
									url={getAuthorInfo(comment.authorId).avatarUrl}
									name={getAuthorInfo(comment.authorId).name}
									size="xs"
								/>
								<div>
									<p class="text-sm font-medium text-emerald-300">
										{getAuthorInfo(comment.authorId).name}
									</p>
									<p class="text-xs text-emerald-400/70">{formatDate(comment.timestamp)}</p>
								</div>
							</div>
							<span
								class="inline-flex items-center gap-1 rounded-md border border-emerald-500/50 bg-emerald-500/20 px-2 py-1 text-xs font-medium text-emerald-300"
							>
								<svg class="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
									/>
								</svg>
								Signature Comment
							</span>
						</div>

						<!-- Signature Comment Content -->
						<div class="mb-3">
							<p class="whitespace-pre-wrap text-emerald-200">{comment.comment}</p>
						</div>

						<!-- Signature Comment Attachments -->
						{#if comment.attachments && comment.attachments.length > 0}
							<div class="mt-3">
								<AttachmentList attachments={comment.attachments} />
							</div>
						{/if}
					</div>
				{:else}
					<!-- Regular Comment -->
					<div class="rounded-xl border border-slate-600/30 bg-slate-700/50 p-4">
						<!-- Comment Header -->
						<div class="mb-3 flex items-center justify-between">
							<div class="flex items-center gap-3">
								<Avatar
									url={getAuthorInfo(comment.authorId).avatarUrl}
									name={getAuthorInfo(comment.authorId).name}
									size="xs"
								/>
								<div>
									<p class="text-sm font-medium text-slate-300">
										{getAuthorInfo(comment.authorId).name}
									</p>
									<p class="text-xs text-slate-500">{formatDate(comment.timestamp)}</p>
								</div>
							</div>
							<span
								class="inline-flex items-center rounded-md border px-2 py-1 text-xs font-medium {getCommentTypeClasses(
									comment.type
								)}"
							>
								{getCommentTypeLabel(comment.type)}
							</span>
						</div>

						<!-- Comment Content -->
						<div class="mb-3">
							<p class="whitespace-pre-wrap text-slate-200">{comment.comment}</p>
						</div>

						<!-- Comment Attachments -->
						{#if comment.attachments && comment.attachments.length > 0}
							<div class="mt-3">
								<AttachmentList attachments={comment.attachments} />
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		{:else}
			<div class="py-8 text-center">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-600/50"
				>
					<svg class="h-6 w-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
						/>
					</svg>
				</div>
				<p class="text-slate-400">No comments yet</p>
				{#if canAddComment()}
					<p class="mt-1 text-sm text-slate-500">Be the first to add a comment</p>
				{/if}
			</div>
		{/if}
	</div>
</section>

<!-- Add Comment Modal -->
{#if showAddCommentModal}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm"
		onclick={(e) => {
			if (e.target === e.currentTarget) closeAddCommentModal();
		}}
	>
		<div
			class="w-full max-w-2xl rounded-2xl border border-slate-600/30 bg-slate-800/90 p-6 shadow-2xl backdrop-blur-sm"
		>
			<div class="mb-6 flex items-center justify-between">
				<h3 class="text-xl font-bold text-slate-200">Add Comment</h3>
				<button
					onclick={closeAddCommentModal}
					class="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-700/50 hover:text-slate-300"
				>
					<svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<form
				onsubmit={(e) => {
					e.preventDefault();
					handleAddComment();
				}}
				class="space-y-4"
			>
				<!-- Comment Type -->
				<div>
					<label for="comment-type" class="mb-2 block text-sm font-medium text-slate-400">
						Comment Type
					</label>
					<select
						id="comment-type"
						bind:value={commentType}
						class="w-full rounded-lg border border-slate-600/50 bg-slate-700/50 px-4 py-2 text-slate-200 focus:border-emerald-500 focus:outline-none"
					>
						<option value="general">General Comment</option>
						{#if ['draft', 'revision_requested', 'awaiting_signatures'].includes(contract.status)}
							<option value="revision_request">Revision Request</option>
						{/if}
					</select>
				</div>

				<!-- Comment Text -->
				<div>
					<label for="comment-text" class="mb-2 block text-sm font-medium text-slate-400">
						Comment
					</label>
					<textarea
						id="comment-text"
						bind:value={commentText}
						placeholder="Enter your comment here..."
						rows="4"
						class="w-full rounded-lg border px-4 py-2 text-slate-200 placeholder-slate-500 focus:outline-none {commentError
							? 'border-red-500 bg-red-500/10'
							: 'border-slate-600/50 bg-slate-700/50 focus:border-emerald-500'}"
						required
					></textarea>
					{#if commentError}
						<p class="mt-1 text-sm text-red-400">{commentError}</p>
					{/if}
				</div>

				<!-- File Attachments -->
				<div>
					<label class="mb-2 block text-sm font-medium text-slate-400">
						Attachments (Optional)
					</label>
					<FileUpload
						acceptedFileTypes={[
							'image/jpeg',
							'image/jpg',
							'image/png',
							'image/gif',
							'image/webp',
							'application/pdf',
							'application/msword',
							'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
							'application/vnd.ms-excel',
							'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
							'.dwg',
							'.dxf'
						]}
						maxFileSize={25 * 1024 * 1024}
						multiple={true}
						bind:files={commentFiles}
					/>
				</div>

				<!-- Action Buttons -->
				<div class="flex justify-end gap-3 pt-4">
					<button
						type="button"
						onclick={closeAddCommentModal}
						class="rounded-lg bg-slate-600 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-500"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={!isCommentValid || isSubmitting}
						class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-slate-500"
					>
						{isSubmitting ? 'Adding...' : 'Add Comment'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}
