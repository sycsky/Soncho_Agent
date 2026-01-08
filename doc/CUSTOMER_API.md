# Customer API Documentation

This document summarizes the API endpoints for managing Customers and Customer Roles.

## 1. Customer Management (`/api/v1/customers`)

### 1.1 List Customers
Retrieves a paginated list of customers with optional filtering.

*   **Endpoint:** `GET /api/v1/customers`
*   **Parameters:**
    *   `name` (optional): Filter by customer name.
    *   `channel` (optional): Filter by primary channel (e.g., `WECHAT`, `WHATSAPP`).
    *   `tag` (optional): Filter by tag.
    *   `active` (optional): Filter by active status (`true`/`false`).
    *   `page` (optional, default: 0): Page number.
    *   `size` (optional, default: 20): Page size.
    *   `sort` (optional, default: `createdAt,desc`): Sort criteria.
*   **Response:** `Page<CustomerDto>`
    *   Includes `roleCode` and `roleName` for customers with special roles.

### 1.2 Get Customer
Retrieves details of a specific customer.

*   **Endpoint:** `GET /api/v1/customers/{id}`
*   **Path Variables:**
    *   `id`: Customer UUID.
*   **Response:** `CustomerDto`

### 1.3 Create Customer
Creates a new customer.

*   **Endpoint:** `POST /api/v1/customers`
*   **Body:** `CreateCustomerRequest` (JSON)
*   **Response:** `CustomerDto` (HTTP 201 Created)

### 1.4 Update Customer
Updates an existing customer.

*   **Endpoint:** `PUT /api/v1/customers/{id}`
*   **Path Variables:**
    *   `id`: Customer UUID.
*   **Body:** `UpdateCustomerRequest` (JSON)
*   **Response:** `CustomerDto`

### 1.5 Delete Customer
Deletes a customer.

*   **Endpoint:** `DELETE /api/v1/customers/{id}`
*   **Path Variables:**
    *   `id`: Customer UUID.
*   **Response:** HTTP 204 No Content

### 1.6 Generate Visitor Token
Generates a token for WebSocket connection.

*   **Endpoint:** `POST /api/v1/customers/{id}/token`
*   **Path Variables:**
    *   `id`: Customer UUID.
*   **Response:** `CustomerTokenResponse`

### 1.7 Assign Special Role
Assigns a special role (e.g., Supplier, Logistics) to a customer.

*   **Endpoint:** `POST /api/v1/customers/{id}/role`
*   **Path Variables:**
    *   `id`: Customer UUID.
*   **Parameters:**
    *   `roleCode` (required): Role code (e.g., `SUPPLIER`, `LOGISTICS`, `PROMOTER`, `WAREHOUSE`).
*   **Response:** `CustomerDto` (Updated with new role info)

---

## 2. Customer Role Management (`/api/v1/customer-roles`)

### 2.1 List Roles
Retrieves all available customer roles.

*   **Endpoint:** `GET /api/v1/customer-roles`
*   **Response:** `List<CustomerRole>`

### 2.2 Create Role
Creates a new customer role.

*   **Endpoint:** `POST /api/v1/customer-roles`
*   **Body:** `CreateRoleRequest` (JSON)
    *   `code`: Unique role code (e.g., `VIP`).
    *   `name`: Display name (e.g., `VIP Customer`).
    *   `description`: Optional description.
*   **Response:** `CustomerRole`
