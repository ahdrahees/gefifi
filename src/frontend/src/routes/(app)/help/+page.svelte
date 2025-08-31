<!-- gefifi-2/src/frontend/src/routes/(app)/help/+page.svelte -->
<script lang="ts">
	import { onMount } from 'svelte';
	import { authStore, type AuthUser } from '$lib/stores/auth';
	import { db } from '$lib/firebase';
	import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

	// Types for help content
	type HelpSection = {
		id: string;
		title: string;
		content: string;
		userTypes: ('customer' | 'expert' | 'supplier')[];
		links?: { text: string; url: string }[];
		expanded: boolean;
	};

	// State
	let currentUser: AuthUser | null = null;
	let searchQuery = '';
	let selectedLanguage = 'en';
	let filteredSections: HelpSection[] = [];
	let isLoading = false;

	// Language support
	const languages = [
		{ code: 'en', name: 'English', nativeName: 'English' },
		{ code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
		{ code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
		{ code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' }
	];

	// Subscribe to auth store
	authStore.subscribe((auth) => {
		currentUser = auth.user;
	});

	// Help content with internationalization structure
	const helpContent: Record<string, { sections: HelpSection[] }> = {
		en: {
			sections: [
				// CUSTOMER HELP SECTIONS
				{
					id: 'customer-getting-started',
					title: 'Getting Started as a Customer',
					content: `Welcome to GEFIFI! As a customer, you can post work requests to find skilled experts and material requests to get quotes from suppliers.

**Step 1: Complete your profile**
Add your name, location, and contact details. Upload a profile photo for better trust.

**Step 2: Post your first request**
Choose between Work Request (for hiring experts) or Material Request (for buying materials). Fill in detailed requirements and specifications.

**Step 3: Review interested professionals**
Experts and suppliers will express interest in your requests. Review their profiles, experience, and ratings.

**Step 4: Create contracts**
Formalize agreements with selected professionals. Set clear terms, timelines, and payment schedules.

**Step 5: Track your projects**
Monitor progress through our project management system. Communicate with professionals via chat.`,
					userTypes: ['customer'],
					links: [
						{ text: 'Create New Request', url: '/customer/create-request' },
						{ text: 'View My Requests', url: '/my-requests' },
						{ text: 'Edit Profile', url: '/profile' }
					],
					expanded: false
				},
				{
					id: 'customer-work-requests',
					title: 'How to Post a Work Request',
					content: `Work requests help you find skilled experts like plumbers, electricians, masons, and contractors for your construction projects.

**Step-by-step process:**

**1. Navigate to Create Request**
Go to "Create Request" and select "Work Request". You'll see the work request creation form.

**2. Fill in project details:**
- **Title**: Brief summary (e.g., "Bathroom Renovation", "Kitchen Remodeling")
- **Category**: Select from 11+ categories (Plumbing, Electrical, Masonry, etc.)
- **Description**: Detailed project requirements and specifications
- **Location**: Where the work will be performed
- **Expected Cost**: Your budget estimate (optional but helpful)
- **Timeline**: When you need the work completed
- **Materials Suggested**: Any specific material requirements

**3. Upload images**
Add photos of the work area or reference images. Supported formats: JPEG, PNG, GIF, WebP. Maximum 10 images per request, each up to 10MB.

**4. Submit your request**
Review all details before submitting. Your request will be visible to experts in your area.

**After posting:**
Experts can express interest in your project. You can invite specific experts you find. Review interested experts' profiles and start conversations through chat.`,
					userTypes: ['customer'],
					links: [
						{ text: 'Create Work Request', url: '/customer/create-work-request' },
						{ text: 'Browse Work Requests', url: '/work-requests' },
						{ text: 'Find Experts', url: '/find-professionals?type=expert' }
					],
					expanded: false
				},
				{
					id: 'customer-material-requests',
					title: 'How to Post a Material Request',
					content: `Material requests help you get quotes from suppliers for construction materials and supplies.

**Step-by-step process:**

**1. Navigate to Create Request**
Go to "Create Request" and select "Material Request". Access the material request creation form.

**2. Fill in material details:**
- **Title**: Brief description (e.g., "Cement and Steel for Foundation")
- **Description**: Detailed material requirements and specifications
- **Delivery Location**: Where materials should be delivered
- **Delivery Date**: When you need the materials (optional)
- **Link to Work Request**: Connect to existing project (optional)

**3. Add material items:**
For each material you need:
- **Item name**: (e.g., "Cement bags", "Steel rods", "Paint buckets")
- **Quantity**: (e.g., "50 bags", "2 tons", "500 ft")
- **Notes/specifications**: (e.g., "Grade 43", "10mm diameter", "Weather resistant")

**4. Upload documents**
Add specifications, drawings, or reference files. Supported file types: PDF, Word, Excel, Images, CAD files (DWG, DXF). Maximum 25MB per file, up to 20 files per request.

**5. Submit your request**
Review all details and attachments. Suppliers will receive your request and can provide quotes.`,
					userTypes: ['customer'],
					links: [
						{ text: 'Create Material Request', url: '/customer/create-material-request' },
						{ text: 'Browse Material Requests', url: '/material-requests' },
						{ text: 'Find Suppliers', url: '/find-professionals?type=supplier' }
					],
					expanded: false
				},

				// EXPERT HELP SECTIONS
				{
					id: 'expert-getting-started',
					title: 'Getting Started as an Expert',
					content: `Welcome to GEFIFI! As an expert, you can find construction projects and connect with customers who need your skills.

**First steps:**

**1. Complete your profile**
Add your expertise, experience, and location. Choose from categories like Plumbing, Electrical, Masonry, Carpentry, Interior Design, General Construction, and more.

**2. Browse work requests**
Find projects that match your skills. Filter by location, category, and budget.

**3. Express interest**
Show customers you're available for their projects. Send personalized messages explaining your relevant experience.

**4. Chat with customers**
Discuss project details and requirements. Answer questions and provide professional advice.

**5. Create contracts**
Formalize agreements for selected projects. Set clear terms, timelines, and payment schedules.`,
					userTypes: ['expert'],
					links: [
						{ text: 'Browse Work Requests', url: '/work-requests' },
						{ text: 'Edit Profile', url: '/profile' },
						{ text: 'My Projects', url: '/my-projects' }
					],
					expanded: false
				},
				{
					id: 'expert-find-work',
					title: 'Finding Work Requests',
					content: `Work requests are posted by customers looking for skilled experts. Here's how to find relevant projects:

**Browsing work requests:**
1. Go to "Work Requests" to see all available projects
2. **Filter by status**: Focus on "Open" requests
3. **Search by keywords**: Find projects matching your expertise
4. **Check location**: Look for projects in your service area
5. **Review project details**: Understand scope, timeline, and budget

**Work request statuses:**
- **Open**: Available for expressions of interest
- **In Discussion**: Customer is talking with interested experts
- **Awaiting Quotes**: Customer is collecting quotes
- **Contracted**: Project has been assigned
- **In Progress**: Work is being performed
- **Completed**: Project finished

**What to look for:**
- **Clear requirements**: Well-defined project scope
- **Reasonable timeline**: Achievable completion dates
- **Budget alignment**: Projects within your pricing range
- **Customer profile**: Complete customer information`,
					userTypes: ['expert'],
					links: [
						{ text: 'Browse Work Requests', url: '/work-requests' },
						{ text: 'Browse by Category', url: '/work-requests?category=plumbing' }
					],
					expanded: false
				},
				{
					id: 'expert-express-interest',
					title: 'Expressing Interest in Projects',
					content: `When you find a suitable work request, you can express interest to let the customer know you're available.

**How to express interest:**
1. **From work request details**: Click "Express Interest" button
2. **Add a personalized message**: Explain your relevant experience
3. **Include your approach**: Brief description of how you'd handle the project
4. **Mention timeline**: When you could start and complete the work
5. **Submit**: Customer will see your interest and can contact you

**Tips for effective interest messages:**
- **Be specific**: Reference details from the project description
- **Show expertise**: Mention relevant experience or similar projects
- **Be professional**: Use clear, respectful communication
- **Include questions**: Show you're thinking about project requirements
- **Mention availability**: When you could start the work

**After expressing interest:**
Customer can see your profile and interest message. You may receive a chat invitation from the customer. Customer might invite you to create a contract.`,
					userTypes: ['expert'],
					links: [
						{ text: 'Browse Work Requests', url: '/work-requests' },
						{ text: 'My Chats', url: '/chat' }
					],
					expanded: false
				},

				// SUPPLIER HELP SECTIONS
				{
					id: 'supplier-getting-started',
					title: 'Getting Started as a Supplier',
					content: `Welcome to GEFIFI! As a supplier, you can provide construction materials and supplies to customers and contractors.

**First steps:**

**1. Complete your profile**
Add company name, material categories, and location. Choose from categories like Cement & Steel, Paints & Finishes, Electrical Supplies, Plumbing Materials, Tools & Equipment, and more.

**2. Browse material requests**
Find customers needing your products. Filter by material type, location, and delivery requirements.

**3. Express interest**
Show customers you can fulfill their requirements. Provide detailed quotes with competitive pricing.

**4. Provide quotes**
Offer competitive pricing and delivery terms. Include quality information and certifications.

**5. Create contracts**
Formalize supply agreements. Set clear delivery terms, payment schedules, and quality standards.`,
					userTypes: ['supplier'],
					links: [
						{ text: 'Browse Material Requests', url: '/material-requests' },
						{ text: 'Edit Profile', url: '/profile' },
						{ text: 'My Projects', url: '/my-projects' }
					],
					expanded: false
				},

				// ADDITIONAL CUSTOMER SECTIONS
				{
					id: 'customer-contract-conditions',
					title: 'When Can You Create Contracts and What Are the Conditions?',
					content: `Understanding when and how you can create contracts is essential for successful project management.

**When can customers create contracts?**
- After experts or suppliers express interest in your requests
- When you want to hire someone who showed interest in your project
- Only with professionals who are in your request's interested or invited lists
- For both work requests (expert contracts) and material requests (material contracts)

**Required conditions for contract creation:**
- **Authorization**: You must be the customer who posted the request
- **Professional interest**: The expert/supplier must have expressed interest or been invited
- **Request status**: Your request should be in an appropriate status (typically 'open' or 'in_discussion')
- **Active participants**: Both you and the professional must have active accounts

**Contract creation process:**
1. **Navigate to interested professionals**: Go to your request details page
2. **Review interested parties**: Check the list of experts/suppliers who expressed interest
3. **Select a professional**: Click "Create Contract" next to their profile
4. **Fill contract details**: Complete all required fields including work scope, timeline, and payment terms
5. **Submit for signatures**: Both parties must sign to activate the contract

**Two types of contracts:**
- **Expert Contracts**: For hiring skilled workers (plumbers, electricians, contractors)
- **Material Contracts**: For purchasing materials and supplies from suppliers

**Contract authorization rules:**
- Only the customer who posted the request can initiate contract creation
- The professional must be in the interested or invited list for that specific request
- Both parties must be verified users with complete profiles
- The request must not already have an active contract with that professional`,
					userTypes: ['customer'],
					links: [
						{ text: 'View My Requests', url: '/my-requests' },
						{ text: 'Create New Request', url: '/customer/create-request' },
						{ text: 'My Contracts', url: '/contracts' }
					],
					expanded: false
				},
				{
					id: 'how-contracts-work',
					title: 'How Contracts Work - Two Contract Types',
					content: `GEFIFI supports two types of contracts, each designed for specific business relationships in the construction industry.

**Expert Contracts (for hiring skilled workers):**
- **Purpose**: Hire experts like plumbers, electricians, masons, contractors
- **Scope**: Detailed work specifications, labor requirements, and service delivery
- **Timeline**: Project start date, milestones, and completion schedule
- **Payment**: Labor costs, advance payments, and completion-based payments
- **Warranty**: Service warranty periods and quality guarantees
- **Deliverables**: Completed work, quality standards, and final inspection

**Material Contracts (for purchasing supplies):**
- **Purpose**: Purchase construction materials and supplies from suppliers
- **Scope**: Material specifications, quantities, quality grades, and brands
- **Timeline**: Delivery schedules, installation timelines, and availability
- **Payment**: Material costs, delivery charges, and payment terms
- **Quality**: Material certifications, quality standards, and return policies
- **Logistics**: Delivery location, handling requirements, and storage

**Contract workflow for both types:**
1. **Draft Status**: Contract is being created or edited
2. **Awaiting Signatures**: Both parties need to sign
3. **Signed**: Contract is active and work/delivery can begin
4. **In Progress**: Work is being performed or materials are being delivered
5. **Completed**: Project finished successfully
6. **Other statuses**: Disputed, cancelled, or terminated as needed

**Key differences:**
- **Expert contracts** focus on labor, skills, and service delivery
- **Material contracts** focus on products, quantities, and supply logistics
- **Payment terms** vary based on industry standards for each type
- **Warranty periods** differ between services and materials
- **Completion criteria** are defined differently for work vs. supply contracts`,
					userTypes: ['customer', 'expert', 'supplier'],
					links: [
						{ text: 'View My Contracts', url: '/contracts' },
						{ text: 'Create Work Request', url: '/customer/create-work-request' },
						{ text: 'Create Material Request', url: '/customer/create-material-request' }
					],
					expanded: false
				},
				{
					id: 'contract-comments-system',
					title: 'How to Comment on Contracts',
					content: `The contract comment system enables communication and collaboration throughout the contract lifecycle.

**Three types of contract comments:**

**1. General Comments**
- **Purpose**: Regular communication about contract progress
- **Who can add**: Both customer and expert/supplier
- **When to use**: Project updates, clarifications, general discussions
- **File attachments**: Yes, you can attach relevant files

**2. Revision Request Comments**
- **Purpose**: Request changes to contract terms
- **Who can add**: Both parties (customer and expert/supplier)
- **When to use**: When contract terms need modification
- **Effect**: Changes contract status to 'revision_requested'
- **File attachments**: Yes, include supporting documents

**3. Signature Comments**
- **Purpose**: Add comments when signing the contract
- **Who can add**: The person signing the contract
- **When to use**: During the digital signing process
- **Required**: Yes, signature comments are mandatory
- **File attachments**: Yes, you can attach documents with your signature

**How to add comments:**
1. **Navigate to contract**: Go to the contract details page
2. **Scroll to comments section**: Find the comments area at the bottom
3. **Choose comment type**: Select general, revision request, or signature comment
4. **Write your comment**: Add detailed, clear communication
5. **Attach files (optional)**: Add supporting documents if needed
6. **Submit**: Your comment will be visible to both parties

**Comment guidelines:**
- **Be specific**: Clearly explain your points or requests
- **Stay professional**: Maintain courteous and respectful communication
- **Include details**: Provide sufficient context for your comments
- **Attach evidence**: Include relevant files, photos, or documents
- **Respond promptly**: Address comments and questions in a timely manner

**File attachments in comments:**
- **Supported formats**: PDF, Word, Excel, images, CAD files
- **File size limit**: 25MB per file
- **Multiple files**: You can attach multiple files to a single comment
- **Security**: Files are securely stored and accessible only to contract parties`,
					userTypes: ['customer', 'expert', 'supplier'],
					links: [{ text: 'View My Contracts', url: '/contracts' }],
					expanded: false
				},
				{
					id: 'contract-editing-process',
					title: 'How to Edit Contracts - Revision Process',
					content: `Contract editing follows a structured revision process to ensure both parties agree to changes.

**Contract editing process:**

**Step 1: Request Revision**
- **Who can request**: Both customer and expert/supplier
- **When possible**: During 'draft' or 'awaiting_signatures' status
- **How to request**: Add a 'revision_request' type comment
- **Include details**: Explain what needs to be changed and why
- **Attach files**: Include supporting documents if needed
- **Status change**: Contract status changes to 'revision_requested'

**Step 2: Edit Contract (Customer Only)**
- **Who can edit**: Currently only the customer (contract creator)
- **When possible**: Only when contract status is 'revision_requested'
- **Access editing**: Click "Edit Contract" button on contract details page
- **Make changes**: Update contract terms, timeline, payment, or attachments
- **Save changes**: Contract returns to 'draft' status after editing

**Step 3: Review and Re-sign**
- **Both parties review**: Check the updated contract terms
- **Sign again**: Both parties must sign the revised contract
- **Status progression**: 'draft' → 'awaiting_signatures' → 'signed'

**Important editing rules:**
- **Only revision_requested contracts** can be edited
- **Customer authorization**: Currently only customers can edit contracts
- **Complete re-signing required**: All previous signatures are cleared after editing
- **Status reset**: Edited contracts return to draft status
- **Audit trail**: All changes and comments are preserved

**What can be edited:**
- **Work details**: Scope of work or material specifications
- **Financial terms**: Total amount, payment terms, advance amount
- **Timeline**: Start date, completion date, milestones
- **Terms and conditions**: Legal terms, warranty, cancellation policy
- **Attachments**: Add or remove contract documents

**What cannot be edited:**
- **Contract parties**: Customer and expert/supplier cannot be changed
- **Request linkage**: Cannot change which request the contract is linked to
- **Contract type**: Cannot change between expert and material contract
- **Contract ID**: Unique identifier remains the same

**Best practices for contract editing:**
- **Clear communication**: Explain revision requests thoroughly
- **Prompt responses**: Address revision requests quickly
- **Document changes**: Keep records of what was changed and why
- **Mutual agreement**: Ensure both parties understand and agree to changes`,
					userTypes: ['customer', 'expert', 'supplier'],
					links: [{ text: 'View My Contracts', url: '/contracts' }],
					expanded: false
				},
				{
					id: 'request-editing-guide',
					title: 'How to Edit Work and Material Requests',
					content: `You can edit your requests to update details, but only under specific conditions.

**When can you edit requests?**
- **Status requirement**: Only requests with 'open' status can be edited
- **Owner authorization**: Only the customer who created the request can edit
- **Account verification**: You must be logged in as a customer
- **No active contracts**: Requests with signed contracts typically cannot be edited

**What can be edited in Work Requests:**
- **Basic details**: Title, description, location
- **Project specifications**: Category, timeline, expected cost
- **Materials**: Suggested materials and requirements
- **Images**: Add new images or remove existing ones (up to 10 images)
- **Status**: Change request status if needed

**What can be edited in Material Requests:**
- **Basic details**: Title, description, delivery location, delivery date
- **Material items**: Add, remove, or modify item specifications
- **Item details**: Item names, quantities, notes, and specifications
- **Attachments**: Add new documents or remove existing ones
- **Linked requests**: Connect to or disconnect from work requests

**How to edit requests:**
1. **Go to My Requests**: Navigate to your requests list
2. **Select request**: Click on the request you want to edit
3. **Check status**: Ensure the request status is 'open'
4. **Click Edit**: Use the "Edit Request" button
5. **Make changes**: Update the necessary fields
6. **Handle files**: Add new files or remove existing ones
7. **Save changes**: Submit your updates

**File handling during editing:**
- **Work Requests**: Can update images (JPEG, PNG, GIF, WebP)
- **Material Requests**: Can update documents (PDF, Word, Excel, CAD files)
- **File limits**: Same as creation (10MB for images, 25MB for documents)
- **Existing files**: Can be removed during editing
- **New files**: Can be added during the editing process

**Editing restrictions:**
- **Contracted requests**: Cannot edit requests that have active contracts
- **Status limitations**: Only 'open' status requests can be edited
- **Owner only**: Only the customer who created the request can edit
- **Professional interest**: Editing may affect interested professionals

**Impact of editing on interested professionals:**
- **Existing interest**: Professionals who already expressed interest remain interested
- **Notifications**: Interested professionals may be notified of changes
- **Chat continuity**: Existing chats and conversations continue
- **Contract validity**: Significant changes may require contract updates`,
					userTypes: ['customer'],
					links: [
						{ text: 'My Requests', url: '/my-requests' },
						{ text: 'Create New Request', url: '/customer/create-request' }
					],
					expanded: false
				},

				// ADDITIONAL EXPERT SECTIONS
				{
					id: 'expert-contract-perspective',
					title: 'Creating Contracts from Expert Perspective',
					content: `As an expert, you can also initiate contract creation after expressing interest in work requests.

**When can experts create contracts?**
- After expressing interest in a customer's work request
- When invited by a customer to their work request
- Only for work requests where you're in the interested or invited list
- When the work request status allows contract creation

**Expert contract creation process:**
1. **Express interest first**: Show interest in relevant work requests
2. **Wait for customer response**: Customer may contact you via chat
3. **Discuss project details**: Clarify requirements, timeline, and expectations
4. **Initiate contract**: You can also create the contract if customer agrees
5. **Fill contract details**: Add your professional terms and conditions
6. **Submit for signatures**: Both parties must sign to activate

**What experts should include in contracts:**
- **Detailed work scope**: Specific tasks, methods, and deliverables
- **Professional standards**: Quality standards and industry best practices
- **Timeline commitments**: Realistic start dates and completion schedules
- **Material responsibilities**: Who provides what materials and tools
- **Payment terms**: Fair pricing, advance requirements, and payment schedule
- **Warranty provisions**: Service guarantees and maintenance periods

**Expert contract authorization:**
- Must have expressed interest or been invited to the work request
- Must be a verified expert with complete profile
- Cannot create multiple contracts for the same work request
- Customer must approve and sign the contract for it to be valid`,
					userTypes: ['expert'],
					links: [
						{ text: 'Browse Work Requests', url: '/work-requests' },
						{ text: 'My Contracts', url: '/contracts' }
					],
					expanded: false
				},

				// ADDITIONAL SUPPLIER SECTIONS
				{
					id: 'supplier-find-requests',
					title: 'How to Find Material Requests',
					content: `Material requests are posted by customers needing construction materials. Here's how to find relevant opportunities:

**Browsing material requests:**
1. Go to "Material Requests" to see all requirements
2. **Filter by status**: Focus on "Open" and "Quoting" requests
3. **Search by material type**: Find requests for your products
4. **Check delivery location**: Look for requests in your delivery area
5. **Review requirements**: Understand quantities and specifications

**Material request statuses:**
- **Open**: Available for expressions of interest
- **Quoting**: Customer is collecting quotes from suppliers
- **Ordered**: Customer has placed an order
- **Contracted**: Supply agreement is in place
- **Completed**: Materials delivered successfully

**What to look for:**
- **Clear specifications**: Well-defined material requirements
- **Reasonable quantities**: Orders you can fulfill
- **Delivery timeline**: Achievable delivery dates
- **Complete customer info**: Verified customer details

**Finding the right opportunities:**
- **Match your inventory**: Look for materials you stock or can source
- **Consider delivery area**: Focus on locations you can serve efficiently
- **Check quantity requirements**: Ensure you can meet the volume needed
- **Review delivery timelines**: Confirm you can meet the schedule
- **Assess customer credibility**: Look for complete customer profiles`,
					userTypes: ['supplier'],
					links: [
						{ text: 'Browse Material Requests', url: '/material-requests' },
						{ text: 'Filter by Material Type', url: '/material-requests?category=cement' }
					],
					expanded: false
				},
				{
					id: 'supplier-express-interest',
					title: 'How to Send Interest and Provide Quotes',
					content: `When you find a material request you can fulfill, express interest and provide detailed quotes.

**How to express interest:**
1. **From material request details**: Click "Express Interest" button
2. **Provide detailed quote**: Include pricing for each item
3. **Specify delivery terms**: Timeline, location, and delivery charges
4. **Add quality information**: Brand details, specifications, certifications
5. **Include minimum order**: If you have minimum quantity requirements
6. **Submit**: Customer will see your quote and can contact you

**Quote components to include:**
- **Item-wise pricing**: Price per unit for each material
- **Quantity discounts**: Better rates for larger orders
- **Delivery charges**: Transportation and handling costs
- **Delivery timeline**: How quickly you can deliver
- **Payment terms**: Credit terms, advance requirements
- **Quality assurance**: Brand names, quality certificates

**Tips for competitive quotes:**
- **Be detailed**: Specify exact materials and quality grades
- **Show flexibility**: Offer alternative materials if available
- **Highlight advantages**: Faster delivery, better quality, competitive pricing
- **Be responsive**: Quick responses show professionalism
- **Provide references**: Mention past successful deliveries

**After expressing interest:**
- Customer can see your quote and profile
- You may receive a chat invitation for discussions
- Customer might create a material contract with you
- Be prepared to negotiate terms and answer questions`,
					userTypes: ['supplier'],
					links: [
						{ text: 'Browse Material Requests', url: '/material-requests' },
						{ text: 'My Chats', url: '/chat' }
					],
					expanded: false
				},
				{
					id: 'supplier-contract-perspective',
					title: 'Creating Material Contracts from Supplier Perspective',
					content: `As a supplier, you can also initiate material contract creation after expressing interest in material requests.

**When can suppliers create contracts?**
- After expressing interest in a customer's material request
- When invited by a customer to their material request
- Only for material requests where you're in the interested or invited list
- When the material request status allows contract creation

**Supplier contract creation process:**
1. **Express interest first**: Show interest in relevant material requests
2. **Provide detailed quote**: Include comprehensive pricing and terms
3. **Discuss requirements**: Clarify specifications, delivery, and quality standards
4. **Initiate contract**: You can create the contract if customer agrees
5. **Fill contract details**: Add your supply terms and conditions
6. **Submit for signatures**: Both parties must sign to activate

**What suppliers should include in contracts:**
- **Material specifications**: Exact grades, brands, and quality standards
- **Quantity details**: Precise quantities and measurement units
- **Delivery terms**: Timeline, location, handling, and logistics
- **Quality certifications**: Material certificates and compliance documents
- **Payment terms**: Pricing, advance requirements, and credit terms
- **Return policy**: Conditions for returns or exchanges

**Supplier contract authorization:**
- Must have expressed interest or been invited to the material request
- Must be a verified supplier with complete profile
- Cannot create multiple contracts for the same material request
- Customer must approve and sign the contract for it to be valid`,
					userTypes: ['supplier'],
					links: [
						{ text: 'Browse Material Requests', url: '/material-requests' },
						{ text: 'My Contracts', url: '/contracts' }
					],
					expanded: false
				},

				// COMMON HELP SECTIONS
				{
					id: 'chat-communication',
					title: 'Using the Chat System',
					content: `GEFIFI's chat system enables real-time communication between customers, experts, and suppliers.

**Chat features:**
- **Text messages**: Send and receive instant messages
- **Voice messages**: Record and send audio messages (up to 5 minutes)
- **Image sharing**: Share photos, documents, and files
- **Typing indicators**: See when others are typing
- **Online status**: Know when participants are available
- **Message history**: Access complete conversation history

**How to start a chat:**
1. **Express interest**: Automatically creates a chat with the customer
2. **From profiles**: Send interest from professional profiles
3. **Contract discussions**: Chats are created for each contract

**Voice messages:**
Press and hold the microphone button to record. Listen to your recording before sending. Release to send, or swipe to cancel.

**File sharing:**
Share images (JPEG, PNG, GIF, WebP up to 10MB) and documents (PDF, Word, Excel up to 25MB). Send up to 10 files at once.

**Privacy and security:**
All messages and files are securely stored. Only chat participants can see messages. Files are protected with time-limited access.`,
					userTypes: ['customer', 'expert', 'supplier'],
					links: [{ text: 'Open Chat', url: '/chat' }],
					expanded: false
				},
				{
					id: 'profile-management',
					title: 'Managing Your Profile',
					content: `Your profile is crucial for building trust and attracting the right opportunities.

**Profile sections:**
- **Basic information**: Name, email, location, phone number
- **Professional details**: Experience, expertise/category
- **Profile photo**: Upload a professional avatar image
- **Company information**: For suppliers, add company details

**For customers:**
- **Full name**: Your name for communications
- **Location**: Your project location area
- **Contact**: Phone number for urgent communications

**For experts:**
- **Expertise**: Your specialization (Plumbing, Electrical, etc.)
- **Experience**: Years in the construction industry
- **Service area**: Locations where you work

**For suppliers:**
- **Company name**: Your business name
- **Category**: Types of materials you supply
- **Supply area**: Delivery locations you serve

**Profile photo guidelines:**
Professional appearance with clear, high-quality image. Supported formats: JPEG, PNG, GIF, WebP, SVG. Maximum 2MB file size. Square images work best.

**Why complete your profile:**
Complete profiles get more responses, help with better matching, and show you're serious about your business.`,
					userTypes: ['customer', 'expert', 'supplier'],
					links: [{ text: 'Edit Profile', url: '/profile' }],
					expanded: false
				},
				{
					id: 'troubleshooting',
					title: 'Troubleshooting Common Issues',
					content: `Solutions to common problems and technical issues.

**Login and account issues:**
- **Forgot password**: Use the password reset option on login page
- **Account locked**: Contact support if you can't access your account
- **Profile updates**: Refresh the page if changes don't appear immediately
- **Session expired**: Log out and log back in if you see authentication errors

**File upload issues:**
- **Large files**: Ensure files are under size limits (2MB for avatars, 25MB for documents)
- **Unsupported formats**: Check that file types are supported
- **Upload failures**: Try refreshing the page and uploading again
- **Image previews**: Clear browser cache if images don't display properly

**Chat and messaging:**
- **Messages not sending**: Check your internet connection
- **Voice messages not playing**: Ensure browser has media permissions
- **File sharing failures**: Verify file size and format requirements
- **Connection issues**: Refresh the page or restart your browser

**Performance issues:**
- **Slow loading**: Clear browser cache and cookies
- **Browser compatibility**: Use updated versions of Chrome, Firefox, or Safari
- **Mobile issues**: Try the desktop version for full functionality
- **Offline access**: Some features require internet connection

**When to contact support:**
Contact support for payment issues, account verification problems, persistent technical bugs, or if this help section doesn't answer your question.`,
					userTypes: ['customer', 'expert', 'supplier'],
					links: [{ text: 'Contact Support', url: '#contact-support' }],
					expanded: false
				}
			]
		},
		// Placeholder for other languages
		hi: { sections: [] },
		ml: { sections: [] },
		ta: { sections: [] }
	};

	// Analytics function
	async function trackHelpAnalytics(data: any) {
		if (!currentUser) return;

		try {
			const analyticsDoc = doc(db, 'help_analytics', `${Date.now()}_${currentUser.id}`);
			await setDoc(analyticsDoc, {
				...data,
				timestamp: serverTimestamp(),
				userId: currentUser.id,
				userType: currentUser.userType
			});
		} catch (error) {
			console.error('Failed to track help analytics:', error);
		}
	}

	// Search functionality
	function searchHelpContent(query: string) {
		const sections = helpContent[selectedLanguage]?.sections || [];
		if (!query.trim()) {
			filteredSections = sections.filter((section) =>
				currentUser ? section.userTypes.includes(currentUser.userType) : true
			);
			return;
		}

		const searchTerms = query.toLowerCase().split(' ');
		filteredSections = sections.filter((section) => {
			if (currentUser && !section.userTypes.includes(currentUser.userType)) {
				return false;
			}

			const searchableText = `${section.title} ${section.content}`.toLowerCase();
			return searchTerms.every((term) => searchableText.includes(term));
		});

		trackHelpAnalytics({
			action: 'search',
			sectionId: 'search',
			metadata: { query, resultsCount: filteredSections.length }
		});
	}

	// Expand/collapse sections
	function toggleSection(sectionId: string) {
		const section = filteredSections.find((s) => s.id === sectionId);
		if (section) {
			section.expanded = !section.expanded;
			filteredSections = [...filteredSections];

			trackHelpAnalytics({
				action: section.expanded ? 'expand' : 'view',
				sectionId: sectionId
			});
		}
	}

	// Feedback functions
	async function provideFeedback(sectionId: string, helpful: boolean) {
		await trackHelpAnalytics({
			action: helpful ? 'helpful' : 'not_helpful',
			sectionId: sectionId
		});

		// Show confirmation
		const button = document.querySelector(`[data-feedback="${sectionId}"]`);
		if (button) {
			button.textContent = helpful ? '✓ Helpful' : '✓ Not Helpful';
			setTimeout(() => {
				button.textContent = 'Was this helpful?';
			}, 2000);
		}
	}

	// Initialize on mount
	onMount(() => {
		searchHelpContent('');
		trackHelpAnalytics({
			action: 'view',
			sectionId: 'help_page'
		});
	});

	// Reactive search
	$: searchHelpContent(searchQuery);

	// User type display
	function getUserTypeDisplay(userType: string) {
		switch (userType) {
			case 'customer':
				return { label: 'Customer', color: 'text-blue-400', bgColor: 'bg-blue-500/20' };
			case 'expert':
				return { label: 'Expert', color: 'text-emerald-400', bgColor: 'bg-emerald-500/20' };
			case 'supplier':
				return { label: 'Supplier', color: 'text-purple-400', bgColor: 'bg-purple-500/20' };
			default:
				return { label: 'User', color: 'text-slate-400', bgColor: 'bg-slate-500/20' };
		}
	}
</script>

<svelte:head>
	<title>Help & Support - GEFIFI</title>
	<meta name="description" content="Comprehensive help guide for GEFIFI construction platform" />
</svelte:head>

<div class="mx-auto max-w-6xl space-y-8 p-6">
	<!-- Header -->
	<header class="text-center">
		<div class="mb-4 flex justify-center">
			<div class="rounded-2xl bg-gradient-to-br from-emerald-500/20 to-sky-500/20 p-4">
				<svg
					class="h-12 w-12 text-emerald-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
					/>
				</svg>
			</div>
		</div>
		<h1 class="text-4xl font-bold text-emerald-400">Help & Support</h1>
		<p class="mt-3 text-xl text-slate-300">Everything you need to know about using GEFIFI</p>
		{#if currentUser}
			<div class="mt-4 flex justify-center">
				<span
					class="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium {getUserTypeDisplay(
						currentUser.userType
					).bgColor} {getUserTypeDisplay(currentUser.userType).color}"
				>
					<div class="h-2 w-2 rounded-full bg-current"></div>
					{getUserTypeDisplay(currentUser.userType).label} Guide
				</span>
			</div>
		{/if}
	</header>

	<!-- Language Selector & Search -->
	<div class="mx-auto max-w-2xl space-y-4">
		<!-- Language Selector -->
		<div class="flex justify-center">
			<div class="flex rounded-lg bg-slate-700/50 p-1">
				{#each languages as language}
					<button
						on:click={() => {
							selectedLanguage = language.code;
							searchHelpContent(searchQuery);
						}}
						class="rounded-md px-3 py-2 text-sm font-medium transition-colors {selectedLanguage ===
						language.code
							? 'bg-emerald-500 text-white'
							: 'text-slate-300 hover:bg-slate-600/50 hover:text-white'}"
					>
						{language.nativeName}
					</button>
				{/each}
			</div>
		</div>

		<!-- Search Bar -->
		<div class="relative">
			<div class="absolute inset-y-0 left-0 flex items-center pl-3">
				<svg class="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
					/>
				</svg>
			</div>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Search help topics..."
				class="w-full rounded-xl border border-slate-600 bg-slate-700/50 py-4 pr-4 pl-10 text-white placeholder-slate-400 backdrop-blur-sm transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
			/>
		</div>
	</div>

	<!-- Quick Actions for User Type -->
	{#if currentUser}
		<section class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#if currentUser.userType === 'customer'}
				<a
					href="/customer/create-request"
					class="group rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-emerald-500/20 p-2">
							<svg
								class="h-6 w-6 text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-emerald-300">Create Request</h3>
							<p class="text-sm text-slate-400">Post a new work or material request</p>
						</div>
					</div>
				</a>
				<a
					href="/find-professionals"
					class="group rounded-xl border border-sky-500/30 bg-sky-500/10 p-6 transition-all hover:border-sky-500/50 hover:bg-sky-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-sky-500/20 p-2">
							<svg
								class="h-6 w-6 text-sky-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-sky-300">Find Professionals</h3>
							<p class="text-sm text-slate-400">Browse experts and suppliers</p>
						</div>
					</div>
				</a>
			{:else if currentUser.userType === 'expert'}
				<a
					href="/work-requests"
					class="group rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-6 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-emerald-500/20 p-2">
							<svg
								class="h-6 w-6 text-emerald-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2-2v2m8 0H8m8 0v2a2 2 0 002 2M8 6V4m0 2v2a2 2 0 002 2m8-4a2 2 0 012 2v2"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-emerald-300">Browse Work Requests</h3>
							<p class="text-sm text-slate-400">Find projects matching your expertise</p>
						</div>
					</div>
				</a>
			{:else if currentUser.userType === 'supplier'}
				<a
					href="/material-requests"
					class="group rounded-xl border border-purple-500/30 bg-purple-500/10 p-6 transition-all hover:border-purple-500/50 hover:bg-purple-500/20"
				>
					<div class="flex items-center gap-3">
						<div class="rounded-lg bg-purple-500/20 p-2">
							<svg
								class="h-6 w-6 text-purple-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
								/>
							</svg>
						</div>
						<div>
							<h3 class="font-semibold text-purple-300">Browse Material Requests</h3>
							<p class="text-sm text-slate-400">Find supply opportunities</p>
						</div>
					</div>
				</a>
			{/if}
			<a
				href="/chat"
				class="group rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 transition-all hover:border-amber-500/50 hover:bg-amber-500/20"
			>
				<div class="flex items-center gap-3">
					<div class="rounded-lg bg-amber-500/20 p-2">
						<svg
							class="h-6 w-6 text-amber-400"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
							/>
						</svg>
					</div>
					<div>
						<h3 class="font-semibold text-amber-300">My Chats</h3>
						<p class="text-sm text-slate-400">View conversations</p>
					</div>
				</div>
			</a>
		</section>
	{/if}

	<!-- Help Sections -->
	<main class="space-y-6">
		{#if isLoading}
			<div class="flex h-32 items-center justify-center">
				<div
					class="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
				></div>
				<span class="ml-3 text-slate-300">Loading help content...</span>
			</div>
		{:else if filteredSections.length === 0}
			<div class="rounded-xl border border-slate-600/30 bg-slate-800/40 p-8 text-center">
				<svg
					class="mx-auto h-12 w-12 text-slate-400"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
				<h3 class="mt-4 text-lg font-semibold text-slate-300">No help topics found</h3>
				<p class="mt-2 text-slate-400">Try adjusting your search terms or browse all topics.</p>
				<button
					on:click={() => {
						searchQuery = '';
					}}
					class="mt-4 rounded-lg bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
				>
					Show All Topics
				</button>
			</div>
		{:else}
			{#each filteredSections as section (section.id)}
				<article
					class="rounded-xl border border-slate-600/30 bg-slate-800/40 shadow-xl backdrop-blur-sm"
				>
					<!-- Section Header -->
					<button
						on:click={() => toggleSection(section.id)}
						class="flex w-full items-center justify-between p-6 text-left transition-colors hover:bg-slate-700/20"
					>
						<div class="flex items-center gap-4">
							<div class="flex-shrink-0">
								<div class="rounded-lg bg-emerald-500/20 p-2">
									<svg
										class="h-5 w-5 text-emerald-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
										/>
									</svg>
								</div>
							</div>
							<div>
								<h2 class="text-xl font-semibold text-emerald-300">{section.title}</h2>
								<div class="mt-1 flex flex-wrap gap-2">
									{#each section.userTypes as userType}
										<span
											class="rounded-full px-2 py-1 text-xs font-medium {getUserTypeDisplay(
												userType
											).bgColor} {getUserTypeDisplay(userType).color}"
										>
											{getUserTypeDisplay(userType).label}
										</span>
									{/each}
								</div>
							</div>
						</div>
						<div
							class="flex-shrink-0 transform transition-transform {section.expanded
								? 'rotate-180'
								: ''}"
						>
							<svg
								class="h-5 w-5 text-slate-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M19 9l-7 7-7-7"
								/>
							</svg>
						</div>
					</button>

					<!-- Section Content -->
					{#if section.expanded}
						<div class="border-t border-slate-600/30 px-6 pb-6">
							<!-- Content -->
							<div class="prose prose-invert mt-6 max-w-none text-slate-200">
								{@html section.content
									.replace(/\n\n/g, '</p><p class="mt-4 text-slate-200">')
									.replace(/\n/g, '<br>')
									.replace(
										/\*\*(.*?)\*\*/g,
										'<strong class="text-emerald-300 font-semibold">$1</strong>'
									)
									.replace(/^(.*)$/g, '<p class="text-slate-200">$1</p>')}
							</div>

							<!-- Links -->
							{#if section.links && section.links.length > 0}
								<div class="mt-6 flex flex-wrap gap-3">
									{#each section.links as link}
										<a
											href={link.url}
											class="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:border-emerald-500/50 hover:bg-emerald-500/20"
										>
											<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
												/>
											</svg>
											{link.text}
										</a>
									{/each}
								</div>
							{/if}

							<!-- Feedback -->
							<div class="mt-6 flex items-center justify-between border-t border-slate-600/20 pt-4">
								<span class="text-sm text-slate-400">Was this helpful?</span>
								<div class="flex gap-2">
									<button
										on:click={() => provideFeedback(section.id, true)}
										class="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm text-green-300 transition-colors hover:border-green-500/50 hover:bg-green-500/20"
									>
										👍 Yes
									</button>
									<button
										on:click={() => provideFeedback(section.id, false)}
										class="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1 text-sm text-red-300 transition-colors hover:border-red-500/50 hover:bg-red-500/20"
									>
										👎 No
									</button>
								</div>
							</div>
						</div>
					{/if}
				</article>
			{/each}
		{/if}
	</main>

	<!-- Contact Support Section -->
	<section
		id="contact-support"
		class="rounded-xl border border-amber-500/30 bg-amber-500/10 p-8 text-center"
	>
		<div class="mx-auto max-w-md">
			<div class="mb-4 flex justify-center">
				<div class="rounded-2xl bg-amber-500/20 p-3">
					<svg class="h-8 w-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
				</div>
			</div>
			<h2 class="text-2xl font-bold text-amber-300">Still Need Help?</h2>
			<p class="mt-3 text-amber-200/80">
				Can't find what you're looking for? Our support team is here to help you.
			</p>
			<div class="mt-6 space-y-3">
				<a
					href="https://wa.me/1234567890"
					target="_blank"
					rel="noopener noreferrer"
					class="flex w-full items-center justify-center gap-3 rounded-lg bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
				>
					<svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
						<path
							d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"
						/>
					</svg>
					WhatsApp Support
				</a>
				<p class="text-sm text-amber-200/60">Response time: Usually within 2-4 hours</p>
			</div>
		</div>
	</section>
</div>
