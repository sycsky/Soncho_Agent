# Shopify Integration Testing Guide

This guide will walk you through testing the AI Agent application in a real Shopify development store.

## Prerequisites

1.  **Shopify Partner Account**: [Join Shopify Partners](https://partners.shopify.com/) (Free).
2.  **Development Store**: Create a development store in your Partner Dashboard.
3.  **Node.js**: Ensure you have Node.js installed.
4.  **Shopify CLI**: Install globally via `npm install -g @shopify/cli @shopify/theme`.

## Phase 1: Setup Public Tunnel (Required for Embedded App)

Since Shopify needs to load your localhost app in an iframe, you need a public HTTPS URL.

1.  **Install Ngrok** (or use Cloudflare Tunnel):
    ```bash
    npm install -g ngrok
    ```
2.  **Start Tunnel**:
    ```bash
    ngrok http 5173
    ```
3.  **Copy the Forwarding URL**:
    e.g., `https://abcd-123-456.ngrok-free.app`
    *(Keep this terminal open!)*

## Phase 2: Create & Configure App in Shopify

1.  Log in to **Shopify Partner Dashboard**.
2.  Go to **Apps** > **All apps** > **Create App**.
3.  Click **Create app manually**.
4.  Name: `AI Agent Dev` (or similar).
5.  **Configuration**:
    *   **App URL**: Paste your Ngrok URL (e.g., `https://abcd-123-456.ngrok-free.app`).
    *   **Allowed redirection URL(s)**:
        *   `https://abcd-123-456.ngrok-free.app/shopify/callback`
        *   `https://abcd-123-456.ngrok-free.app/`
6.  **App Proxy** (Optional, for frontend API calls):
    *   Subpath prefix: `apps`
    *   Subpath: `ai-agent`
    *   Proxy URL: `https://abcd-123-456.ngrok-free.app/api`
7.  **Save** your changes.
8.  **API Keys**:
    *   Go to **Overview** (or Credentials).
    *   Copy the **Client ID**.

## Phase 3: Update Local Environment

1.  Open `.env` (or `.env.development`) in your project root.
2.  Update `VITE_SHOPIFY_API_KEY` with your **Client ID**.
    ```env
    VITE_SHOPIFY_API_KEY=your_client_id_here
    ```
3.  Restart your dev server:
    ```bash
    npm run dev
    ```

## Phase 4: Push Theme Extension

To test the Chat Widget on the storefront:

1.  Login to Shopify CLI:
    ```bash
    shopify auth login
    ```
2.  Navigate to extension directory (if you haven't initialized a Shopify CLI project properly, you might need to):
    *   *Note: Our current folder structure is manual. To push via CLI, you usually need a `shopify.app.toml` config.*
    *   **Alternative for Manual Testing**:
        Copy the code from `shopify/extensions/ai-agent-widget/blocks/chat_widget.liquid` and paste it into a new Theme App Extension if you initialized one via `npm init @shopify/app@latest`.

    *   **Recommended Flow**:
        Since we manually created the files, you can use the Shopify CLI to create a generic extension and overwrite the files.

## Phase 5: Test Installation Flow

1.  In Partner Dashboard > Apps > AI Agent Dev.
2.  Click **Select store** (Test your app).
3.  Select your Development Store.
4.  **Install Flow**:
    *   You should see the Shopify Install Permission screen.
    *   Click **Install app**.
    *   You will be redirected to your App (running on Ngrok).
5.  **In-App Flow**:
    *   You should see the **"Setup AI Agent"** loading screen.
    *   Then the **"Select a Plan"** billing screen.
    *   Click "Start Free Trial" -> Approve simulated charge.
    *   Finally, you arrive at the **Shopify Dashboard**.

## Phase 6: Test Chat Widget (Storefront)

1.  Go to your **Online Store** > **Themes**.
2.  Click **Customize** on your current theme.
3.  Click the **App embeds** icon (left sidebar, 3rd icon).
4.  Enable **AI Agent Widget**.
5.  Configure settings (Agent ID, Color).
6.  Click **Save**.
7.  Preview your store. You should see the chat widget!

---

## Troubleshooting

*   **"Refused to connect"**: Ensure Ngrok is running and the URL in Partner Dashboard matches exactly.
*   **"API Key Missing"**: Check `.env` and restart Vite.
*   **Mixed Content Error**: Ensure you are using the `https` version of the Ngrok URL.
