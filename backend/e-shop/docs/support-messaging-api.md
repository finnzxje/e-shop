# Support Messaging API

## REST Endpoints

### Start a Conversation
- **POST** `/api/support/conversations`
- **Body**
  ```json
  {
    "subject": "Order #12345",
    "message": "I need help updating my shipping address.",
    "attachmentUrls": ["https://cdn.example.com/ticket/12345.png"]
  }
  ```
- **Response** `200 OK` with `SupportConversationSummaryResponse`
- Requires authenticated customer (JWT access token).

### List Customer Conversations
- **GET** `/api/support/conversations?page=0&size=20`
- Returns paginated conversations for the authenticated customer.

### List Staff Conversations
- **GET** `/api/admin/support/conversations?status=OPEN&status=WAITING_CUSTOMER`
- Optional `status` filter (repeatable). When omitted, defaults to `OPEN`, `WAITING_CUSTOMER`, `WAITING_STAFF`.
- Requires `ROLE_ADMIN`.

### List Assigned Conversations
- **GET** `/api/admin/support/conversations/assigned`
- Shows conversations currently assigned to the authenticated staff member.

### Fetch Messages
- **GET** `/api/support/conversations/{conversationId}/messages`
- Customer and staff share the same endpoint; authorization is derived from the JWT.

### Send Message (REST)
- **POST** `/api/support/conversations/{conversationId}/messages`
- **Body**
  ```json
  {
    "body": "Can you confirm the shipping date?",
    "attachmentUrls": []
  }
  ```
- Returns the persisted `SupportMessageResponse`.

### Update Conversation Status
- **PATCH** `/api/admin/support/conversations/{conversationId}/status`
- **Body** `{ "status": "CLOSED" }`
- Assigns the conversation to the acting staff member if none is present.

## WebSocket/STOMP

### Endpoint
- SockJS/WebSocket endpoint: `ws://{host}:{port}/ws`
- Requires `Authorization: Bearer <access_token>` header on the CONNECT frame (or `access_token` header).

### Application Destinations
- Send messages to `/app/support/{conversationId}/messages` with payload identical to the REST send request.

### Subscriptions
- Subscribe to `/topic/support/conversations/{conversationId}` to receive `SupportMessageResponse` events in real time.

### Example STOMP CONNECT Frame
```
CONNECT
Authorization: Bearer eyJ...token
accept-version:1.2
heart-beat:0,0

^@
```

## Data Contracts

### SupportConversationSummaryResponse
```json
{
  "id": "7a2e2b56-...",
  "status": "WAITING_STAFF",
  "subject": "Order #12345",
  "lastMessageAt": "2025-02-10T08:15:00Z",
  "customer": { "id": "...", "email": "jane@example.com" },
  "assignedStaff": { "id": "...", "email": "agent@example.com" },
  "lastMessage": {
    "id": "...",
    "conversationId": "...",
    "senderType": "CUSTOMER",
    "body": "Any update?",
    "attachmentUrls": [],
    "createdAt": "2025-02-10T08:15:00Z"
  },
  "unreadCount": 2
}
```

### SupportMessageResponse
```json
{
  "id": "23fd...",
  "conversationId": "7a2e2b56-...",
  "senderType": "STAFF",
  "sender": {
    "id": "...",
    "email": "agent@example.com",
    "firstName": "Support",
    "lastName": "Agent"
  },
  "body": "Your package ships tomorrow.",
  "attachmentUrls": ["https://cdn.example.com/labels/shipping-label.pdf"],
  "readAt": null,
  "createdAt": "2025-02-10T09:00:00Z"
}
```
