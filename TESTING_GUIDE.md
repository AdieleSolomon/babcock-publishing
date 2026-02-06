# Complete System Testing & Verification Guide

## Quick Start

### 1. START THE SERVER

```bash
cd f:\Desktop\babcock-publishing
node server.js
```

Expected output:

```
🚀 BABCOCK UNIVERSITY PUBLISHING COMPANY - ADMIN SERVER
✅ Server running on port: 3001
✅ Main URL: http://localhost:3001
```

### 2. OPEN THE WEBSITE

Navigate to: `http://localhost:3001` (or open index.html)

---

## Test Scenarios

### TEST 1: Admin Login

**Steps:**

1. Click "Login" button in header
2. Click "Admin Login" tab
3. Enter:
   - Email: `admin@babcock.edu.ng`
   - Password: `admin123`
4. Click "Login as Admin"

**Expected Result:**

- ✓ Success notification appears
- ✓ Redirects to admin.html after 1 second
- ✓ Admin dashboard loads with statistics
- ✓ Header shows admin user info

**If Fails:**

- Check browser console (F12) for error messages
- Verify server is running on port 3001
- Check that email/password are correct

---

### TEST 2: New User Registration

**Steps:**

1. Click "Register" button in header
2. Stay on "User Registration" tab (default)
3. Fill in:
   - Full Name: `John Doe`
   - Email: `john@example.com`
   - Username: `johndoe`
   - Password: `TestPass123`
4. Click "Register as User"

**Expected Result:**

- ✓ "User registration successful!" notification
- ✓ Modal closes
- ✓ User should now appear in database
- ✓ Can login with new email/password

**Database Verify:**

```sql
SELECT id, email, role, status FROM users WHERE email = 'john@example.com';
```

Should show: `role='user'` and `status='pending'`

---

### TEST 3: Author Registration

**Steps:**

1. Click "Register" button in header
2. Click "Author Registration" tab
3. Fill in all fields:
   - Full Name: `Dr. Jane Smith`
   - Email: `jane@babcock.edu.ng`
   - Phone: `08012345678`
   - Faculty: `Faculty of Science`
   - Department: `Computer Science`
   - Staff/Student ID: `BS2024001`
   - Password: `AuthorPass123`
4. Click "Register as Author"

**Expected Result:**

- ✓ "Author registration successful!" notification
- ✓ Message: "Please wait for admin approval"
- ✓ New user created in users table
- ✓ New author profile created in authors table

**Database Verify:**

```sql
SELECT u.email, u.role, u.status, a.staff_id, a.faculty
FROM users u
LEFT JOIN authors a ON u.id = a.user_id
WHERE u.email = 'jane@babcock.edu.ng';
```

---

### TEST 4: Author Login (After Registration)

**Prerequisites:**

- Author account must have `status = 'active'` (admin approval needed)

**Admin Approval:**

1. Login as admin
2. Go to "Authors" section
3. Find the author registration
4. Click "Approve" button
5. Change status to "active"

**Then test login:**

1. Click "Login" button
2. Click "Author Login" tab
3. Enter:
   - Email: `jane@babcock.edu.ng`
   - Password: `AuthorPass123`
4. Click "Login as Author"

**Expected Result:**

- ✓ "Author login successful!" notification
- ✓ Redirects to author.html after 1 second
- ✓ Author dashboard loads
- ✓ User info displayed in header

---

### TEST 5: Token Persistence

**Steps:**

1. Login as any user
2. Open browser Developer Tools (F12)
3. Go to "Application" tab
4. Find "Local Storage"
5. Check for `authToken` key
6. Refresh the page (F5)

**Expected Result:**

- ✓ Token still visible in localStorage
- ✓ User remains logged in after refresh
- ✓ Session persists until logout or token expires (24 hours)

---

### TEST 6: Logout

**Steps:**

1. Be logged in as any user
2. Click user menu in header
3. Click "Logout" button

**Expected Result:**

- ✓ "Logged out successfully" notification
- ✓ `authToken` removed from localStorage
- ✓ Redirected back to home page
- ✓ Header shows "Login" and "Register" buttons again

---

### TEST 7: Invalid Credentials

**Steps:**

1. Click "Login"
2. Enter wrong email or password
3. Click login button

**Expected Result:**

- ✓ Error notification appears
- ✓ Error message: "Invalid email or password"
- ✓ Modal stays open for retry

---

### TEST 8: Pending Approval Account

**Steps:**

1. Register as author
2. Try to login immediately (before admin approval)

**Expected Result:**

- ✓ Error notification appears
- ✓ Error message: "Your account is pending approval. Please contact the admin."
- ✓ Cannot access dashboard until approved

---

## Database Verification Queries

### Check all users

```sql
SELECT id, email, full_name, role, status FROM users;
```

### Check authors

```sql
SELECT a.id, a.staff_id, a.faculty, u.email, u.full_name, u.status
FROM authors a
LEFT JOIN users u ON a.user_id = u.id;
```

### Check password is hashed

```sql
SELECT id, email, password FROM users LIMIT 1;
-- Password should start with $2b$ (bcrypt hash)
```

### Check tokens

```sql
SELECT id, email, verification_token FROM users
WHERE verification_token IS NOT NULL;
```

---

## Troubleshooting

### Issue: Login doesn't work

**Solution:**

1. Make sure server is running: `node server.js`
2. Check port 3001 is not in use: `netstat -ano | findstr :3001`
3. Check database connection
4. Look at server console for error messages

### Issue: Redirects to blank page

**Solution:**

1. Make sure admin.html and author.html exist in same directory as index.html
2. Check file paths are correct (case-sensitive on some systems)
3. Check browser console for 404 errors

### Issue: Token not persisting

**Solution:**

1. Make sure localStorage is enabled in browser
2. Check for browser privacy settings blocking storage
3. Clear browser cache and try again

### Issue: Password always fails

**Solution:**

1. Make sure to use correct password from registration
2. Password is case-sensitive
3. Try resetting with forgot password (if implemented)

---

## Linking Verification Checklist

- [ ] index.html → author.html (author login redirect)
- [ ] index.html → admin.html (admin login redirect)
- [ ] author.html → index.html (logout redirect)
- [ ] admin.html → index.html (logout redirect)
- [ ] All API endpoints reach correct URLs
- [ ] Token stored in localStorage under 'authToken'
- [ ] Token sent in Authorization header for protected routes
- [ ] Home page loads without login
- [ ] Auth pages (admin/author) require valid token

---

## API Testing with curl

### Test User Login

```bash
curl -X POST http://localhost:3001/api/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@babcock.edu.ng","password":"admin123"}'
```

### Test Admin Login

```bash
curl -X POST http://localhost:3001/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@babcock.edu.ng","password":"admin123"}'
```

### Test Author Login

```bash
curl -X POST http://localhost:3001/api/authors/login \
  -H "Content-Type: application/json" \
  -d '{"email":"author@example.com","password":"password"}'
```

### Test Token Verification

```bash
curl -X GET http://localhost:3001/api/auth/verify \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## Success Indicators

✓ All redirects work correctly
✓ Tokens persist across page refreshes
✓ Passwords are securely hashed
✓ JWT tokens are generated with correct claims
✓ Invalid credentials are rejected
✓ Pending accounts cannot login
✓ Logout removes all session data
✓ All API endpoints return correct responses

---

Last Updated: 2026-02-06
