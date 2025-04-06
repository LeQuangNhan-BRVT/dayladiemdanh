# Hướng dẫn tích hợp Frontend với Backend

## 1. Cài đặt và cấu hình

### 1.1. Cài đặt dependencies
```bash
npm install axios qrcode.react moment react-router-dom @mui/material @mui/icons-material @emotion/react @emotion/styled
```

### 1.2. Cấu hình API
Tạo file `src/config/api.js`:
```javascript
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Thêm interceptor để tự động thêm token vào header
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
```

## 2. Các chức năng chính

### 2.1. Đăng nhập
```javascript
// src/services/authService.js
import api from '../config/api';

export const login = async (username, password, role) => {
    try {
        const response = await api.post(`/auth/${role}/login`, { username, password });
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};
```

### 2.2. Tạo mã QR (Giáo viên)
```javascript
// src/services/attendanceService.js
import api from '../config/api';

export const generateQR = async (classId, scheduleId) => {
    try {
        const response = await api.post('/attendance/generate-qr', { classId, scheduleId });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};
```

### 2.3. Điểm danh (Sinh viên)
```javascript
// src/services/attendanceService.js
export const checkIn = async (qrData) => {
    try {
        const response = await api.post('/attendance/check-in', { qrData });
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};
```

### 2.4. Xem lịch sử điểm danh
```javascript
// src/services/attendanceService.js
export const getAttendanceHistory = async () => {
    try {
        const response = await api.get('/attendance/my-history');
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const getClassAttendanceHistory = async (classId) => {
    try {
        const response = await api.get(`/attendance/history/${classId}`);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};
```

### 2.5. Quản lý sinh viên
```javascript
// src/services/studentService.js
import api from '../config/api';

export const getStudentByUsername = async (username) => {
    try {
        const response = await api.get(`/students/${username}`);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};

export const updateStudentProfile = async (username, data) => {
    try {
        const response = await api.put(`/students/${username}/profile`, data);
        return response.data;
    } catch (error) {
        throw error.response.data;
    }
};
```

## 3. Các component chính

### 3.1. Component QR Code
```javascript
// src/components/QRCode.js
import QRCode from 'qrcode.react';
import { Box, Typography } from '@mui/material';

const QRCodeComponent = ({ qrData, expiresAt }) => {
    return (
        <Box sx={{ textAlign: 'center', p: 2 }}>
            <QRCode value={qrData} size={200} />
            <Typography variant="body2" sx={{ mt: 2 }}>
                Mã QR sẽ hết hạn vào: {new Date(expiresAt).toLocaleString()}
            </Typography>
        </Box>
    );
};
```

### 3.2. Component Điểm danh
```javascript
// src/components/CheckIn.js
import { useState } from 'react';
import { Box, Button, Typography, TextField } from '@mui/material';
import { checkIn } from '../services/attendanceService';

const CheckIn = () => {
    const [qrData, setQrData] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleCheckIn = async () => {
        try {
            const response = await checkIn(qrData);
            setResult(response);
            setError(null);
        } catch (error) {
            setError(error.message);
            setResult(null);
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Điểm danh
            </Typography>
            <TextField
                fullWidth
                label="Mã QR"
                value={qrData}
                onChange={(e) => setQrData(e.target.value)}
                margin="normal"
            />
            <Button variant="contained" onClick={handleCheckIn} sx={{ mt: 2 }}>
                Điểm danh
            </Button>
            {error && (
                <Typography color="error" sx={{ mt: 2 }}>
                    {error}
                </Typography>
            )}
            {result && (
                <Typography color="success" sx={{ mt: 2 }}>
                    Điểm danh thành công!
                </Typography>
            )}
        </Box>
    );
};
```

### 3.3. Component Lịch sử điểm danh
```javascript
// src/components/AttendanceHistory.js
import { useState, useEffect } from 'react';
import { Box, Typography, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { getAttendanceHistory, getClassAttendanceHistory } from '../services/attendanceService';

const AttendanceHistory = () => {
    const [history, setHistory] = useState([]);
    const [selectedClass, setSelectedClass] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const response = selectedClass 
                    ? await getClassAttendanceHistory(selectedClass)
                    : await getAttendanceHistory();
                setHistory(response.history);
                setLoading(false);
            } catch (error) {
                setError(error.message);
                setLoading(false);
            }
        };

        fetchHistory();
    }, [selectedClass]);

    if (loading) return <Typography>Đang tải...</Typography>;
    if (error) return <Typography color="error">{error}</Typography>;

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                Lịch sử điểm danh
            </Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Chọn lớp</InputLabel>
                <Select
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    label="Chọn lớp"
                >
                    <MenuItem value="">Tất cả</MenuItem>
                    {/* Thêm các lớp học vào đây */}
                </Select>
            </FormControl>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Ngày</TableCell>
                            <TableCell>Lớp</TableCell>
                            <TableCell>Thời gian</TableCell>
                            <TableCell>Trạng thái</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {history.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                                <TableCell>{record.className}</TableCell>
                                <TableCell>{record.checkinTime}</TableCell>
                                <TableCell>{record.status}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
```

## 4. Các trang chính

### 4.1. Trang đăng nhập
```javascript
// src/pages/Login.js
import { useState } from 'react';
import { Box, TextField, Button, Typography, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { login } from '../services/authService';
import { useNavigate } from 'react-router-dom';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student');
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            await login(username, password, role);
            navigate('/dashboard');
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <Box sx={{ maxWidth: 400, mx: 'auto', mt: 4, p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Đăng nhập
            </Typography>
            <form onSubmit={handleLogin}>
                <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Vai trò</InputLabel>
                    <Select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        label="Vai trò"
                    >
                        <MenuItem value="student">Sinh viên</MenuItem>
                        <MenuItem value="teacher">Giáo viên</MenuItem>
                        <MenuItem value="admin">Quản trị viên</MenuItem>
                    </Select>
                </FormControl>
                <TextField
                    fullWidth
                    label="Tên đăng nhập"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    margin="normal"
                />
                <TextField
                    fullWidth
                    label="Mật khẩu"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    margin="normal"
                />
                {error && (
                    <Typography color="error" sx={{ mt: 2 }}>
                        {error}
                    </Typography>
                )}
                <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
                    Đăng nhập
                </Button>
            </form>
        </Box>
    );
};
```

### 4.2. Trang dashboard
```javascript
// src/pages/Dashboard.js
import { Box, Typography, Grid, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { logout } from '../services/authService';
import QRCodeComponent from '../components/QRCode';
import CheckIn from '../components/CheckIn';
import AttendanceHistory from '../components/AttendanceHistory';

const Dashboard = () => {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('user'));

    useEffect(() => {
        if (!user) {
            navigate('/login');
        }
    }, [user, navigate]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    Chào mừng, {user?.name}
                </Typography>
                <Button variant="outlined" onClick={handleLogout}>
                    Đăng xuất
                </Button>
            </Box>
            <Grid container spacing={3}>
                {user?.role === 'teacher' && (
                    <Grid item xs={12} md={6}>
                        <QRCodeComponent />
                    </Grid>
                )}
                {user?.role === 'student' && (
                    <Grid item xs={12} md={6}>
                        <CheckIn />
                    </Grid>
                )}
                <Grid item xs={12}>
                    <AttendanceHistory />
                </Grid>
            </Grid>
        </Box>
    );
};
```

## 5. Cấu hình router
```javascript
// src/App.js
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const App = () => {
    const user = JSON.parse(localStorage.getItem('user'));

    return (
        <Router>
            <Routes>
                <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
                <Route path="/dashboard" element={user ? <Dashboard /> : <Navigate to="/login" />} />
                <Route path="/" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
            </Routes>
        </Router>
    );
};
```

## 6. Các lưu ý quan trọng

1. **Bảo mật**:
   - Luôn lưu token trong localStorage
   - Kiểm tra token trước mỗi request
   - Xóa token khi đăng xuất

2. **Xử lý lỗi**:
   - Hiển thị thông báo lỗi rõ ràng cho người dùng
   - Xử lý các trường hợp token hết hạn
   - Xử lý các lỗi mạng

3. **UX/UI**:
   - Hiển thị loading khi đang tải dữ liệu
   - Thông báo thành công/thất bại rõ ràng
   - Responsive design cho mobile

4. **Testing**:
   - Test các trường hợp điểm danh thành công/thất bại
   - Test các trường hợp hết hạn QR code
   - Test các trường hợp không có quyền truy cập

## 7. Các API cần tích hợp

1. **Authentication**:
   - POST /api/auth/student/login
   - POST /api/auth/teacher/login
   - POST /api/auth/admin/login

2. **Attendance**:
   - POST /api/attendance/generate-qr (Giáo viên)
   - POST /api/attendance/check-in (Sinh viên)
   - GET /api/attendance/my-history (Sinh viên)
   - GET /api/attendance/history/:classId (Sinh viên)
   - PUT /api/attendance/schedule/attendance-time (Giáo viên)

3. **Student Management**:
   - GET /api/students/:username
   - PUT /api/students/:username/profile

## 8. Các tính năng nâng cao có thể thêm

1. **Thông báo**:
   - Thông báo khi đến giờ điểm danh
   - Thông báo khi mã QR sắp hết hạn
   - Thông báo khi điểm danh thành công/thất bại

2. **Báo cáo**:
   - Thống kê tỷ lệ điểm danh
   - Xuất báo cáo điểm danh
   - Biểu đồ thống kê

3. **Tính năng khác**:
   - Cho phép giáo viên điểm danh thay cho sinh viên
   - Cho phép sinh viên xin phép vắng mặt
   - Gửi email thông báo cho sinh viên vắng mặt