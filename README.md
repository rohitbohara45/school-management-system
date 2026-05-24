# 🏫 SchoolMS — School Management System

A complete full-stack web application for managing school operations including students, teachers, classes, attendance, marks, fees, and notices. Built from scratch with Node.js, Express, MySQL, and plain HTML/CSS/JS.

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [User Roles](#user-roles)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [Security](#security)
- [Deployment](#deployment)
- [Known Issues](#known-issues)

---

## ✨ Features

### Admin Portal
- 🔐 Secure JWT login with bcrypt password hashing
- 👨‍🎓 Student management — add, edit, delete, photo upload, full profile
- 👨‍🏫 Teacher management — assign subjects and classes
- 🏫 Class and section management with capacity tracking
- 📚 Subject management — per class, with optional subjects
- 📝 Exam system — Unit Test, Mid Term, Final with marks entry sheet
- 📊 Result calculation — automatic grade (A+ to F) and division (Distinction/First/Second/Fail)
- 📄 PDF report cards — per student per exam, with attendance and remarks
- 📅 Daily and monthly attendance tracking with low-attendance alerts
- 💰 Fee management — paid/due/waived status, bulk assign, PDF receipts
- 📢 Notice board — categorised announcements (exam, holiday, event, fee)
- 🗓️ Weekly timetable — period, subject, teacher per class
- 🔼 Promotion system — year-end class promotion with full history
- 📈 Live dashboard — real-time stats on students, attendance, and more

### Student Portal
- Secure login with auto-created account on enrolment
- View own marks, grades, and attendance history
- Monthly attendance percentage with progress bars
- Notice board access
- Class timetable view
- Change password

### Teacher Portal
- Secure login with auto-created account
- View assigned classes and student lists
- Mark daily attendance for own classes only
- View student marks per class
- Change password

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js v16+ |
| Framework | Express.js 4.x |
| Database | MySQL 8.x |
| DB Driver | mysql2 (promise pool) |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| Validation | express-validator |
| File Upload | multer |
| PDF Generation | pdfkit |
| Email | nodemailer |
| Security | helmet, express-rate-limit |
| Logging | morgan + winston |
| Frontend | Plain HTML5 / CSS3 / JavaScript (no framework) |
| UI Library | Bootstrap 5.3 + Bootstrap Icons |

---

## 📁 Project Structure

```
school-management/
├── backend/
│   ├── config/
│   │   ├── db.js              # MySQL connection pool
│   │   ├── mailer.js          # Nodemailer transporter
│   │   └── upload.js          # Multer file upload config
│   ├── controllers/           # HTTP request/response logic
│   │   ├── authController.js
│   │   ├── studentController.js
│   │   ├── teacherController.js
│   │   ├── classController.js
│   │   ├── subjectController.js
│   │   ├── examController.js
│   │   ├── attendanceController.js
│   │   ├── marksController.js
│   │   ├── noticeController.js
│   │   ├── feeController.js
│   │   ├── timetableController.js
│   │   └── promotionController.js
│   ├── middleware/
│   │   └── auth.js            # JWT verification middleware
│   ├── models/                # Raw SQL queries
│   │   ├── authModel.js
│   │   ├── studentModel.js
│   │   ├── teacherModel.js
│   │   ├── classModel.js
│   │   ├── subjectModel.js
│   │   ├── examModel.js
│   │   ├── attendanceModel.js
│   │   ├── marksModel.js
│   │   ├── noticeModel.js
│   │   ├── feeModel.js
│   │   ├── timetableModel.js
│   │   └── promotionModel.js
│   ├── routes/                # URL definitions + validators
│   │   ├── auth.js
│   │   ├── students.js
│   │   ├── student.js         # Student portal routes
│   │   ├── teachers.js
│   │   ├── teacher.js         # Teacher portal routes
│   │   ├── classes.js
│   │   ├── subjects.js
│   │   ├── exams.js
│   │   ├── attendance.js
│   │   ├── marks.js
│   │   ├── notices.js
│   │   ├── fees.js
│   │   ├── timetable.js
│   │   ├── promotion.js
│   │   ├── reports.js
│   │   └── reset.js
│   ├── uploads/
│   │   └── students/          # Student photo uploads
│   ├── logs/                  # Morgan + Winston logs
│   ├── .env                   # Environment variables (not committed)
│   ├── package.json
│   └── server.js              # Express app entry point
│
├── frontend/
│   ├── css/
│   │   └── style.css          # Complete stylesheet
│   ├── js/
│   │   └── api.js             # API helpers, token management, all API modules
│   └── pages/
│       ├── login.html
│       ├── dashboard.html
│       ├── students.html
│       ├── teachers.html
│       ├── classes.html
│       ├── subjects.html
│       ├── exams.html
│       ├── marks.html
│       ├── attendance.html
│       ├── fees.html
│       ├── notices.html
│       ├── timetable.html
│       ├── promotion.html
│       ├── student-dashboard.html
│       ├── teacher-dashboard.html
│       ├── forgot-password.html
│       └── 404.html
│
├── database/
│   ├── schema.sql             # All CREATE TABLE statements
│   └── seed.sql               # Sample data
│
├── start.bat                  # Windows: start both servers
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- [MySQL](https://www.mysql.com/) 8.x (or XAMPP)
- A Gmail account (for email features — optional)

### Installation

**1. Clone or download the project**

```bash
git clone https://github.com/yourusername/school-management.git
cd school-management
```

**2. Install backend dependencies**

```bash
cd backend
npm install
```

**3. Install frontend server**

```bash
npm install -g serve
```

---

## 🗄 Database Setup

**Option A — Using XAMPP Shell or MySQL terminal:**

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p < database/seed.sql
```

**Option B — Using phpMyAdmin:**

1. Open `http://localhost/phpmyadmin`
2. Create a new database named `school_management`
3. Click the **SQL** tab
4. Open `database/schema.sql`, copy all content, paste and click **Go**
5. Repeat with `database/seed.sql`

---

## ⚙️ Environment Variables

Create a file at `backend/.env` with the following:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=school_management

JWT_SECRET=your_long_random_secret_here_min_32_chars
RESET_SECRET=your_reset_key_for_password_reset

EMAIL_USER=your_gmail@gmail.com
EMAIL_PASS=your_16_char_gmail_app_password

NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

> ⚠️ **Never commit `.env` to Git.** Add it to `.gitignore`.

### Getting a Gmail App Password

1. Go to [myaccount.google.com](https://myaccount.google.com)
2. Security → 2-Step Verification → turn ON
3. Search "App passwords" → create one named `SchoolMS`
4. Copy the 16-character password (remove spaces) → paste as `EMAIL_PASS`

---

## ▶️ Running the App

### Option 1 — Windows: double-click `start.bat`

This opens both servers automatically and launches the browser.

### Option 2 — Manual (two terminals)

**Terminal 1 — Backend:**
```bash
cd school-management/backend
npm run dev
```

Expected output:
```
🚀 Server running on http://localhost:5000
✅ MySQL connected successfully
✅ Email service ready
```

**Terminal 2 — Frontend:**
```bash
cd school-management/frontend
npx serve -p 3000
```

### Open the app

```
http://localhost:3000/pages/login.html
```

> ⚠️ Always open via `http://localhost:3000` — never double-click the HTML files directly. The browser blocks API requests from `file://` origins.

---

## 👥 User Roles

### Admin
- **Login:** `admin@school.com` / `admin123` (change after setup)
- Full access to all modules

### Teacher (seed data)
| Name | Email | Password |
|---|---|---|
| Alice Johnson | alice@school.com | teacher123 |
| Bob Smith | bob@school.com | teacher123 |
| Carol Williams | carol@school.com | teacher123 |

### Student (seed data)
| Name | Email | Password |
|---|---|---|
| Ravi Kumar | ravi@example.com | student123 |
| Sita Sharma | sita@example.com | student123 |
| Hari Prasad | hari@example.com | student123 |
| Gita Thapa | gita@example.com | student123 |

> Student and teacher login accounts are created **automatically** when admin adds them with an email address. Default password is `student123` / `teacher123`.

---

## 📡 API Reference

Base URL: `http://localhost:5000/api`

All responses follow this format:
```json
{ "success": true, "data": {}, "message": "..." }
```

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | No | Admin login |
| GET | `/auth/me` | Admin | Get admin profile |
| PUT | `/auth/change-password` | Admin | Change password |
| POST | `/auth/reset-password` | No | Reset password |
| POST | `/reset/send-code` | No | Send 6-digit email code |
| POST | `/reset/verify-code` | No | Verify code and reset |

### Students
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/students` | Admin | List all students (paginated) |
| GET | `/students/:id` | Admin | Get one student |
| GET | `/students/:id/profile` | Admin | Full profile with marks/fees/attendance |
| POST | `/students` | Admin | Create student |
| PUT | `/students/:id` | Admin | Update student |
| DELETE | `/students/:id` | Admin | Delete student |
| POST | `/students/:id/photo` | Admin | Upload student photo |

### Exams & Marks
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/exams` | Admin | List exams |
| POST | `/exams` | Admin | Create exam |
| GET | `/exams/:id/marks-sheet` | Admin | Get marks entry sheet |
| POST | `/exams/:id/marks` | Admin | Save all marks |
| GET | `/exams/:id/result` | Admin | Full class result |
| GET | `/reports/report-card/:studentId/:examId` | Admin | Download PDF report card |

### Fees
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/fees` | Admin | List fees (with filters) |
| GET | `/fees/summary` | Admin | Collected/due totals |
| POST | `/fees` | Admin | Add fee record |
| POST | `/fees/bulk` | Admin | Bulk create for whole class |
| PUT | `/fees/:id` | Admin | Update fee status |
| GET | `/fees/:id/receipt` | Admin | Download PDF receipt |

### Student Portal
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/student/login` | No | Student login |
| GET | `/student/me` | Student | Own profile |
| GET | `/student/marks` | Student | Own marks |
| GET | `/student/attendance` | Student | Own attendance |

### Teacher Portal
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/teacher/login` | No | Teacher login |
| GET | `/teacher/classes` | Teacher | Assigned classes |
| GET | `/teacher/attendance` | Teacher | Attendance for own class |
| POST | `/teacher/attendance` | Teacher | Save attendance |
| GET | `/teacher/marks` | Teacher | Marks for own class |

---

## 🔒 Security

| Feature | Implementation |
|---|---|
| Password hashing | bcryptjs, cost factor 10 |
| Authentication | JWT tokens, 8-hour expiry |
| Route protection | `protect` middleware on all write routes |
| Input validation | express-validator on all POST/PUT endpoints |
| Rate limiting | 10 login attempts per 15 minutes |
| Security headers | Helmet.js |
| SQL injection prevention | Parameterised queries via mysql2 |
| CORS | Configurable via `FRONTEND_URL` env var |
| File uploads | Type and size validation (images only, max 2MB) |

---

## 🌐 Deployment

### Backend — Railway (free tier)

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Add a MySQL database service
4. Set all environment variables from `.env` in Railway Variables tab
5. Run `schema.sql` and `seed.sql` in Railway's MySQL query tab

### Frontend — Netlify (free tier)

1. Go to [netlify.com](https://netlify.com) → drag and drop the `frontend/` folder
2. Update `API_BASE` in `frontend/js/api.js` to your Railway URL:
   ```javascript
   const API_BASE = 'https://your-app.up.railway.app/api';
   ```
3. Re-deploy

### Before going live

- [ ] Change `JWT_SECRET` to a long random string
- [ ] Change default admin password from `admin123`
- [ ] Set `NODE_ENV=production` in `.env`
- [ ] Update `FRONTEND_URL` to your actual Netlify domain
- [ ] Add `.env` to `.gitignore`
- [ ] Change CORS origin from `*` to your frontend URL

---

## 🐛 Known Issues & Troubleshooting

### Everything shows "Loading"
The browser is blocking requests due to CORS. **Always open the frontend via `http://localhost:3000`**, never by double-clicking HTML files.

### "Failed to fetch"
The backend server is not running. Start it with `cd backend && npm run dev`.

### Email not sending
Gmail requires an App Password — your regular password will not work. See [Getting a Gmail App Password](#getting-a-gmail-app-password) above.

### Student/Teacher login says "Invalid email or password"
Run `node reset-student-passwords.js` from the `backend/` folder to regenerate all password hashes.

### MySQL connection failed
Check that MySQL is running in XAMPP and that `DB_PASSWORD` in `.env` matches your MySQL root password (often blank for XAMPP).

---

## 📜 License

This project is open source and available under the [MIT License](LICENSE).

---

## 🙏 Acknowledgements

Built step by step as a learning project covering:
- REST API design with Node.js and Express
- Relational database design with MySQL
- JWT authentication and role-based access control
- MVC architecture pattern
- PDF generation with PDFKit
- Email with Nodemailer
- Vanilla JS frontend with no framework dependency
