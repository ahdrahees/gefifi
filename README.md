# GEFIFI - Construction Marketplace & Management Platform

[![Svelte](https://img.shields.io/badge/Svelte-5.0-ff3e00?logo=svelte)](https://svelte.dev)
[![Firebase](https://img.shields.io/badge/Firebase-v12-ffca28?logo=firebase)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38b2ac?logo=tailwind-css)](https://tailwindcss.com)

**GEFIFI** is a cutting-edge Marketplace and Project Management platform ecosystem designed to modernize and streamline the construction industry in India. It bridges the gap between Customers, Construction Experts, and Material Suppliers through a unified, transparent, and AI-enhanced digital experience.

## 🚀 Vision

To empower the Indian construction sector by fostering trust, transparency, and efficiency. GEFIFI simplifies complex project workflows—from finding the right professional to securing quality materials and managing digital contracts.

## ✨ Key Features

- **Multi-Stakeholder Marketplace**: Tailored interfaces for Customers (Visionaries), Experts (Builders), and Suppliers (Resource Providers).
- **Construction Management**: End-to-end tracking of work requests and material procurement.
- **AI-Powered Builder Assist**: Deeply integrated agentic AI to help users navigate project complexities, manage documents (DWG, PDF, etc.), and facilitate communication.
- **Digital Contracts & Agreements**: Securely link and manage agreements between parties directly within the platform.
- **Real-time Collaboration**: Advanced chat system with file sharing, presence tracking, and typing indicators.
- **Premium UI/UX**: A high-performance, responsive interface featuring modern glassmorphism aesthetics and smooth micro-animations.

## 🛠️ Technical Stack

### Frontend

- **Framework**: Svelte 5 & SvelteKit (Runes, Snippets)
- **Styling**: Tailwind CSS 4.0 (Modern Glassmorphism)
- **State Management**: Svelte's reactive `$state` and `$derived` runes.
- **Utilities**: Wavesurfer.js (Audio/Visual data), Marked (Markdown rendering), Lucide Svelte (Icons).

### Backend & Infrastructure

- **Runtime**: Bun / Node.js with TypeScript
- **Backend as a Service**: Firebase (Auth, Firestore, Functions, Storage, Hosting)
- **Deployment**: Google Cloud Platform (GCP) with Cloud Build.
- **Containerization**: Docker for consistent environments across development and production.

### AI Engine

- **Framework**: Developed using the **ADK (Agent Development Kit)** in Python for robust agent orchestration.
- **Agents**: Custom agentic workflows integrated with Google's Gemini models.
- **Capabilities**: Document parsing (DWG/DXF/PDF), automated session management, and project coordination assistance.

## 🛠️ Getting Started

### Prerequisites

- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/gefifi-2.git
   cd gefifi-2
   ```
2. Install dependencies:
   ```bash
   bun install
   ```

### Running Locally

To run the full stack locally for development, open four separate terminal tabs and run the following commands in order:

1.  **Tab 1 (Firebase Emulators):**
    ```bash
    ./scripts/firebase-emulator-start.sh
    ```
2.  **Tab 2 (Backend Services):**
    ```bash
    ./scripts/run-backend.sh
    ```
3.  **Tab 3 (AI Agents):**
    ```bash
    ./scripts/run-agents.sh
    ```
4.  **Tab 4 (Frontend App):**
    ```bash
    bun run dev
    ```

## 🔒 Security

The project implements rigorous security measures through **Firestore Security Rules**, ensuring:

- Data privacy for personal profiles and contracts.
- Participant-based access control for chats and project management nodes.
- Role-based permissions for Customers, Experts, and Suppliers.

## 📝 License

This project is private and proprietary. All rights reserved.
