# Product Requirements Document
## TaskFlow PWA — Team Task Assignment & Notification System

**Version:** 1.0  
**Date:** 2026-04-05  
**Author:** Quazi Yousuf  

---

## 1. Overview

### 1.1 Problem Statement
Team leaders lack a lightweight, mobile-friendly tool to assign tasks to their team-mates and receive real-time completion updates — without relying on chat threads or email.

### 1.2 Product Summary
TaskFlow is a Progressive Web App (PWA) that allows a team leader (boss) to assign tasks to team-mates via a Kanban-style board. Team-mates receive instant push notifications on task assignment and can update task status. The boss receives a reverse push notification when a task is marked complete.

### 1.3 Target User
- **Primary:** Team leaders / managers who assign and track work
- **Secondary:** Team-mates / subordinates who receive and action tasks

---

## 2. Goals & Non-Goals

### Goals
- Provide a visual Kanban board with one column per team member
- Enable task creation with description and optional deadline
- Deliver push notifications natively via a custom service worker (no third-party services)
- Work seamlessly on both Android and iOS as a PWA
- Keep the system modular so bosses can configure their team size and layout

### Non-Goals
- No chat or comment threads on tasks
- No file or image attachments
- No time tracking or time logging
- No third-party push notification services (e.g., OneSignal, Firebase FCM abstraction layers)

---

## 3. User Roles

| Role | Description |
|------|-------------|
| **Boss** | Creates, assigns, edits, moves, and deletes tasks. Receives push notifications when tasks are marked Done. |
| **Team-mate** | Receives assigned tasks. Can update task status to In Progress or Done. Receives push notifications on task assignment. |

> The system is modular — a boss can configure the number of team-mates and their names. Default configuration is **6 team-mates**.

---

## 4. Kanban Board

### 4.1 Layout
- The board displays **horizontal columns**, one per team member.
- Each column contains a **vertical list of task cards** assigned to that member.
- Columns are scrollable if tasks overflow.

### 4.2 Default Configuration
- **6 columns** (one per team-mate) by default.
- Boss can customize: add/remove/rename team-mate columns.

---

## 5. Task Card

### 5.1 Fields

| Field | Required | Details |
|-------|----------|---------|
| **Description** | Yes | Text only. Hyperlinks permitted. No images. |
| **Deadline** | No | Date/time picker set by the boss. |
| **Status Badge** | Auto | Rounded pill component on the card. Updates as task progresses. |
| **Edit Count** | Auto | Tracks number of times the boss has edited the task (max 2). |

### 5.2 Status States

```
Assigned → In Progress → Done
```

- **Assigned** — Default state when boss creates and assigns the task.
- **In Progress** — Set by the team-mate.
- **Done** — Set by the team-mate. Triggers reverse push notification to boss.

The status is displayed as a **rounded UI badge/pill** within the task card.

---

## 6. Boss Actions

| Action | Details |
|--------|---------|
| **Create Task** | Fill description (required), set deadline (optional), press Assign. |
| **Edit Task** | Allowed a maximum of **2 times** after initial assignment. |
| **Move Task** | Reassign to a different team-mate, or reorder within a column (priority). |
| **Delete Task** | Remove the task entirely from the board. |

---

## 7. Team-mate Actions

| Action | Details |
|--------|---------|
| **Mark In Progress** | Updates the status badge on the card. |
| **Mark Done** | Updates the status badge and triggers a push notification to the boss. |

Team-mates **cannot** create, edit, move, or delete tasks.

---

## 8. Push Notification System

### 8.1 Architecture
- Implemented via a **custom Node.js-based service worker**.
- No third-party push notification services (no OneSignal, no Firebase FCM wrapper).
- Uses the **Web Push API** with VAPID keys.
- Compatible with both **Android** and **iOS** (iOS 16.4+ supports Web Push for PWAs added to Home Screen).

### 8.2 Notification Triggers

| Event | Recipient | Payload |
|-------|-----------|---------|
| Boss presses **Assign** | Assigned team-mate | Task description + deadline (if set) |
| Team-mate marks **Done** | Boss | Team-mate name + task description |

### 8.3 Service Worker Responsibilities
- Subscribe users to push notifications on first login/permission grant.
- Store push subscription endpoints in Supabase.
- Handle incoming push events and display system notifications.
- Work in the background (app does not need to be open).

---

## 9. Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js (PWA-configured) |
| **Backend / Database** | Supabase (PostgreSQL + Auth + Realtime) |
| **Push Notifications** | Custom Node.js service worker + Web Push API (VAPID) |
| **Hosting** | TBD |

### 9.1 PWA Requirements
- `manifest.json` with icons, theme color, display mode `standalone`
- Service worker registered at root scope
- HTTPS required (mandatory for push notifications and service workers)
- Installable on Android and iOS home screens

---

## 10. Authentication

### 10.1 Flow
- On app load, a **forced modal overlay** blocks all content until the user is authenticated.
- The modal cannot be dismissed without valid credentials.
- The user enters:
  - **Initial** — a short identifier (e.g., one or two letters)
  - **Password** — pre-shared with the user by the architect before first use
- Credentials are validated against the `users` table in Supabase.
- On success, the modal closes and the app renders based on the user's role (`boss` or `teammate`).

### 10.2 Credential Management
- All user accounts (boss + team-mates) are **pre-seeded into Supabase by the developer/architect**.
- There is no self-registration, password reset, or in-app user management flow.
- Passwords are stored securely (hashed) in Supabase.

---

## 11. Data Model (Preliminary)

### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| initial | text | Short identifier used as username (e.g. "JD") |
| password_hash | text | Bcrypt-hashed password |
| role | enum | `boss` or `teammate` |
| team_id | uuid | Foreign key |
| push_subscription | jsonb | Web Push subscription object |

### `teams`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| boss_id | uuid | FK → users |
| name | text | |

### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| team_id | uuid | FK → teams |
| assigned_to | uuid | FK → users |
| description | text | Required |
| deadline | timestamptz | Optional |
| status | enum | `assigned`, `in_progress`, `done` |
| edit_count | int | Default 0, max 2 |
| priority | int | For ordering within a column |
| created_at | timestamptz | |
| updated_at | timestamptz | |

---

## 12. Key Constraints & Business Rules

1. Task description is **mandatory**. Assignment cannot proceed without it.
2. A boss may edit a task **at most 2 times** after initial assignment.
3. Task descriptions are **text and hyperlinks only** — no image embedding.
4. Push notifications must function with the **PWA running in the background or closed**.
5. The board layout is **modular** — team size is configurable per boss.
6. The system must work on **Android and iOS** without native app installation.

---

## 13. Out of Scope (v1)

- Multi-boss / admin hierarchy
- Team-mate to team-mate task assignment
- File attachments or image uploads
- Task comments or threaded discussion
- Analytics dashboard or reporting
- Email notifications
- Desktop-only features

---

## 14. Open Questions

- [ ] What happens to tasks when a team-mate is removed from the team?
- [ ] Should the boss receive a push notification when a task is **edited** post-assignment?
- [ ] Should the **newly assigned team-mate** receive a notification when a task is **reassigned** to them?
- [ ] Hosting platform (Vercel recommended for Next.js)?
