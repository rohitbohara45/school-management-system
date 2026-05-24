// ── Base URL ──────────────────────────────────────────────────
const API_BASE = 'http://localhost:5000/api';

// ── Admin token helpers ───────────────────────────────────────
function getToken() { return localStorage.getItem('token'); }
function setToken(t) { localStorage.setItem('token', t); }
function removeToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('adminName');
}
function isLoggedIn() { return !!getToken(); }

// ── Student token helpers ─────────────────────────────────────
function getStudentToken() { return localStorage.getItem('studentToken'); }
function setStudentToken(t) { localStorage.setItem('studentToken', t); }
function removeStudentToken() {
  localStorage.removeItem('studentToken');
  localStorage.removeItem('studentName');
  localStorage.removeItem('studentData');
}
function isStudentLoggedIn() { return !!getStudentToken(); }

// ── Teacher token helpers ─────────────────────────────────────
function getTeacherToken() { return localStorage.getItem('teacherToken'); }
function setTeacherToken(t) { localStorage.setItem('teacherToken', t); }
function removeTeacherToken() {
  localStorage.removeItem('teacherToken');
  localStorage.removeItem('teacherName');
  localStorage.removeItem('teacherData');
}
function isTeacherLoggedIn() { return !!getTeacherToken(); }

// ── Auth guards ───────────────────────────────────────────────
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = '/pages/login.html';
  }
}
function requireStudentAuth() {
  if (!isStudentLoggedIn()) {
    window.location.href = '/pages/login.html';
  }
}
function requireTeacherAuth() {
  if (!isTeacherLoggedIn()) {
    window.location.href = '/pages/login.html';
  }
}

// ── Core request function (admin token) ───────────────────────
async function apiRequest(endpoint, method = 'GET', body = null) {
  const token = getToken();

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  if (body) options.body = JSON.stringify(body);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, options);
    const data = await response.json();

    if (response.status === 401) {
      removeToken();
      window.location.href = '/pages/login.html';
      return null;
    }

    if (!response.ok) {
      throw new Error(data.message || `HTTP ${response.status}`);
    }

    return data;
  } catch (err) {
    if (err.message === 'Failed to fetch') {
      showToast('Cannot connect to server. Is the backend running?', 'error');
    }
    throw err;
  }
}

// ── Login functions ───────────────────────────────────────────
async function loginAdmin(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

async function loginStudent(email, password) {
  const res = await fetch(`${API_BASE}/student/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

async function loginTeacher(email, password) {
  const res = await fetch(`${API_BASE}/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

// ── Toast notification ────────────────────────────────────────
function showToast(message, type = 'success') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.style.cssText = `
      position:fixed;top:20px;right:20px;padding:12px 20px;
      border-radius:8px;font-size:14px;font-weight:500;z-index:9999;
      opacity:0;transform:translateY(-10px);transition:all 0.3s;
      pointer-events:none;font-family:'Segoe UI',sans-serif;
      max-width:320px;box-shadow:0 4px 12px rgba(0,0,0,0.1);`;
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.style.background = type === 'success' ? '#f0fdf4' : '#fff5f5';
  toast.style.color = type === 'success' ? '#16a34a' : '#dc2626';
  toast.style.border = `1px solid ${type === 'success' ? '#bbf7d0' : '#fecaca'}`;
  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
  }, 3500);
}

// ── API modules ───────────────────────────────────────────────
const StudentsAPI = {
  getAll: (p = 1, l = 50, s = '') =>
    apiRequest(`/students?page=${p}&limit=${l}&search=${s}`),
  getOne: (id) => apiRequest(`/students/${id}`),
  create: (data) => apiRequest('/students', 'POST', data),
  update: (id, data) => apiRequest(`/students/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/students/${id}`, 'DELETE')
};

const TeachersAPI = {
  getAll: () => apiRequest('/teachers'),
  getOne: (id) => apiRequest(`/teachers/${id}`),
  create: (data) => apiRequest('/teachers', 'POST', data),
  update: (id, data) => apiRequest(`/teachers/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/teachers/${id}`, 'DELETE')
};

const ClassesAPI = {
  getAll: () => apiRequest('/classes'),
  getOne: (id) => apiRequest(`/classes/${id}`),
  create: (data) => apiRequest('/classes', 'POST', data),
  update: (id, data) => apiRequest(`/classes/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/classes/${id}`, 'DELETE')
};

const SubjectsAPI = {
  getAll: (classId) =>
    apiRequest(`/subjects${classId ? '?class_id=' + classId : ''}`),
  getByClass: (classId) => apiRequest(`/subjects/class/${classId}`),
  getOne: (id) => apiRequest(`/subjects/${id}`),
  create: (data) => apiRequest('/subjects', 'POST', data),
  update: (id, data) => apiRequest(`/subjects/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/subjects/${id}`, 'DELETE')
};

const ExamsAPI = {
  getAll: (classId, year) => {
    let q = '';
    if (classId) q += `?class_id=${classId}`;
    if (year) q += `${q ? '&' : '?'}year=${year}`;
    return apiRequest(`/exams${q}`);
  },
  getOne: (id) => apiRequest(`/exams/${id}`),
  create: (data) => apiRequest('/exams', 'POST', data),
  update: (id, data) => apiRequest(`/exams/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/exams/${id}`, 'DELETE'),
  getMarksSheet: (id) => apiRequest(`/exams/${id}/marks-sheet`),
  saveMarks: (id, marks) => apiRequest(`/exams/${id}/marks`, 'POST', { marks }),
  getClassResult: (id) => apiRequest(`/exams/${id}/result`),
  getStudentResult: (examId, stuId) => apiRequest(`/exams/${examId}/result/${stuId}`)
};

const AttendanceAPI = {
  getByDate: (date, classId) => {
    let q = `?date=${date}`;
    if (classId) q += `&class_id=${classId}`;
    return apiRequest(`/attendance${q}`);
  },
  getTodaySummary: () => apiRequest('/attendance/today'),
  getMonthlySummary: (classId, year, month) =>
    apiRequest(`/attendance/monthly/${classId}?year=${year}&month=${month}`),
  getLowAttendance: (threshold, classId) => {
    let q = `?threshold=${threshold}`;
    if (classId) q += `&class_id=${classId}`;
    return apiRequest(`/attendance/low${q}`);
  },
  bulkMark: (data) => apiRequest('/attendance/bulk', 'POST', data),
  getByStudent: (studentId) => apiRequest(`/attendance/student/${studentId}`)
};

const MarksAPI = {
  getAll: (filters = {}) => {
    const q = new URLSearchParams(filters).toString();
    return apiRequest(`/marks${q ? '?' + q : ''}`);
  },
  getByStudent: (id) => apiRequest(`/marks/student/${id}`),
  create: (data) => apiRequest('/marks', 'POST', data),
  update: (id, data) => apiRequest(`/marks/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/marks/${id}`, 'DELETE')
};

const NoticesAPI = {
  getAll: (cat) =>
    apiRequest(`/notices${cat ? '?category=' + cat : ''}`),
  getOne: (id) => apiRequest(`/notices/${id}`),
  create: (data) => apiRequest('/notices', 'POST', data),
  update: (id, data) => apiRequest(`/notices/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/notices/${id}`, 'DELETE')
};

const FeesAPI = {
  getAll: (filters = {}) => {
    const q = new URLSearchParams(
      Object.fromEntries(Object.entries(filters).filter(([, v]) => v))
    ).toString();
    return apiRequest(`/fees${q ? '?' + q : ''}`);
  },
  getSummary: (year) =>
    apiRequest(`/fees/summary${year ? '?year=' + year : ''}`),
  getOne: (id) => apiRequest(`/fees/${id}`),
  create: (data) => apiRequest('/fees', 'POST', data),
  bulkCreate: (data) => apiRequest('/fees/bulk', 'POST', data),
  update: (id, data) => apiRequest(`/fees/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/fees/${id}`, 'DELETE'),
  downloadReceipt: (id, receiptNo) => {
    const token = getToken();
    fetch(`http://localhost:5000/api/fees/${id}/receipt`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `receipt-${receiptNo}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => showToast('Failed to download receipt', 'error'));
  }
};

const TimetableAPI = {
  getByClass: (classId) => apiRequest(`/timetable/class/${classId}`),
  create: (data) => apiRequest('/timetable', 'POST', data),
  update: (id, data) => apiRequest(`/timetable/${id}`, 'PUT', data),
  delete: (id) => apiRequest(`/timetable/${id}`, 'DELETE'),
  deleteByClass: (classId) => apiRequest(`/timetable/class/${classId}`, 'DELETE')
};

const PromotionAPI = {
  getEligible: (classId) => apiRequest(`/promotion/eligible/${classId}`),
  getHistory: (studentId) => apiRequest(`/promotion/history/${studentId}`),
  getByYear: (year) => apiRequest(`/promotion/year/${year}`),
  promoteOne: (data) => apiRequest('/promotion/promote-one', 'POST', data),
  promoteClass: (data) => apiRequest('/promotion/promote-class', 'POST', data)
};

const ReportsAPI = {
  downloadReportCard: (studentId, examId, name, examName) => {
    const token = getToken();
    showToast('Generating report card...');
    return fetch(
      `http://localhost:5000/api/reports/report-card/${studentId}/${examId}`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    )
      .then(r => {
        if (!r.ok) throw new Error('Failed to generate PDF');
        return r.blob();
      })
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download =
          `report-${(name || 'student').replace(/\s+/g, '-')}-${(examName || 'exam').replace(/\s+/g, '-')}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        showToast('Report card downloaded');
      })
      .catch(err => showToast(err.message, 'error'));
  },
  emailReportCard: (studentId, examId) =>
    apiRequest(`/reports/email/${studentId}/${examId}`, 'POST')
};