# System Architecture & Technical Design Document

> [!IMPORTANT]
> **CareRevenue Senior Full-Stack Engineer Interview Presentation**  
> **System Name**: GEFIFI AI-Powered Enterprise Marketplace & Automation Platform  
> **Key Capabilities Demonstrated**: Tech-Agnostic Full-Stack Engineering, Multi-Agent Autonomous Workflows, Programmatic Zero-Token Routing, Event-Driven Real-Time Sync, and Human-In-The-Loop Safety Guardrails.

---

## 1. Executive Summary & Architecture Strategy

This document details the production-ready architecture of **GEFIFI**, a modern full-stack platform designed to automate complex, multi-stakeholder workflows (Customers, Experts, Suppliers) using an autonomous **Multi-Agent AI Engine** integrated with an event-driven **Express.js API Backend** and a reactive **SvelteKit Single-Page Application (SPA)**.

### Alignment with CareRevenue (RCM & AI Automation Team)
* **Tech-Agnostic Microservices**: Decouples high-throughput Node.js API services from Python Google ADK AI Agent orchestration.
* **Cost & Latency Optimization**: Eliminates LLM routing overhead using programmatic `RoleRouterAgent` zero-token dispatch.
* **Human-In-The-Loop Safety**: Financial commitments (Quotes, Contracts, Status triggers) require explicit human confirmation.
* **Real-Time Communication**: Seamless bi-directional messaging and status synchronization across users and autonomous agents.

---

## 2. High-Level System Architecture Diagram

```mermaid
flowchart TD
    subgraph Client_Layer["🖥️ Frontend Client Layer (SvelteKit SPA)"]
        UI["User Interface (SvelteKit / Tailwind CSS)"]
        STORE["Reactive Auth & State Store (authStore)"]
        FAB["Agent Chat UI & Floating Action Button (FAB)"]
        API_CLIENT["Type-Safe API Client (apiClient)"]
        
        UI <--> STORE
        UI <--> FAB
        FAB <--> API_CLIENT
    end

    subgraph Gateway_Layer["🔒 API & Security Gateway"]
        AUTH_MW["JWT Authentication Middleware"]
        CORS["CORS & Security Middleware"]
        VALIDATOR["Request Validator & File Storage"]
    end

    subgraph Backend_Layer["⚡ Node.js / Express Services Domain"]
        USER_SVC["User & Profile Service\n(/api/users)"]
        REQ_SVC["Request Management Engine\n(/api/work-requests, /api/material-requests)"]
        QUOTE_SVC["Bidding & Quotation Engine\n(/api/quotes)"]
        CONTRACT_SVC["Contract & Signing Service\n(/api/contracts)"]
        CHAT_SVC["Messaging & Interaction Service\n(/api/chats, /api/users/interest)"]
    end

    subgraph AI_Engine["🤖 Autonomous Multi-Agent AI Engine (Python Google ADK)"]
        ROUTER["RoleRouterAgent\n(Programmatic Zero-Token Router)"]
        
        subgraph Sub_Agents["Specialized Domain Sub-Agents"]
            C_AGENT["customer_agent\n(Request Creation, Quotes, Discovery)"]
            E_AGENT["expert_agent\n(Work Discovery, Bidding, Progress)"]
            S_AGENT["supplier_agent\n(Material Discovery, Supply Quotes)"]
        end
        
        TOOLS["Tool Suite (httpx Async HTTP Clients)\nbrowse_requests | express_interest | submit_quote | draft_contract | update_profile"]
        
        ROUTER -->|"userType == customer"| C_AGENT
        ROUTER -->|"userType == expert"| E_AGENT
        ROUTER -->|"userType == supplier"| S_AGENT
        
        C_AGENT --> TOOLS
        E_AGENT --> TOOLS
        S_AGENT --> TOOLS
    end

    subgraph Persistence_Layer["🗄️ Persistence & Storage Layer"]
        FIRESTORE[("Cloud Firestore NoSQL DB\n(users, requests, quotes, contracts, chats)")]
        STORAGE["Cloud File Storage\n(Uploaded Attachments, Avatars, Documents)"]
    end

    %% Flow Connections
    API_CLIENT ==>|"HTTPS / REST (JWT Auth)"| CORS
    CORS --> AUTH_MW
    AUTH_MW --> VALIDATOR
    
    VALIDATOR --> USER_SVC
    VALIDATOR --> REQ_SVC
    VALIDATOR --> QUOTE_SVC
    VALIDATOR --> CONTRACT_SVC
    VALIDATOR --> CHAT_SVC
    
    USER_SVC <--> FIRESTORE
    REQ_SVC <--> FIRESTORE
    QUOTE_SVC <--> FIRESTORE
    CONTRACT_SVC <--> FIRESTORE
    CHAT_SVC <--> FIRESTORE
    
    VALIDATOR <--> STORAGE
    
    FAB ==>|"Session State / JWT Token"| ROUTER
    TOOLS ==>|"Authenticated REST API Calls"| Gateway_Layer
```

---

## 3. Comprehensive Deep-Dive Architecture & Data Flows

### A. Programmatic Multi-Agent Handoff Flow (Zero-Token Routing)

> [!NOTE]
> Instead of burning expensive LLM tokens to evaluate user roles, the `RoleRouterAgent` inspects the decoded JWT `userType` in session state and programmatically delegates execution in $O(1)$ time with zero model token usage.

```mermaid
sequenceDiagram
    autonumber
    actor User as User (Customer / Expert / Supplier)
    participant UI as SvelteKit Agent Chat UI
    participant Router as RoleRouterAgent (BaseAgent Subclass)
    participant State as Session State (ctx.session.state)
    participant SubAgent as Role Sub-Agent (customer/expert/supplier)
    participant LLM as Gemini Lite LLM Engine
    participant Tool as ADK Tool (httpx)
    participant Backend as Express API Server

    User->>UI: Types chat message e.g., "Find open jobs matching my skills"
    UI->>Router: Execute run_async(InvocationContext)
    Router->>State: Inspect auth_data ("user_id", "user_type")
    
    alt user_type == "expert"
        Router->>SubAgent: Programmatic Handoff to expert_agent
    else user_type == "supplier"
        Router->>SubAgent: Programmatic Handoff to supplier_agent
    else user_type == "customer"
        Router->>SubAgent: Programmatic Handoff to customer_agent
    end

    SubAgent->>LLM: Send user prompt + System Instructions + Registered Tools
    LLM-->>SubAgent: Request Tool Call: browse_expert_requests()
    SubAgent->>Tool: Invoke browse_expert_requests(tool_context)
    Tool->>Backend: GET /api/users/{user_id} (Fetch Expert Skills & Location)
    Backend-->>Tool: Return Profile (e.g. Plumbing, Bangalore)
    Tool->>Backend: GET /api/work-requests (Fetch Active Open Requests)
    Backend-->>Tool: Return Work Requests
    Tool->>Tool: Apply Profile-Aware Skill & Location Filter (with Fallback)
    Tool-->>SubAgent: Return Sanitized Matching Requests
    SubAgent->>LLM: Format Tool Results into Natural Response
    LLM-->>SubAgent: Final Human-Readable Response
    SubAgent-->>Router: Yield Response Event
    Router-->>UI: Render Formatted Response (No Raw IDs shown)
```

---

### B. Human-In-The-Loop Quote Submission & Contract Negotiation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Expert as Expert / Supplier
    participant Agent as Expert / Supplier Agent
    participant Backend as Express API (Quotes & Contracts Engine)
    actor Customer as Customer
    participant CustAgent as Customer Agent

    Expert->>Agent: "Submit a quote for $1,500 on the Plumbing request"
    Agent->>Agent: Validate Quote Parameters
    Agent-->>Expert: ⚠️ Human Confirmation Prompt: "Drafted $1,500 Quote valid for 30 days. Confirm submission?"
    Expert->>Agent: "Confirmed, go ahead"
    Agent->>Backend: POST /api/quotes { requestId, amount: 1500, validityDays: 30 }
    Backend-->>Agent: 201 Created (Quote ID generated)
    Backend->>Backend: Auto-create Chat System Notification
    Agent-->>Expert: "Quote submitted successfully!"
    
    Customer->>CustAgent: "Show quotes for my Plumbing request"
    CustAgent->>Backend: GET /api/quotes/request/{id}
    Backend-->>CustAgent: Return Quotes List
    CustAgent-->>Customer: Render Clean Quote Summary (Amount, Terms, Provider Name)
    
    Customer->>CustAgent: "Draft a contract with this expert for $1,500"
    CustAgent->>Backend: GET /api/contracts (Active Contract Guardrail Check)
    Backend-->>CustAgent: No Active Contract Found
    CustAgent->>Backend: POST /api/contracts { customerId, expertSupplierId, totalAmount: 1500, status: 'draft' }
    Backend-->>CustAgent: 201 Created (Contract Drafted)
    CustAgent-->>Customer: "Contract drafted in pending status."
```

---

## 4. Key Architectural Highlights & Interview Talking Points

### 1. Tech-Agnostic Decoupling (Node.js REST API + Python Agent Microservice)
* **Architecture Choice**: Built an Express.js API core in TypeScript for high-throughput, low-latency CRUD operations and auth validation, alongside a dedicated Python Google ADK service for autonomous AI agent logic.
* **Why for CareRevenue**: Demonstrates tech-agnostic thinking (selecting Node.js for rapid REST API development and Python for state-of-the-art AI agent orchestration).

### 2. $O(1)$ Zero-Token Programmatic Routing (`RoleRouterAgent`)
* **Problem**: Traditional multi-agent architectures use a primary "Supervisor LLM" to classify intent and route to sub-agents, wasting 300–800 LLM tokens per request and adding 1–2 seconds of latency.
* **Solution**: Subclassed ADK `BaseAgent` into `RoleRouterAgent`, overriding `_run_async_impl` to read the decoded JWT `userType` directly from `ctx.session.state` and route programmatically with **0 token cost** and **< 1ms routing delay**.

### 3. Graceful Fallbacks & Crash-Proof Data Pipelines
* **Resilience Pattern**: Profile lookup & filtering functions feature safe dictionary key access (`.get()`) to prevent `KeyError` runtime crashes on incomplete records.
* **Fallback Logic**: If strict criteria filtering returns zero items, discovery tools automatically relax constraints and return all active registered items accompanied by an informative notice, preventing dead-end UI states.

### 4. Human-In-The-Loop (HITL) Safety Guardrails
* **Financial & Legal Protection**: Actions with legal or financial consequences (drafting contracts, submitting quotes, updating active project statuses) are strictly guarded. Agents draft and validate the payload, present a structured confirmation, and execute only upon explicit user consent.
* **Active Contract Constraint Enforcer**: Validates `GET /api/contracts` before drafting to ensure only a single active contract exists per request at any point in time.

---

## 5. Interview Defense Guide: Anticipated Questions & Answers

| Question from CareRevenue Interviewer | How to Answer (Pitching GEFIFI Architecture) |
| :--- | :--- |
| **"How do you design scalable APIs and integrate front-end ↔ back-end auth?"** | *"In GEFIFI, auth is centralized via JWT Bearer tokens. The SvelteKit frontend injects the token into `apiClient` headers. The Express backend validates the token via middleware and attaches `req.user`. The Python ADK Agent reads the JWT payload directly from session state (`ctx.session.state['auth_data']`), maintaining complete security context across the stack."* |
| **"How do you handle AI agent performance, latency, and cost control?"** | *"I designed a programmatic router (`RoleRouterAgent`) that bypasses LLM intent classification for role dispatch. By reading user claims directly from state, we save hundreds of tokens per turn and reduce latency by ~1.5 seconds. For tools, we use lightweight `httpx` async calls."* |
| **"How do you handle error resilience and crash prevention in data pipelines?"** | *"All agent tools utilize defensive dictionary extraction (`.get()`) with safe fallbacks so missing fields never throw unhandled `KeyError` crashes. If strict multi-field search yields zero records, fallback handlers relax non-critical filters to return general results with explanatory notes."* |
| **"How do you ensure AI agents don't perform unintended actions?"** | *"We enforce Human-in-the-Loop guardrails for high-risk operations. The agent acts as a draft-and-preview assistant for quotes, contracts, and status transitions, requiring explicit confirmation before calling mutating HTTP endpoints."* |
