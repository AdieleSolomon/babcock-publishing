# BABCOCK PUBLISHING SYSTEM - SETUP & DEPLOYMENT GUIDE

**Last Updated:** February 8, 2026
**Status:** ✅ Ready for Development & Testing

---

## 🎯 Quick Start

### Prerequisites

- **Node.js** v18.0.0 or higher
- **MySQL** 8.0 or higher (or MariaDB 10.5+)
- **npm** v9.0.0 or higher

### 1. Database Setup

Create MySQL database:

```sql
CREATE DATABASE babcock_publishing CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 2. Backend Setup

```bash
cd backend
npm install              # Install dependencies
node setup-admin.js      # Create admin user
npm start               # Start API server on port 3001
```

### 3. Frontend Access

```
Open in browser:
- Homepage: http://localhost:5500/index.html
- Admin: http://localhost:5500/admin.html
- Author: http://localhost:5500/author.html
```

---

## 📋 PROJECT VERIFICATION CHECKLIST

### ✅ Backend Structure

- [x] server.js - Main Express application (96.5 KB)
- [x] package.json - All dependencies defined correctly
- [x] .env - Configuration file (properly formatted)
- [x] middleware/ - auth.js, validation.js
- [x] controllers/ - authController, adminController, authorController, publicationController
- [x] routes/ - auth.js, admin.js, authors.js, books.js, public.js
- [x] utils/ - supabaseClient.js, helpers.js
- [x] supabase/ - config.js, migrations/001_initial_schema.sql
- [x] Utility scripts - setup-admin.js, test-db.js

### ✅ Frontend Structure

- [x] index.html - Public homepage
- [x] admin.html - Admin dashboard (fixed logo path)
- [x] author.html - Author portal (fixed logo path)
- [x] css/styles.css - Main stylesheet (13.4 KB)
- [x] js/auth.js - Authentication with proper API_BASE_URL
- [x] js/main.js - Core functionality
- [x] js/admin.js - Admin features (placeholder)
- [x] js/author.js - Author features (placeholder)
- [x] js/modals.js - Modal dialogs (11.8 KB)
- [x] js/publications.js - Book management (4.2 KB)
- [x] public/OIP.webp - Logo (8.3 KB)
- [x] assets/ - Ready for additional media

### ✅ Configuration Files

- [x] backend/.env - Environment variables (cleaned up)
- [x] backend/package.json - Fixed dependencies
- [x] Logo paths corrected in admin.html and author.html
- [x] API_BASE_URL configured in auth.js

### ✅ Dependencies Installed

```
✓ express@4.22.1           (Web framework)
✓ mysql2@3.16.3            (Database driver)
✓ cors@2.8.6               (Cross-origin support)
✓ dotenv@16.6.1            (Environment config)
✓ body-parser@1.20.4       (Request parsing)
✓ express-session@1.19.0   (Session management)
✓ bcryptjs@3.0.3           (Password hashing)
✓ jsonwebtoken@9.0.3       (JWT authentication)
✓ multer@1.4.5-lts.2       (File upload)
✓ nodemon@3.1.11           (Dev auto-reload)
```

---

## 🔧 Configuration Details

### .env File Settings

| Variable         | Default              | Purpose           | Notes                              |
| ---------------- | -------------------- | ----------------- | ---------------------------------- |
| `PORT`           | 3001                 | Server port       | Change for production              |
| `NODE_ENV`       | development          | Environment       | Set to `production` for deployment |
| `DB_HOST`        | localhost            | Database host     | Update for remote DB               |
| `DB_PORT`        | 3306                 | Database port     | Standard MySQL port                |
| `DB_USER`        | root                 | Database user     | Match your MySQL setup             |
| `DB_PASSWORD`    | (empty)              | Database password | Set if needed                      |
| `DB_NAME`        | babcock_publishing   | Database name     | Auto-created by setup script       |
| `JWT_SECRET`     | (provided)           | JWT token secret  | Change to random string            |
| `SESSION_SECRET` | (provided)           | Session secret    | Change to random string            |
| `ADMIN_EMAIL`    | admin@babcock.edu.ng | Admin email       | For initial setup                  |
| `ADMIN_PASSWORD` | Admin@123            | Admin password    | Change after first login           |

### Generate Secure Keys (for production)

```bash
# Generate random secret keys
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🔐 Default Credentials

### Admin Account

- **Email:** admin@babcock.edu.ng
- **Password:** Admin@123
- **Action Required:** Change password after first login

### Test Author Account (if created)

- Created during setup or through admin panel
- Can register via public homepage

---

## 📡 API Endpoints Summary

| Method | Endpoint                        | Purpose              |
| ------ | ------------------------------- | -------------------- |
| POST   | `/api/users/login`              | User login           |
| POST   | `/api/authors/login`            | Author login         |
| POST   | `/api/admin/login`              | Admin login          |
| GET    | `/api/books/published`          | Public books list    |
| POST   | `/api/authors/register`         | Author registration  |
| GET    | `/api/admin/authors`            | List all authors     |
| GET    | `/api/admin/books`              | List all books       |
| PUT    | `/api/admin/authors/:id/status` | Update author status |

---

## 🚀 Running the Application

### Development Mode

**Terminal 1 - Backend:**

```bash
cd backend
npm start
# Server will run on http://localhost:3001
```

**Terminal 2 - Frontend:**

```bash
cd ..
# Open in browser or use live server
# http://localhost:5500/index.html
```

### Creating Admin User

```bash
cd backend
node setup-admin.js
# Output: Admin user created with email and password from .env
```

### Test Database Connection

```bash
cd backend
node test-db.js
# Will show connection status and basic info
```

---

## 🧪 Testing the Setup

### 1. Verify Backend is Running

```bash
curl http://localhost:3001/api/books/published
# Should return JSON array of published books
```

### 2. Test Admin Login

- Go to admin.html
- Email: admin@babcock.edu.ng
- Password: Admin@123
- Should redirect to admin dashboard

### 3. Test Author Login

- Go to author.html or homepage
- Use any registered author account
- Should show author dashboard

### 4. Test Public Homepage

- Open index.html
- Click login modals
- Browse featured publications

---

## 📝 Important File Conventions

### Frontend API Calls

All API calls use dynamic base URL:

```javascript
const API_BASE_URL =
  window.location.hostname === "localhost"
    ? "http://localhost:3001/api"
    : "/api"; // Production uses relative path
```

### Image Paths

- Logo: `public/OIP.webp` (from root directory)
- Uploads: `backend/uploads/` (server uploads)
- User: `assets/` (reserved for future use)

### Authentication

- Token stored in: `localStorage.getItem("authToken")`
- User info: `localStorage.getItem("adminUser")` or `localStorage.getItem("authorUser")`
- Token sent in headers: `Authorization: Bearer <token>`

---

## 🔄 Database Schema

### Auto-created Tables (if using setup script)

- `users` - System users with roles
- `authors` - Author profiles
- `books` - Publications
- `submissions` - Author submissions
- `contracts` - Publication contracts

See: `backend/supabase/migrations/001_initial_schema.sql`

---

## 🛠️ Troubleshooting

### Port Already in Use

```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :3001
kill -9 <PID>
```

### Database Connection Error

```bash
# Verify MySQL is running
# Check DB_HOST, DB_USER, DB_PASSWORD in .env
# Create database if missing: CREATE DATABASE babcock_publishing;
```

### CORS Errors

- Verify frontend and backend are running
- Check `FRONTEND_URL` in .env
- Verify `/api/*` endpoints are accessible

### Missing Dependencies

```bash
cd backend
npm install
npm list --depth=0  # Verify all packages
```

---

## 📚 File Organization Summary

```
babcock-publishing/
├── index.html              ✓ Public homepage
├── admin.html              ✓ Admin dashboard
├── author.html             ✓ Author portal
├── css/styles.css          ✓ Main stylesheet
├── js/
│   ├── auth.js             ✓ Auth logic + API_BASE_URL
│   ├── main.js             ✓ Core functionality
│   ├── modals.js           ✓ Modal dialogs
│   ├── publications.js     ✓ Book handling
│   ├── admin.js            ✓ Placeholder
│   └── author.js           ✓ Placeholder
├── public/OIP.webp         ✓ Logo
├── assets/                 ✓ Placeholder
├── backend/
│   ├── server.js           ✓ Main API
│   ├── package.json        ✓ Fixed
│   ├── .env                ✓ Configured
│   ├── middleware/         ✓ auth, validation
│   ├── controllers/        ✓ Auth, admin, author, publication
│   ├── routes/             ✓ All endpoints
│   ├── utils/              ✓ Helpers, Supabase client
│   └── supabase/           ✓ Config, migrations
└── README.md + docs        ✓ Documentation
```

---

## ✨ Status: READY FOR USE

- ✅ All dependencies installed
- ✅ Structure verified and organized
- ✅ Configuration complete
- ✅ Logo paths fixed
- ✅ API properly configured
- ✅ Database ready for setup
- ✅ Admin account credentials set
- ✅ Development mode ready

**Next Steps:**

1. Ensure MySQL is running
2. Run `cd backend && npm start`
3. Run `node setup-admin.js` to create admin user
4. Open index.html in browser
5. Test login functionality

---

## 📞 Support Notes

For error messages or issues:

1. Check backend console for API errors
2. Check browser console for frontend errors
3. Verify .env configuration
4. Check MySQL connection with `node test-db.js`
5. Review TESTING_GUIDE.md for detailed test procedures
