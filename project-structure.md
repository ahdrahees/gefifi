Im building this application. already build a basic backend and some frontend. now you need to update the frontend. first goes through all the frontend and backend code and understand it. and start building the rest of the part of the project.


@rule project specification
```
# GEFIFI Construction Marketplace - Demo App Specification

## Project Overview

**App Name**: GEFIFI
**Purpose**: Demo construction marketplace for internal testing, known experts, and investor presentations
**Users**: Customers, Construction Experts, Material Suppliers

## Tech Stack Requirements

### Frontend

- **Framework**: @rule SvelteKit with Svelte 4
- **Language**: @rule TypeScript
- **Styling**: @rule TailwindCSS
- **Package Manager**: @rule bun (not npm)

### Backend

- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js (minimal setup)
- **Database**: JSON files for simple file-based storage
- **Authentication**: Simple JWT + Google Sign-In
- **File Upload**: Local storage only
- **No ORM**: Direct file operations

## Critical Instructions for AI Code Editor

1. **If SvelteKit + TailwindCSS + TypeScript project already exists**: Work from that setup, don't recreate
2. \*\*Use Svelte 5 for better AI model compatibility
3. **Use bun as package manager** for all operations
4. **Keep backend extremely simple** - just basic CRUD operations
5. **No complex security** - this is demo/internal use only
6. **Focus on functionality over security**
7. **File-based data storage** - Use JSON files, not databases
8. **Local file uploads** - Store in uploads/ folder
9. **Simple auth** - JWT tokens, basic validation

## Project Structure

```
gefifi/
├── backend/
│   ├── src/
│   │   ├── server.ts          # Main Express server
│   │   ├── auth.ts            # Simple auth (Google + email/password)
│   │   ├── routes.ts          # All API routes in one file
│   │   └── data.ts            # Simple JSON file operations
│   ├── data/                  # JSON files for data storage
│   │   ├── users.json
│   │   ├── workRequests.json
│   │   ├── chats.json
│   │   ├── messages.json
│   │   └── contracts.json
│   ├── uploads/               # Local file uploads
│   ├── package.json
│   └── .env
├── frontend/                  # SvelteKit app (work from existing if available)
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/    # All components
│   │   │   ├── stores/        # Svelte stores
│   │   │   ├── api.ts         # Simple API client
│   │   │   └── types.ts       # TypeScript types
│   │   ├── routes/            # SvelteKit routes
│   │   └── app.html
│   ├── static/
│   ├── package.json
│   └── tailwind.config.js
└── package.json               # Root package.json
```

## Data Models (TypeScript Interfaces)

### User Data

```
User {
  id: string
  email: string
  password?: string (for email/password auth)
  googleId?: string (for Google auth)
  userType: 'customer' | 'expert' | 'supplier'
  profile: flexible object for user profile data
  createdAt: string
}
```

### Work Request Data

```
WorkRequest {
  id: string
  customerId: string
  title: string
  description: string
  images: string[] (file paths)
  location: string
  expectedCost: number
  timeline: string
  materials: string
  status: 'open' | 'in_discussion' | 'contracted'
  createdAt: string
}
```

### Chat Data

```
Chat {
  id: string
  participants: string[] (user IDs)
  workRequestId?: string
  createdAt: string
}

Message {
  id: string
  chatId: string
  senderId: string
  content: string
  images?: string[]
  timestamp: string
}
```

### Contract Data

```
Contract {
  id: string
  workRequestId: string
  customerId: string
  expertSupplierId: string
  workDetails: string
  agreementSummary: string
  contractDate: string
  customerSigned: boolean
  expertSupplierSigned: boolean
  status: 'draft' | 'signed' | 'completed'
  createdAt: string
}
```

## Backend Requirements

### Simple Database Class

- Create SimpleDB class for JSON file operations
- Implement CRUD methods: read, write, create, findById, update
- Auto-create data directory and JSON files if they don't exist
- Store data in: users.json, workRequests.json, chats.json, messages.json, contracts.json

### Express Server Setup

- Basic Express app with CORS
- Multer for file uploads to local uploads/ folder
- Serve static files from uploads directory
- Simple route structure for all endpoints

### Authentication System

- Simple JWT-based authentication
- Google Sign-In integration using google-auth-library
- Basic email/password authentication with bcrypt
- No complex security features needed

## API Endpoints Required

### Authentication Endpoints

- POST /api/auth/register - Simple email/password registration
- POST /api/auth/login - Simple email/password login
- POST /api/auth/google - Google Sign-In
- GET /api/auth/me - Get current user

### Core Application Endpoints

- GET /api/users/experts - Get all experts
- GET /api/users/suppliers - Get all suppliers
- POST /api/users/interest - Send interest message
- GET /api/work-requests - Get all work requests
- POST /api/work-requests - Create work request
- GET /api/work-requests/:id - Get work request
- GET /api/chat - Get user's chats
- POST /api/chat - Create chat
- POST /api/chat/:id/messages - Send message
- GET /api/contracts - Get contracts
- POST /api/contracts - Create contract
- PUT /api/contracts/:id/sign - Sign contract
- POST /api/upload - Upload images

## Frontend Requirements

### Simple API Client

- Create API class with methods for all endpoints
- Handle JWT token storage in localStorage
- Simple request method with authentication headers
- Methods for auth, work requests, chat, contracts, file upload

### Required UI Components (Svelte 4)

- ui/Button.svelte - Basic button with variants
- ui/Card.svelte - Work request and user cards
- ui/Modal.svelte - For contracts and details
- ui/Input.svelte - Form inputs
- ui/FileUpload.svelte - Image upload
- auth/LoginForm.svelte - Email/password + Google login
- auth/RegisterForm.svelte - User registration with type selection
- dashboard/CustomerDashboard.svelte - Customer home page
- dashboard/ExpertDashboard.svelte - Expert home page
- dashboard/SupplierDashboard.svelte - Supplier home page
- chat/ChatInbox.svelte - Chat list
- chat/ChatPanel.svelte - Message interface
- work/WorkRequestForm.svelte - Create work request
- work/WorkRequestCard.svelte - Display work requests
- contracts/ContractForm.svelte - Create contract
- contracts/ContractModal.svelte - View/sign contract

### Required Routes

- / - Landing page with auth
- /auth/login - Login page
- /auth/register - Registration page
- /dashboard/customer - Customer dashboard
- /dashboard/expert - Expert dashboard
- /dashboard/supplier - Supplier dashboard
- /customer/create-request - Create work request (customers only)
- /chat - Chat inbox (all users)
- /chat/[chatId] - Individual chat
- /contracts - Contract list (all users)
- /contracts/[contractId] - Contract details

## Demo Features Implementation

### User Authentication

- Google Sign-In integration
- Simple email/password registration
- User type selection (customer/expert/supplier)
- Basic profile creation with different fields per user type

### User Dashboards

- Customer: See nearby experts/suppliers, send interest
- Expert: See work request feed, express interest
- Supplier: See work requests needing materials, express interest

### Work Request System

- Customers create work requests with images
- Include title, description, location, timeline, expected cost
- Experts/suppliers can view and express interest

### Simple Chat System

- Interest button creates chat with predefined message
- Text and image messaging capability
- Chat list/inbox for all users
- Three-dot menu in chat for contract creation

### Basic Contract System

- Create contract from chat menu
- Simple form with work details and agreement summary
- Digital signature simulation (checkboxes)
- Contract list and viewing functionality

### File Upload System

- Image upload for work requests
- Image sharing in chat
- Local storage in uploads folder

## Package Dependencies

### Backend Dependencies (package.json)

```
{
  "name": "gefifi-backend",
  "scripts": {
    "dev": "bun run --watch src/server.ts",
    "start": "bun run src/server.ts"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "multer": "^1.4.5",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "google-auth-library": "^9.0.0"
  },
  "devDependencies": {
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "@types/multer": "^1.4.7",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/bcryptjs": "^2.4.2",
    "typescript": "^5.0.0"
  }
}
```

### Frontend Dependencies (package.json)

```
{
  "name": "gefifi-frontend",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@sveltejs/kit": "^1.20.0",
    "svelte": "^4.2.0"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^2.4.0",
    "autoprefixer": "^10.4.14",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.0",
    "typescript": "^5.0.0",
    "vite": "^4.4.0"
  }
}
```

### Root Package Scripts (package.json)

```
{
  "name": "gefifi",
  "scripts": {
    "dev": "concurrently \"cd backend && bun run dev\" \"cd frontend && bun run dev\"",
    "build": "cd frontend && bun run build",
    "start": "cd backend && bun run start"
  },
  "devDependencies": {
    "concurrently": "^8.2.0"
  }
}
```

## Demo Data Requirements

### Sample Users

```
Customer: {
  id: "user1",
  email: "ramesh@gmail.com",
  userType: "customer",
  profile: {
    fullName: "Ramesh Kumar",
    phoneNumber: "+91 9876543210",
    location: "Koramangala, Bangalore"
  }
}

Expert: {
  id: "user2",
  email: "ravi.mason@gmail.com",
  userType: "expert",
  profile: {
    fullName: "Ravi",
    expertise: "Mason Work",
    experience: "8 years",
    location: "Bangalore East"
  }
}

Supplier: {
  id: "user3",
  email: "materials.shop@gmail.com",
  userType: "supplier",
  profile: {
    companyName: "Kumar Building Materials",
    category: "Cement & Steel",
    experience: "15 years",
    location: "Whitefield, Bangalore"
  }
}
```

### Sample Work Requests

```
{
  id: "work1",
  customerId: "user1",
  title: "Bathroom Renovation",
  description: "Complete bathroom renovation with modern fixtures",
  location: "Koramangala, Bangalore",
  expectedCost: 50000,
  timeline: "2 weeks",
  status: "open"
}

{
  id: "work2",
  customerId: "user1",
  title: "Compound Wall Construction",
  description: "6 feet high compound wall around property",
  location: "Anna Nagar, Chennai",
  expectedCost: 80000,
  timeline: "1 month",
  status: "open"
}
```

## Environment Variables

### Backend Environment (.env)

```
JWT_SECRET=simple-jwt-secret-for-demo
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
PORT=3000
```

### Frontend Environment (.env)

```
VITE_API_URL=http://localhost:3000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id
```

## Svelte 4 Specific Guidelines

### Component Structure

- Use traditional Svelte 4 syntax
- Export let for props: `export let propName;`
- Use standard reactive statements: `$: reactive = expression;`
- Traditional event handling: `on:click={handler}`
- Standard store usage: `$storeName`

### Store Implementation

- Use writable, readable, derived from 'svelte/store'
- Standard store patterns for state management
- No runes or Svelte 5 specific features

### Event Handling

- Use createEventDispatcher for custom events
- Standard DOM event handling
- Traditional component communication patterns

## Development Guidelines

1. ** @rule Use Svelte ** - for frontend
2. Use bun for all package management operations
3. Keep backend extremely simple - focus on basic CRUD
4. Use JSON files for data storage, not databases
5. Store uploaded files locally in uploads folder
6. Implement simple JWT authentication without complex security
7. Focus on demo functionality over production readiness
8. If existing SvelteKit project exists, build on top of it
9. Create realistic demo data for Indian construction market
10. Ensure all three user types (customer, expert, supplier) have full functionality
11. Implement interest-based matching between users

## Key Implementation Notes

- All components should use Svelte
- Traditional store patterns for state management
- Standard SvelteKit routing with page.svelte files
- Use export let for component props
- Traditional reactive statements and event handling
- Focus on simple, working functionality over complex features
- Ensure demo works smoothly for investor presentations
- Create realistic Indian construction scenarios for demo data

move frontend files in from src to frontend/src leave root configuration for that you have to add this config in svelte.config.js file
kit: {
adapter: adapter(),
files: {
assets: 'src/frontend/static',
lib: 'src/frontend/src/lib',
routes: 'src/frontend/src/routes',
appTemplate: 'src/frontend/src/app.html',
}
},

```
