# Frontend Structure - Babcock Publishing System

## Directory Organization

```
babcock-publishing/
├── index.html                    # Public homepage
├── admin.html                    # Admin dashboard
├── author.html                   # Author portal
├── css/
│   └── styles.css               # Main stylesheet
├── js/
│   ├── main.js                  # Main frontend logic
│   ├── admin.js                 # Admin portal scripts
│   ├── author.js                # Author portal scripts
│   ├── auth.js                  # Authentication logic
│   ├── modals.js                # Modal dialogs and popups
│   └── publications.js          # Book/Publication handling
├── public/
│   └── OIP.webp                 # Babcock logo image
├── assets/                      # Additional assets (images, etc.)
├── backend/                     # Backend API code
└── Documentation files
```

## File Descriptions

### HTML Pages (Root)

- **index.html** - Public homepage with book listings, author features, and login interface
- **admin.html** - Admin dashboard for managing users, books, and system
- **author.html** - Author portal for managing publications and submissions

### CSS (css/)

- **styles.css** - Single main stylesheet containing all frontend styling
  - Component styles
  - Layout and grid
  - Responsive design
  - Theme colors and variables

### JavaScript (js/)

- **main.js** - Core frontend functionality
  - DOM manipulation
  - Event handling
  - Common utilities
  - Page initialization

- **auth.js** - Authentication related code
  - Login/logout functionality
  - Token management
  - Session handling
  - Form validation

- **admin.js** - Admin dashboard functionality
  - User management
  - System settings
  - Analytics
  - _Note: Currently empty - contains admin-specific logic_

- **author.js** - Author portal functionality
  - Publication management
  - Submission handling
  - Author profile management
  - _Note: Currently empty - contains author-specific logic_

- **modals.js** - Modal dialog system
  - Modal creation and management
  - Popup dialogs
  - Form modals
  - Notification modals

- **publications.js** - Publication and book management
  - Book listing and display
  - Publication details
  - Category handling
  - Book metadata

### Public Assets (public/)

- **OIP.webp** - Babcock University logo (webp format)

### Assets Folder (assets/)

- Empty folder reserved for additional images and static files
- Can be used for:
  - User profile pictures
  - Book covers
  - Screenshots
  - Illustrations

## Development Notes

### Script Loading Order

The JavaScript files are loaded in a specific order in index.html:

```html
<script src="js/auth.js"></script>
<script src="js/main.js"></script>
<script src="js/publications.js"></script>
<script src="js/modals.js"></script>
```

This ensures dependencies are loaded in the correct order.

### API Integration

All frontend files communicate with the backend API at:

- **Base URL**: `http://localhost:3001/api`
- **Endpoints**:
  - `/api/users/login` - User login
  - `/api/authors/login` - Author login
  - `/api/admin/login` - Admin login
  - `/api/books/published` - Get published books
  - And many more...

### CSS Architecture

- Single stylesheet approach for simplicity
- Contains all component styles
- Organized by sections:
  - Navigation and header styles
  - Form and input styles
  - Table and data display styles
  - Modal and dialog styles
  - Responsive breakpoints

## Frontend-Backend Communication

### Authentication Flow

1. User submits login form via HTML
2. JavaScript (auth.js) captures form data
3. Sends POST request to backend `/api/*/login` endpoint
4. Backend validates credentials and returns JWT token
5. Frontend stores token in localStorage
6. Token is sent with subsequent API requests

### Data Loading

1. Frontend makes GET request to backend API
2. Backend queries database and returns JSON
3. JavaScript processes response
4. DOM is updated with received data
5. Modals or notifications display results/errors

## Quick Reference

| File            | Size    | Purpose         |
| --------------- | ------- | --------------- |
| styles.css      | 13.4 KB | All styling     |
| auth.js         | 7.8 KB  | Authentication  |
| main.js         | 7.9 KB  | Core logic      |
| modals.js       | 11.8 KB | Modal dialogs   |
| publications.js | 4.2 KB  | Book management |
| admin.js        | Empty   | Admin features  |
| author.js       | Empty   | Author features |

## Notable Third-Party Libraries

Frontend includes links to CDN libraries:

- jQuery 3.6.0
- DataTables 1.13.6
- Chart.js (for analytics)
- Font Awesome icons
- Google Fonts (Poppins, Inter)

These are loaded from CDN and not stored locally.

## Further Organization

If the frontend grows significantly, consider:

- Breaking styles.css into multiple files (components, layout, utilities)
- Creating subdirectories in js/ (auth/, admin/, author/, modals/, utils/)
- Moving HTML files into pages/ directory
- Creating a components/ folder for reusable HTML components

This would result in a structure like:

```
frontend/
├── index.html
├── pages/
│   ├── admin.html
│   └── author.html
├── css/
│   ├── components/
│   ├── layout/
│   ├── utilities/
│   └── main.css
├── js/
│   ├── auth/
│   ├── admin/
│   ├── author/
│   ├── modals/
│   ├── utils/
│   └── main.js
├── public/
└── assets/
```
