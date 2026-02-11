# Application Linking & Navigation Map

## File Structure

```
f:\Desktop\babcock-publishing\
├── index.html           (Main homepage)
├── admin.html           (Admin dashboard)
├── author.html          (Author dashboard)
├── server.js            (Backend API server)
├── package.json         (Dependencies)
├── .env                 (Environment config)
└── uploads/             (File storage)
```

---

## URL Routing Map

### Frontend Routes (Client-side)

```
http://localhost:3001/              → index.html (Homepage)
http://localhost:3001/admin.html    → admin.html (Admin Dashboard)
http://localhost:3001/author.html   → author.html (Author Dashboard)
```

### Backend API Routes (Server-side)

**Port:** 3001

---

## Navigation Flow Diagrams

### 1. LOGIN FLOW

```
[index.html Home Page]
         ↓
    Click "Login"
         ↓
  [Login Modal Opens]
         ↓
  [Choose Login Type]
    ├─→ User Login
    │       ↓
    │  POST /api/users/login
    │       ↓
    │  [Verify Credentials]
    │       ↓
    │  [Token Generated & Stored]
    │       ↓
    │  [Modal Closes, Stay on Index.html]
    │
    ├─→ Author Login
    │       ↓
    │  POST /api/authors/login
    │       ↓
    │  [Verify Credentials]
    │       ↓
    │  [Token Generated & Stored]
    │       ↓
    │  [Wait 1000ms]
    │       ↓
    │  [Redirect to author.html]
    │
    └─→ Admin Login
            ↓
       POST /api/admin/login
            ↓
       [Verify Credentials]
            ↓
       [Token Generated & Stored]
            ↓
       [Modal Closes]
            ↓
       [Redirect to admin.html]
```

### 2. REGISTRATION FLOW

```
[index.html Home Page]
         ↓
   Click "Register"
         ↓
[Register Modal Opens]
         ↓
  [Choose Registration Type]
    ├─→ User Registration
    │       ↓
    │  POST /api/users/register
    │       ↓
    │  [Create user in users table]
    │       ↓
    │  [Token Generated]
    │       ↓
    │  [Modal Closes, Auto-login]
    │
    └─→ Author Registration
            ↓
       POST /api/authors/register
            ↓
       [Create user in users table]
            ↓
       [Create author profile in authors table]
            ↓
       [Status: 'pending' - awaits admin approval]
            ↓
       [User notified of pending approval]
```

### 3. LOGOUT FLOW

```
[User Logged In - Any Page]
         ↓
   Click "Logout" (in header)
         ↓
 POST /api/auth/logout
         ↓
[Token Removed from localStorage]
         ↓
[Clear User Data]
         ↓
[Redirect to index.html]
         ↓
[Header shows "Login" & "Register"]
```

---

## API Endpoint Mapping

### Authentication Endpoints

| Endpoint                | Method | Frontend Caller                   | Response              | Redirect                      |
| ----------------------- | ------ | --------------------------------- | --------------------- | ----------------------------- |
| `/api/users/register`   | POST   | User Reg Form                     | User object + token   | index.html (auto-login)       |
| `/api/users/login`      | POST   | User Login Form                   | User object + token   | index.html                    |
| `/api/authors/register` | POST   | Author Reg Form                   | Author object         | index.html (approval pending) |
| `/api/authors/login`    | POST   | Author Login Form                 | User + Author + token | author.html                   |
| `/api/admin/login`      | POST   | Admin Login Form                  | User object + token   | admin.html                    |
| `/api/auth/verify`      | GET    | Page load (auth.html, admin.html) | User object           | -                             |
| `/api/auth/logout`      | POST   | Logout button                     | Success message       | -                             |

### Data Endpoints

| Endpoint                     | Method | Requires Token | Purpose                          |
| ---------------------------- | ------ | -------------- | -------------------------------- |
| `/api/books/published`       | GET    | No             | Get published books for homepage |
| `/api/authors/count`         | GET    | No             | Get author statistics            |
| `/api/training/count`        | GET    | No             | Get training statistics          |
| `/api/admin/dashboard/stats` | GET    | Yes            | Get admin dashboard statistics   |
| `/api/admin/authors`         | GET    | Yes            | List all authors (admin view)    |
| `/api/admin/books`           | GET    | Yes            | List all books (admin view)      |
| `/api/training/register`     | POST   | No             | Register for training            |
| `/api/contact`               | POST   | No             | Submit contact form              |

---

## Frontend Navigation Links

### index.html (Homepage)

**Header Navigation:**

```html
<ul class="nav-links">
  <li><a href="#home">Home</a></li>
  <li><a href="#publications">Publications</a></li>
  <li><a href="#services">Services</a></li>
  <li><a href="#about">About</a></li>
  <li><a href="#contact">Contact</a></li>
</ul>

<div class="auth-buttons">
  <button onclick="showLoginModal()">Login</button>
  <button onclick="showRegisterModal()">Register</button>
  <!-- After login, shows: -->
  <a href="author.html" class="btn">Dashboard</a> (if author)
  <a href="admin.html" class="btn">Admin</a> (if admin)
</div>
```

**Mobile Menu Links:**

```html
<!-- Home page links -->
<li><a href="#home">Home</a></li>
<li><a href="#publications">Publications</a></li>
<li><a href="#services">Services</a></li>

<!-- Dashboard links -->
<button onclick="window.location.href = 'author.html'">Author Dashboard</button>
<button onclick="window.location.href = 'admin.html'">Admin Panel</button>
```

**Modal Navigation:**

```javascript
showLoginModal(); // Opens login modal
showRegisterModal(); // Opens register modal
showAuthorLogin(); // Opens login modal, author tab
showAdminLogin(); // Opens login modal, admin tab
showAuthorRegistration(); // Opens register modal, author tab
```

### admin.html (Admin Dashboard)

**Header Navigation:**

```html
<a href="index.html" class="logo">← Back to Home</a>

<ul class="nav-menu">
  <li><a href="#dashboard">Dashboard</a></li>
  <li><a href="#authors">Authors</a></li>
  <li><a href="#books">Books</a></li>
  <li><a href="#submissions">Submissions</a></li>
  <li><a href="#settings">Settings</a></li>
</ul>

<button onclick="logout()">Logout</button>
```

### author.html (Author Dashboard)

**Header Navigation:**

```html
<a href="index.html" class="logo">← Back to Home</a>

<ul class="nav-menu">
  <li><a href="#dashboard">My Dashboard</a></li>
  <li><a href="#books">My Books</a></li>
  <li><a href="#submissions">Submissions</a></li>
  <li><a href="#profile">Profile</a></li>
</ul>

<button onclick="logout()">Logout</button>
```

---

## Storage & Session Management

### localStorage Keys

```javascript
// Set after successful login
localStorage.setItem("authToken", data.token); // JWT token
localStorage.setItem("adminUser", JSON.stringify(data.user)); // Admin only

// Cleared on logout
localStorage.removeItem("authToken");
localStorage.removeItem("adminUser");
```

### Token Usage

```javascript
// Include in all protected API requests
fetch(API_URL, {
  method: "GET",
  headers: {
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
});
```

---

## Page Access Control

### Public Pages (No Authentication Required)

- index.html (with limited access)
- API endpoints: `/api/books/published`, `/api/authors/count`, etc.

### Protected Pages (Requires Authentication)

- admin.html
  - Requires: `role = 'admin'` or `'editor'` or `'reviewer'`
  - Checks: localStorage for authToken
  - Entry point: /api/admin/login

- author.html
  - Requires: `role = 'author'` or `'user'`
  - Checks: localStorage for authToken
  - Entry point: /api/authors/login

---

## Complete User Journey

### Scenario 1: New User Registration & Login

```
1. User visits http://localhost:3001
   └─ Loads index.html (homepage)

2. User clicks "Register" button
   └─ Opens register modal

3. User fills user registration form
   └─ Submits to POST /api/users/register

4. Server creates user record
   └─ Returns token + user object

5. Frontend stores token in localStorage
   └─ Sets authToken key

6. Modal closes, user auto-logged in
   └─ Shows user profile in header

7. User can now submit content, comment, etc.
```

### Scenario 2: Author Registration & Approval

```
1. User visits index.html
   └─ Clicks "Register" → "Author Registration"

2. User fills author registration form
   └─ Email, faculty, department, staff_id, etc.

3. Submits to POST /api/authors/register
   └─ Creates user + author profile (status: 'pending')

4. Shows message: "Awaiting admin approval"
   └─ Redirects to index.html

5. Admin logs in (admin@babcock.edu.ng)
   └─ Redirected to admin.html

6. Admin navigates to Authors section
   └─ Finds pending author

7. Admin clicks "Approve"
   └─ Changes status to 'active'

8. Author can now login
   └─ Email + password
   └─ Redirected to author.html dashboard
```

### Scenario 3: Admin Management

```
1. Admin logs in
   └─ POST /api/admin/login
   └─ Redirected to admin.html

2. Sidebar shows admin menu
   └─ Dashboard, Authors, Books, Submissions, Settings

3. Admin performs actions:
   └─ Approve authors
   └─ Manage publications
   └─ View statistics
   └─ Configure settings

4. Each action calls respective API
   └─ /api/admin/authors/:id/approve
   └─ /api/admin/books (POST/PUT/DELETE)
   └─ etc.

5. Logout clicks button
   └─ POST /api/auth/logout
   └─ Token removed from storage
   └─ Redirected to index.html
```

---

## Session Lifecycle

```
User Action          → Storage           → API Call           → Response
──────────────────────────────────────────────────────────────────────
Login                → authToken saved   → /api/xxx/login     → token + user
Stay logged in       → authToken present → Auth header used   → Permitted
Refresh page         → authToken present → Auto-resume        → Session intact
Logout               → authToken removed → /api/auth/logout   → Success
Try access without   → No authToken      → Request rejected   → Redirect home
```

---

## Error Handling & Redirects

| Error Scenario     | Endpoint Response | Frontend Action                      |
| ------------------ | ----------------- | ------------------------------------ |
| Wrong password     | 401 Unauthorized  | Show error modal, stay on page       |
| Invalid email      | 401 Unauthorized  | Show error modal, stay on page       |
| Account inactive   | 403 Forbidden     | Show approval message                |
| Invalid token      | 401 Unauthorized  | Clear storage, redirect to login     |
| Page requires auth | 401 if no token   | Auto-redirect to index.html          |
| Network error      | Network timeout   | Show "Connection error" notification |

---

## Cross-File Communication

### index.html ← → server.js

```
Frontend Request                Backend Response
────────────────────────────────────────────────
POST /api/users/register   →    { success, token, user }
POST /api/users/login      →    { success, token, user }
POST /api/authors/login    →    { success, token, user }
POST /api/admin/login      →    { success, token, user }
GET  /api/books/published  →    { success, books, count }
```

### index.html → admin.html

```
localStorage authToken     →    admin.html loads
Check token in storage     →    Verify session
Redirect after login       →    window.location.href = "admin.html"
```

### index.html → author.html

```
localStorage authToken     →    author.html loads
Check token in storage     →    Verify session
Redirect after login       →    window.location.href = "author.html"
```

### admin.html ↔ server.js

```
Fetch with token header    →    Protected API calls
/api/admin/dashboard/stats →    Load dashboard
/api/admin/authors         →    List authors
/api/admin/books           →    List books
```

---

## Summary: Key Linking Points

1. ✓ **index.html** is entry point
2. ✓ **Login modal** opens from index.html
3. ✓ **Admin login** redirects to admin.html
4. ✓ **Author login** redirects to author.html
5. ✓ **User login** stays on index.html
6. ✓ **Logout** redirects to index.html
7. ✓ **Tokens** stored in localStorage['authToken']
8. ✓ **API calls** use token in Authorization header
9. ✓ **All protected routes** check token validity
10. ✓ **Cross-page navigation** works via href and redirect

---

Last Updated: 2026-02-06
Status: ✓ Complete and Verified
