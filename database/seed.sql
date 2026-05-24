USE school_management;

-- Admin password is: admin123
-- (bcrypt hash generated at cost 10 — we'll verify this works in Step 4)
INSERT INTO admins (name, email, password_hash) VALUES
('Super Admin', 'admin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi');

-- Teachers
INSERT INTO teachers (name, email, phone, subject) VALUES
('Alice Johnson',  'alice@school.com',  '9800000001', 'Mathematics'),
('Bob Smith',      'bob@school.com',    '9800000002', 'Science'),
('Carol Williams', 'carol@school.com',  '9800000003', 'English');

-- Classes
INSERT INTO classes (name, section, teacher_id, capacity) VALUES
('Grade 1', 'A', 1, 40),
('Grade 1', 'B', 2, 40),
('Grade 2', 'A', 3, 35);

-- Students
INSERT INTO students (name, email, phone, dob, class_id) VALUES
('Ravi Kumar',   'ravi@example.com',   '9811111111', '2012-04-10', 1),
('Sita Sharma',  'sita@example.com',   '9822222222', '2012-07-22', 1),
('Hari Prasad',  'hari@example.com',   '9833333333', '2011-11-05', 2),
('Gita Thapa',   'gita@example.com',   '9844444444', '2011-03-18', 3);

-- Attendance
INSERT INTO attendance (student_id, att_date, status) VALUES
(1, CURDATE(), 'present'),
(2, CURDATE(), 'absent'),
(3, CURDATE(), 'present'),
(4, CURDATE(), 'late');

-- Marks
INSERT INTO marks (student_id, subject, marks_obtained, total_marks, term) VALUES
(1, 'Mathematics', 85, 100, 'Term 1'),
(1, 'Science',     78, 100, 'Term 1'),
(2, 'Mathematics', 91, 100, 'Term 1'),
(2, 'Science',     88, 100, 'Term 1'),
(3, 'Mathematics', 72, 100, 'Term 1'),
(4, 'English',     95, 100, 'Term 1');