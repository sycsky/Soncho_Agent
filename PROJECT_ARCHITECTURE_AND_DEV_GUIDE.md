# AI Agent System - Architecture & Full-Stack Development Guide

This document serves as the **primary context source** for AI assistants to understand the system architecture, project roles, and the standard workflow for implementing full-stack features across the repository.

**Read this before starting any feature implementation.**

---

## 1. 🏗️ Project Structure & Roles

The workspace consists of three distinct projects functioning as a microservice-like architecture:

| Project Path | Project Name | Type | Role & Responsibility |
| :--- | :--- | :--- | :--- |
| `../ai_kef` | **AI Kernel (Backend)** | Backend | **The Brain**. Handles business logic, DB operations, AI processing (LLM/RAG), WebSocket signaling, and API endpoints. |
| `./` (`ai_agent_web`) | **Admin Console** | Frontend | **The Control Center**. Used by Admins/Agents to configure bots, manage knowledge bases, view analytics, and chat with customers. |
| `../ai_agent_client` | **Chat Widget** | Frontend | **The Touchpoint**. A lightweight, embeddable React widget that lives on customer websites (e.g., Shopify stores) for end-users. |

---

## 2. 🛠️ Technology Stack Cheat Sheet

### 🔙 Backend (`ai_kef`)
*   **Framework**: Java 17, Spring Boot 3.2.5
*   **AI Engine**: `LangChain4j` (Integration with OpenAI, Ollama, etc.)
*   **Workflow Engine**: `LiteFlow` (Business logic orchestration)
*   **Data**: MySQL (JPA/Hibernate), PostgreSQL (pgvector for RAG), Redis (Cache/Session)
*   **API**: REST (Controllers), WebSocket (Real-time chat)

### 🖥️ Admin Frontend (`ai_agent_web`)
*   **Framework**: React 18, Vite, TypeScript
*   **UI System**: Tailwind CSS, `@shopify/polaris` (Follow this design system strictly)
*   **State/Network**: React Query (implied), `axios` (via `api.ts`), `sockjs-client`
*   **Key Libs**: `@xyflow/react` (Workflow Editor), `tiptap` (Rich Text)

### 💬 Client Widget (`ai_agent_client`)
*   **Framework**: React 18, Vite (Widget Build Mode)
*   **Styling**: Pure CSS / CSS Modules (to avoid conflict with host sites)
*   **Network**: Native WebSocket / `sockjs-client`

---

## 3. 🔄 Full-Stack Development Workflow (The "Link")

When asked to "add a feature", follow this execution chain to ensure consistency.

### Step 1: Backend Implementation (`ai_kef`)
*   **Entity/DB**: Define new tables or fields in `model/` and update `db/` (SQL scripts).
*   **DTO**: Create Request/Response DTOs in `dto/` to define the API contract clearly.
*   **Repository**: Create/Update interfaces in `repository/`.
*   **Service**: Implement business logic in `service/`.
*   **Controller**: Expose endpoints in `controller/` (standard path: `/api/v1/...`).
*   **Validation**: Add Spring Validation annotations.

### Step 2: API & Types (`ai_agent_web`)
*   **Type Definitions**: Sync the DTOs to TypeScript interfaces in `types/` (e.g., `types/myFeature.ts`).
*   **API Service**: Add methods to `services/` (e.g., `services/myFeatureApi.ts`).
    *   *Convention*: Use `api.get()`, `api.post()` wrappers.

### Step 3: UI Implementation (`ai_agent_web`)
*   **Component**: Create views in `components/`.
    *   *Style Guide*: Use `Polaris` components (`Card`, `DataTable`, `Button`) for layout. Use Tailwind for spacing/utilities.
*   **Integration**: Connect UI to Services using `useEffect` or React Query.
*   **Routing**: Add new routes in `App.tsx` if a new page is needed.

### Step 4: Widget Implementation (`ai_agent_client`) (If applicable)
*   **Protocol**: Update WebSocket event handlers if the feature involves real-time customer interaction.
*   **UI**: Update the chat bubble or window interface.
*   **Build**: Ensure `npm run build:widget` works.

---

## 4. 🎨 UI/Design Guidelines

### For Admin Console (`ai_agent_web`)
*   **Look & Feel**: Professional, SaaS-like, clean.
*   **Components**: PRIORITIZE `@shopify/polaris`. It provides a cohesive admin experience.
*   **Layout**: Sidebar navigation, top bar with breadcrumbs, content in Cards.

### For Chat Widget (`ai_agent_client`)
*   **Look & Feel**: Friendly, approachable, customizable (colors).
*   **Constraint**: Must be responsive and not break the host site's layout.
*   **Assets**: Use SVGs for icons to keep bundle size low.

---

## 5. 🤖 Context Prompt for AI

*Copy and paste this section when starting a new session to ground the AI:*

> **SYSTEM CONTEXT**:
> You are working on the **AI Agent System**.
> 1.  **Backend (`ai_kef`)**: Java/Spring Boot. Responsible for Logic & Data.
> 2.  **Admin (`ai_agent_web`)**: React/Polaris. Responsible for Configuration & Management.
> 3.  **Widget (`ai_agent_client`)**: React/Embedded. Responsible for Customer Chat.
>
> **YOUR TASK**:
> When implementing features, ALWAYS think full-stack:
> - Define the Backend API first (Controller/DTO).
> - Then update the Frontend Type Definitions (`types/*.ts`) to match.
> - Then implement the Frontend Service (`services/*.ts`).
> - Finally, build the UI Components.
>
> **Verify** that API paths match exactly between Backend Controller and Frontend Service.
