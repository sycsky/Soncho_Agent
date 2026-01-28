# SonCho AI - Intelligent Customer Support Platform

SonCho AI is a modern, feature-rich customer support workspace designed to enhance agent productivity and streamline customer interactions. It combines a real-time chat interface with powerful AI capabilities, powered by Google's Gemini models, to create a seamless environment for both human agents and AI assistants.

---

## ✨ Core Features

The platform is built around a robust set of features to manage the entire customer support lifecycle:

#### **🤖 AI-Powered Agent Assistance (Gemini Integration)**
-   **AI Auto-Reply ("AI Pilot"):** Gemini can handle initial customer interactions, providing instant answers based on a configurable knowledge base.
-   **Seamless AI/Human Handoff:** Agents can take over from the AI, or hand conversations back, with a single click.
-   **Smart Summary:** Instantly generate a concise, structured summary of any conversation history to quickly get up to speed.
-   **Magic Rewrite:** Improve the tone, clarity, and professionalism of an agent's drafted message with one click.
-   **Live Sentiment Analysis:** Real-time analysis of the customer's mood (e.g., Frustrated, Neutral, Happy) to guide agent responses.
-   **AI Tagging:** Automatically suggest relevant tags for a user profile based on their conversation history and context.

#### **💬 Real-time Chat & Inbox Management**
-   **Multi-Channel Support:** Ingests and displays conversations from different sources (e.g., Web, WeChat).
-   **Live Chat Interface:** Real-time messaging with typing indicators and message timestamps.
-   **Conversation Grouping:** Organize chats into custom folders (e.g., "Priority," "Billing") in addition to the system "Inbox" and "Resolved" folders.
-   **Status Management:** Conversations flow through distinct states: `AI_HANDLING`, `HUMAN_HANDLING`, and `RESOLVED`.
-   **Zen Mode:** A focused view that hides the user profile panel for a distraction-free conversation experience.

#### **🤝 Team Collaboration**
-   **Internal Notes:** Agents can leave private notes within a conversation that are invisible to the customer.
-   **@Mentions:** Mention other team members in internal notes to send notifications and collaborate effectively. Mention data is sent structurally to the backend.
-   **Chat Ownership & Transfer:** Each chat has a `Primary Owner` and can be seamlessly transferred to other agents.
-   **Support Teams:** Add multiple agents to a conversation as `Support Agents`.

#### **👤 CRM & User Management**
-   **Detailed User Profile:** A comprehensive side panel shows customer contact info, location, conversation history, and internal notes.
-   **Tagging System:** Apply both manual and AI-generated tags to users for segmentation and context.

#### **⚙️ Administration & Configuration**
-   **Team Management:** A dedicated view for admins to add, edit, and view team members.
-   **Role-Based Access Control (RBAC):** A flexible permission system where roles (e.g., Admin, Support Agent) are assigned specific capabilities.
-   **Knowledge Base Management:** Admins can manage a knowledge base that the AI uses for generating accurate responses.
-   **System Settings:** Configure global quick replies and other system-wide preferences.
-   **Analytics Dashboard:** A high-level view of key support metrics.

---

## 🛠️ Technology Stack

This project is a modern frontend application built with a focus on performance, type safety, and a great developer experience.

-   **Framework:** [React](https://react.dev/)
-   **Language:** [TypeScript](https://www.typescriptlang.org/)
-   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
-   **AI Integration:** [Google Gemini API](https://ai.google.dev/) via `@google/genai` SDK
-   **Real-time Communication:** [WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
-   **Icons:** [Lucide React](https://lucide.dev/)

---

## 🚀 Getting Started

Follow these instructions to get the project up and running on your local machine for development and testing purposes.

### Prerequisites

-   A running instance of the corresponding SonCho AI backend server.
-   A valid Google Gemini API key.

### Setup & Configuration

1.  **Clone the repository:**
    ```bash
    git clone <repository-url>
    cd nexus-support-ai
    ```

2.  **Install dependencies:**
    This project uses a pre-configured environment, so no manual installation is needed.

3.  **Configure Environment Variables:**
    -   **Backend API URL:** Open `config.ts` and ensure the `BASE_URL` constant points to your running backend server (e.g., `http://127.0.0.1:8080`).
    -   **Gemini API Key:** The application expects the Gemini API key to be available as an environment variable named `process.env.API_KEY`. You must configure this in your deployment environment. The application code will automatically pick it up.

4.  **Run the application:**
    The application is served automatically in this development environment.

---

## 🏗️ Project Architecture

The codebase is organized into logical directories to maintain clarity and scalability.

-   **/components:** Contains all reusable React components that make up the UI.
    -   `LoginScreen.tsx`: Handles user authentication.
    -   `Sidebar.tsx`: The main navigation sidebar.
    -   `ChatList.tsx`: The list of all customer conversations.
    -   `ChatArea.tsx`: The main chat interface where messages are exchanged.
    -   `UserProfilePanel.tsx`: The right-side panel displaying customer CRM data.
    -   `TeamView.tsx`, `AnalyticsView.tsx`, `SettingsView.tsx`: The different workspace views.
-   **/services:** Houses modules for communicating with external services.
    -   `api.ts`: A centralized service for making RESTful API calls to the backend. It handles token authentication and the unified response format.
    -   `websocketService.ts`: Manages the WebSocket connection for real-time events.
    -   `geminiService.ts`: Contains all functions that interact with the Google Gemini API for features like summarization, message rewriting, and sentiment analysis.
-   **/types.ts:** Defines all TypeScript interfaces and enums used across the application, providing a single source of truth for data structures.
-   **/constants.ts:** Stores static, unchanging data like default avatars.
-   **/config.ts:** Contains environment-specific configurations, such as the API base URL.
-   **App.tsx:** The root component that manages global state, routing, and orchestrates the different parts of the application.
