# Notification System Design

## Stage 1: REST API Design & Contract

### Endpoints

**1. Fetch Notifications**
- **Endpoint**: `GET /api/v1/notifications`
- **Headers**:
  ```
  Authorization: Bearer <token>
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "uuid",
        "type": "Placement|Event|Result",
        "message": "Notification content",
        "isRead": false,
        "createdAt": "ISO-8601"
      }
    ]
  }
  ```

**2. Mark as Read**
- **Endpoint**: `PATCH /api/v1/notifications/:id/read`
- **Headers**:
  ```
  Authorization: Bearer <token>
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "message": "Notification marked as read"
  }
  ```

### Real-Time Mechanism
Use **WebSockets** or **Server-Sent Events (SSE)**. For a one-way notification system (server to client), SSE is highly efficient. When a user connects, they establish an SSE connection to `/api/v1/notifications/stream`.

---

## Stage 2: Persistent Storage

### Choice: PostgreSQL (Relational Database)
For a notification system, data needs to be structured and indexed for rapid reads (especially by `student_id` and `isRead`). NoSQL (like MongoDB) could work, but a relational database offers strong consistency for read states.

### Schema (PostgreSQL)
```sql
CREATE TYPE notif_type AS ENUM ('Placement', 'Result', 'Event');

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id INT NOT NULL,
    type notif_type NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Potential Problems at Scale
- **High Read/Write Ratio**: Fetching unread notifications on every page load will overwhelm the DB.
- **Solution**: Use caching (Redis) for unread counts and recent notifications. Database read-replicas.

---

## Stage 3: Database Indexing & Optimization

The query is slow because it performs a full table scan without appropriate indexes.

### Is the query accurate?
Yes, it correctly identifies unread notifications for a specific student, sorted by recency.

### Why is it slow?
There is no index on `(student_id, is_read)`. At 5,000,000 rows, the DB has to scan massive amounts of data.

### Solution
Add a composite index:
```sql
CREATE INDEX idx_student_unread ON notifications (student_id, is_read);
```

### Adding Indexes on Every Column?
**No.** This is terrible advice. Every index slows down `INSERT` and `UPDATE` operations and consumes significant storage space. Indexes should only be added to columns frequently used in `WHERE`, `JOIN`, or `ORDER BY` clauses.

### Query: Placement in last 7 days
```sql
SELECT DISTINCT student_id 
FROM notifications 
WHERE notification_type = 'Placement' 
  AND created_at >= NOW() - INTERVAL '7 days';
```

---

## Stage 4: Fetching Optimizations

Fetching on every page load is an anti-pattern.

### Strategies:
1. **Caching (Redis)**: Cache the "unread count" for each student. Only fetch the actual notification payload when the user clicks the bell icon.
2. **WebSockets/SSE**: Push updates to the client in real-time. The client maintains local state, eliminating the need to poll on page load.
3. **Pagination**: Only fetch the first 10-20 notifications, loading more only when the user scrolls.

### Tradeoffs:
- **Redis Cache**: Adds infrastructure complexity, potential for stale data (cache invalidation challenges).
- **WebSockets**: Requires maintaining persistent connections, taking up server memory. Can be tricky to scale (requires Pub/Sub like Redis PubSub across nodes).

---

## Stage 5: Notify All Scale Problem

### Shortcomings:
1. **Synchronous Blocking Loop**: Sending 50,000 emails sequentially in a single `for` loop will take hours.
2. **Lack of Fault Tolerance**: If it fails at student 200, the remaining 49,800 get nothing, and there is no tracking of who got it and who didn't.
3. **Coupling**: Email, DB insert, and Push shouldn't be rigidly tied in the same thread.

### Should DB saving and email sending happen together?
**No.** These should be decoupled using a Message Queue (Kafka/RabbitMQ). The main thread should simply publish an event, and worker services handle DB insertions and emails independently.

### Revised Pseudocode (Message Queue Architecture):
```python
# main thread just drops events into the queue and moves on
function notify_all(student_ids, message):
    for student_id in student_ids:
        publish_to_queue("notification_events", {
            student_id: student_id,
            message: message
        })

# worker 1 handles emails
function email_worker():
    listen_to_queue("notification_events"):
        for event in batch:
            try:
                send_email(event.student_id, event.message)
            except:
                push_to_dead_letter_queue(event)  # retry later

# worker 2 handles db + push
function db_worker():
    listen_to_queue("notification_events"):
        for event in batch:
            save_to_db(event.student_id, event.message)
            push_to_app(event.student_id, event.message)
```

---

## Stage 6: Priority Inbox

Implemented a priority sorting logic based on weighted importance (`Placement > Result > Event`) and recency. 
See the code implementation in `notification_app_be/priority_inbox.js`.

**How to maintain the top 10 efficiently?**
As new notifications arrive, we don't need to re-sort the entire database. We can optimize this by using a **Priority Queue (Min-Heap)** data structure.
- We maintain a Min-Heap bounded to exactly 10 elements, ordered by a composite priority score (Weight + Unix Timestamp).
- When a new notification arrives, if the heap has fewer than 10 items, we `push` it. If it is full, we compare the new notification against the `peek()` of the Min-Heap (the lowest priority item currently in the top 10). If the new notification's priority is higher, we `pop` the minimum and `push` the new notification.
- This guarantees $O(\log K)$ insertion time (which is effectively $O(1)$ since $K=10$) and prevents us from ever needing to run expensive sorting algorithms across the entire database.
