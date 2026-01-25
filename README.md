<div align="center">
  <img src="public/images/Gefifi-Logo.png" alt="GEFIFI Logo" width="200" />
  <h1>GEFIFI</h1>
  <p><b>Revolutionizing Construction Management & Marketplaces in India</b></p>

[![Svelte](https://img.shields.io/badge/Svelte-5.0-ff3e00?style=flat-square&logo=svelte)](https://svelte.dev)
[![Firebase](https://img.shields.io/badge/Firebase-v12-ffca28?style=flat-square&logo=firebase)](https://firebase.google.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38b2ac?style=flat-square&logo=tailwind-css)](https://tailwindcss.com)
[![License](https://img.shields.io/badge/License-Proprietary-gray?style=flat-square)](LICENSE)

</div>

---

**GEFIFI** is a cutting-edge Marketplace and Project Management platform ecosystem designed to modernize and streamline the construction industry in India. It bridges the gap between Customers, Construction Experts, and Material Suppliers through a unified, transparent, and AI-enhanced digital experience.

---

## 🚀 Vision

To empower the Indian construction sector by fostering trust, transparency, and efficiency. GEFIFI simplifies complex project workflows—from finding the right professional to securing quality materials and managing digital contracts.

## ✨ Key Features

- 🏗️ **Multi-Stakeholder Marketplace**: Tailored interfaces for Customers (Visionaries), Experts (Builders), and Suppliers (Resource Providers).
- 📈 **Construction Management**: End-to-end tracking of work requests and material procurement.
- 🤖 **AI-Powered Builder Assist**: Deeply integrated agentic AI to help users navigate project complexities, manage documents (DWG, PDF, etc.), and facilitate communication.
- 📜 **Digital Contracts & Agreements**: Securely link and manage agreements between parties directly within the platform.
- 💬 **Real-time Collaboration**: Rich, WhatsApp-like chat experience featuring voice messaging, instant file/document sharing, presence tracking, and typing indicators.
- 💎 **Premium UI/UX**: A high-performance, responsive interface featuring modern glassmorphism aesthetics and smooth micro-animations.

---

## 📸 Product Gallery

<div align="center">

|                    **Landing Experience**                     |                     **Professional Dashboard**                     |
| :-----------------------------------------------------------: | :----------------------------------------------------------------: |
| <img src="public/screenshots/landing_page.png" width="500" /> | <img src="public/screenshots/dashboard_desktop.png" width="500" /> |
|              _Modern entry point for all users_               |              _Comprehensive project at-a-glance view_              |

<br />

|                        **Mobile Accessibility**                         |
| :---------------------------------------------------------------------: |
| <img src="public/screenshots/active_requests_mobile.png" width="220" /> |
|         _Manage requests on the go with a responsive interface_         |

</div>

---

## 🛠️ Technical Stack

<details>
<summary><b>Frontend Excellence</b></summary>
<br />

- **Framework**: Svelte 5 & SvelteKit (utilizing Runes for optimal performance)
- **Styling**: Tailwind CSS 4.0 (Custom Glassmorphism Design System)
- **State Management**: Reactive `$state` and `$derived` runes.
- **Rich Media**: Wavesurfer.js for advanced data visualization.
</details>

<details>
<summary><b>Backend & Infrastructure</b></summary>
<br />

- **Runtime**: Bun / Node.js with TypeScript
- **Services**: Firebase (Auth, Firestore, Cloud Functions, Storage, Hosting)
- **Deployment**: Google Cloud Platform (GCP) with automated Cloud Build pipelines.
- **Standardization**: Docker containerization for reliable deployments.
</details>

<details>
<summary><b>AI Intelligence (ADK)</b></summary>
<br />

- **Framework**: Developed using the **ADK (Agent Development Kit)** in Python.
- **Agents**: Custom agentic workflows powered by Google's Gemini models.
- **Capabilities**: Precision document parsing (DWG/DXF/PDF) and intelligent context-aware assistance.
</details>

---

## ⚡ Quick Start

### 1. Prerequisites

- [Bun](https://bun.sh/) or [Node.js](https://nodejs.org/)
- [Firebase CLI](https://firebase.google.com/docs/cli)

### 2. Setup

```bash
git clone https://github.com/your-username/gefifi-2.git
cd gefifi-2
bun install
```

### 3. Local Development

For a full-system local environment, launch these in separate terminals:

1.  🔥 **Emulators**: `./scripts/firebase-emulator-start.sh`
2.  ⚙️ **Backend**: `./scripts/run-backend.sh`
3.  🤖 **Agents**: `./scripts/run-agents.sh`
4.  🌐 **Frontend**: `bun run dev`

---

## 🔒 Security & Governance

GEFIFI prioritizes security through granular **Firestore Security Rules**, ensuring:

- **Private Data Encryption**: Only authorized parties can access contracts and sensitive project data.
- **Role-Based Access**: Specialized permissions for Customers, Experts, and Suppliers.
- **Secure Communication**: Participant-only access to chat channels.

---

<div align="center">
  <p>© 2026 GEFIFI. Built with ❤️ for the future of construction.</p>
</div>
