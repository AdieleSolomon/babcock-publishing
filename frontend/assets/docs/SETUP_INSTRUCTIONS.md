# Babcock University Publishing - Complete Setup Guide

## ⚡ Quick Start

This project has **automatic database initialization**. Simply run the server and everything is set up automatically!

### 1. Install Backend Dependencies

```bash
cd backend
npm install
```

### 2. Environment Configuration

Create `.env` file in the `backend/` directory:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_PORT=3306
DB_NAME=babcock_publishing

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_min_32_characters_long

# Session Configuration
SESSION_SECRET=your_session_secret_key_min_32_characters_long

# File Upload
MAX_FILE_SIZE=10485760

# Admin Credentials (Created automatically on first startup)
ADMIN_EMAIL=admin@babcock.edu.ng
ADMIN_PASSWORD=admin123
```

### 3. Start the Backend Server

```bash
cd backend
npm start
```

**That's it!** The server will automatically:

- ✅ Create the database (if it doesn't exist)
- ✅ Create all tables with proper schema
- ✅ Set up the default admin user
- ✅ Configure all necessary indexes

### 4. Install Frontend Dependencies

```bash
npm install
```

### 5. Start Frontend (in separate terminal)

```bash
# Using Live Server or simple HTTP server
npx http-server -c-1 -o -p 5500

# Or if you have Live Server extension in VS Code
# Just open index.html with Live Server
```

### 6. Access the Application

**Frontend:** http://localhost:5500
**Backend API:** http://localhost:3001
**Health Check:** http://localhost:3001/api/health

### 7. Default Login Credentials

```
Email: admin@babcock.edu.ng
Password: admin123
Role: Super Admin
```

---

## 📁 Project Structure

```
babcock-publishing/
├── index.html                 # Single consolidated frontend (all pages)
├── css/
│   └── styles.css            # All styling (2564 lines)
├── js/
│   └── script.js             # All JavaScript functionality (28.6 KB)
├── backend/
│   ├── server.js             # Complete backend API (auto-initialization)
│   └── package.json
├── docs/                      # Documentation
├── public/                    # Static assets
├── assets/                    # Images and resources
├── .env                       # Environment variables
└── package.json
```

---

## 🔧 How Automatic Initialization Works

When `npm start` is executed in the backend folder:

1. **Database Creation**: Checks if database exists, creates if needed
2. **Table Creation**: Creates all necessary tables with proper schema
3. **Admin User Setup**: Creates default admin user automatically
4. **Health Check API**: Provides `/api/health` endpoint for monitoring

**No manual scripts needed!** Just start the server.

---

## ✅ Verification Checklist

After starting the server, verify:

- [ ] Console shows "🚀 BABCOCK UNIVERSITY PUBLISHING COMPANY - ADMIN SERVER"
- [ ] Shows "✅ Server running on port: 3001"
- [ ] Shows "✅ Admin user ready (admin@babcock.edu.ng / admin123)"
- [ ] Frontend loads at http://localhost:5500
- [ ] API health check works: http://localhost:3001/api/health
- [ ] Can login with admin@babcock.edu.ng / admin123

---

## 🗄️ Database Schema

Automatically created tables:

| Table                  | Purpose                                     |
| ---------------------- | ------------------------------------------- |
| users                  | User accounts (admin, editor, author, etc.) |
| authors                | Author profiles                             |
| books                  | Publication records                         |
| training_registrations | Training enrollment tracking                |

---

## 🚀 API Endpoints

All endpoints require JWT authentication (except /api/health):

### Admin Endpoints

- `GET/POST /api/admin/authors`
- `GET/POST /api/admin/books`
- `GET/POST /api/admin/submissions`
- `GET/POST /api/admin/contracts`
- `GET/POST /api/admin/training`

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify` - Verify token

### Health

- `GET /api/health` - Server health status

---

## 🐛 Troubleshooting

### Issue: Database connection error

**Solution:** Verify MySQL is running and credentials in `.env` are correct

```bash
# Test connection
mysql -h localhost -u root -p
```

### Issue: Port 3001 already in use

**Solution:** Change PORT in `.env` or kill process using port 3001

### Issue: Admin credentials not working

**Solution:** Server automatically creates admin on startup. Check console logs for credentials.

### Issue: File uploads not working

**Solution:** Ensure `uploads/` folder exists in backend directory

```bash
mkdir backend/uploads
```

### Issue: CORS errors in frontend

**Solution:** Ensure backend is running on port 3001 and frontend on port 5500

---

## 📝 File Organization

**Frontend Consolidation (✅ Complete):**

- ✅ All 3 HTML files merged into single `index.html`
- ✅ All 4 JavaScript files merged into single `js/script.js`
- ✅ Single unified stylesheet `css/styles.css`

**Backend Consolidation (✅ Complete):**

- ✅ All API routes in single `backend/server.js`
- ✅ Automatic database initialization on startup
- ✅ No separate utility scripts needed

**Documentation (✅ Organized):**

- ✅ 18 documentation files in `docs/` folder

---

## 🎯 Next Steps

After successful setup:

1. Create author accounts
2. Configure publication workflows
3. Upload sample publications
4. Set up training courses
5. Manage user permissions
6. Configure email notifications

---

## 📞 Support

For issues or questions:

1. Check console logs for detailed error messages
2. Verify all environment variables are set correctly
3. Ensure MySQL service is running
4. Check that ports 3001 and 5500 are available

---

**Ready to go! Start the backend server and begin publishing!** 🚀
