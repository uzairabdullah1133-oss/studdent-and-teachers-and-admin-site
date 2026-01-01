

const STORAGE_KEY = 'education_portal_data_v1';

// Initial Seed Data
const DEFAULT_DATA = {
    users: [
        { id: 'a1', username: 'admin@admin.com', password: 'admin', role: 'admin', name: 'System Admin', pic: 'https://ui-avatars.com/api/?name=Admin&background=20b0a4&color=fff' },
        { id: 's_abd', username: 'Abdullah', password: 'Abdullah', role: 'student', name: 'Abdullah', classId: 'class10', pic: 'https://ui-avatars.com/api/?name=Abdullah&background=20b0a4&color=fff' },
        { id: 't1', username: 'Abdullah1', password: 'Abdullah1', role: 'teacher', name: 'Mr. Anderson', subjects: ['Math', 'Physics'], pic: 'https://ui-avatars.com/api/?name=Mr+Anderson&background=168a80&color=fff' }
    ],
    classes: [
        { id: 'playgroup', name: 'Play Group' },
        { id: 'nursery', name: 'Nursery' },
        { id: 'nursart', name: 'Nursart' },
        { id: 'prep', name: 'Prep' },
        { id: 'class1', name: 'Class 1' },
        { id: 'class2', name: 'Class 2' },
        { id: 'class3', name: 'Class 3' },
        { id: 'class4', name: 'Class 4' },
        { id: 'class5', name: 'Class 5' },
        { id: 'class6', name: 'Class 6' },
        { id: 'class7', name: 'Class 7' },
        { id: 'class8', name: 'Class 8' },
        { id: 'class9', name: 'Class 9' },
        { id: 'class10', name: 'Class 10' }
    ],
    students: [
        { id: 's_abd', name: 'Abdullah', classId: 'class10', rollNumber: '1099' },
        { id: 's1', name: 'Alex Johnson', classId: 'class10', rollNumber: '1001' },
        { id: 's2', name: 'Sarah Connor', classId: 'class10', rollNumber: '1002' },
        { id: 's3', name: 'John Doe', classId: 'class9', rollNumber: '9001' },
        { id: 's4', name: 'Jane Smith', classId: 'class5', rollNumber: '5001' }
    ],
    // fees: { studentId: { month: status } }
    fees: {
        's_abd': {
            'January': 'Unpaid', 'February': 'Unpaid', 'March': 'Unpaid', 'April': 'Unpaid',
            'May': 'Unpaid', 'June': 'Unpaid', 'July': 'Unpaid', 'August': 'Unpaid',
            'September': 'Unpaid', 'October': 'Unpaid', 'November': 'Unpaid', 'December': 'Unpaid'
        },
        's1': {
            'January': 'Paid',
            'February': 'Paid',
            'March': 'Unpaid',
            'April': 'Unpaid',
            'May': 'Unpaid',
            'June': 'Unpaid',
            'July': 'Unpaid',
            'August': 'Unpaid',
            'September': 'Unpaid',
            'October': 'Unpaid',
            'November': 'Unpaid',
            'December': 'Unpaid'
        },
        's2': {
            'January': 'Unpaid',
            'February': 'Unpaid'
        }
    },
    results: {
        's1': [
            { subject: 'Math', marks: 85, total: 100, grade: 'A', remarks: 'Excellent progress' },
            { subject: 'Physics', marks: 78, total: 100, grade: 'B', remarks: 'Good, keep it up' }
        ]
    },
    attendance: {
        's1': {
            '2025-01-01': 'Present',
            '2025-01-02': 'Absent',
            '2025-01-03': 'Present'
        },
        't1': {
            '2025-01-01': 'Present',
            '2025-01-02': 'Present'
        }
    },
    teacherAssignments: {
        't1': [
            { classId: 'class10', subject: 'Math', schedule: 'Mon-Wed 10:00 AM' },
            { classId: 'class9', subject: 'Physics', schedule: 'Tue-Thu 11:30 AM' }
        ]
    }
    ,
    logs: []
};

class DataService {
    constructor() {
        this.load();
    }

    load() {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            this.data = JSON.parse(stored);
            // Migrating old data if necessary
            if (!this.data.teacherAssignments) this.data.teacherAssignments = {};
            if (!this.data.fees['s1'] || typeof this.data.fees['s1'] === 'string') {
                // Fix old fee structure if it exists
                this.data.fees = DEFAULT_DATA.fees;
            }

            // Ensure essential early-years classes exist
            try {
                const ensure = [
                    { id: 'playgroup', name: 'Play Group' },
                    { id: 'nursary', name: 'Nursary' },
                    { id: 'prep', name: 'Prep' }
                ];
                if (!this.data.classes) this.data.classes = [];
                this.data.classes = this.data.classes.filter(c => !ensure.find(e => e.id === c.id));
                this.data.classes = [...ensure, ...this.data.classes];
            } catch (e) { }

            // UPDATE: Ensure Abdullah and Teacher credentials
            try {
                // 1. Ensure Abdullah exists
                let abd = this.data.users.find(u => u.username === 'Abdullah');
                if (!abd) {
                    // Create Abdullah user
                    abd = { id: 's_abd', username: 'Abdullah', password: 'Abdullah', role: 'student', name: 'Abdullah', classId: 'class10', pic: 'https://ui-avatars.com/api/?name=Abdullah&background=20b0a4&color=fff' };
                    this.data.users.push(abd);
                } else {
                    // Force update password
                    abd.password = 'Abdullah';
                }
                // Ensure Abdullah is in students list
                if (!this.data.students) this.data.students = [];
                if (!this.data.students.find(s => s.id === 's_abd' || s.name === 'Abdullah')) {
                    this.data.students.push({ id: 's_abd', name: 'Abdullah', classId: 'class10', rollNumber: '1099' });
                    if (!this.data.fees['s_abd']) this.data.fees['s_abd'] = this.initMonthlyFees();
                    if (!this.data.attendance['s_abd']) this.data.attendance['s_abd'] = {};
                }

                // 2. Ensure Teacher credentials (find first teacher or t1)
                // 2. Ensure Teacher credentials (find first teacher or t1)
                let teacher = this.data.users.find(u => u.id === 't1') || this.data.users.find(u => u.role === 'teacher');
                if (teacher) {
                    teacher.username = 'Abdullah1';
                    teacher.password = 'Abdullah1';
                    // ensure user knows this is the teacher
                } else {
                    // Create if missing
                    this.data.users.push({ id: 't1', username: 'Abdullah1', password: 'Abdullah1', role: 'teacher', name: 'Mr. Anderson', subjects: ['Math', 'Physics'], pic: 'https://ui-avatars.com/api/?name=Mr+Anderson&background=168a80&color=fff' });
                    // ensure t1 in attendance/assignments if needed, but simple push is enough for login
                }

                // 3. Admin refresh
                let admin = this.data.users.find(u => (u.role || '').toLowerCase() === 'admin');
                if (!admin) {
                    admin = { id: 'a1', username: 'admin@admin.com', password: 'admin', role: 'admin', name: 'System Admin', pic: 'https://ui-avatars.com/api/?name=Admin&background=20b0a4&color=fff' };
                    this.data.users.unshift(admin);
                } else {
                    admin.username = 'admin@admin.com';
                    admin.password = 'admin';
                }

                this.save();
            } catch (e) { console.error('Migration error', e); }

        } else {
            this.data = DEFAULT_DATA;
            this.save();
        }
    }

    save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
    }

    addStudent(classId, name, rollNumber) {
        const id = 's' + Date.now();
        const newStudent = { id, name, classId, rollNumber };
        this.data.students.push(newStudent);

        // Init other data structures for this student
        this.data.fees[id] = this.initMonthlyFees();
        this.data.results[id] = [];
        this.data.attendance[id] = {};

        // Also add to users so they can login (default password)
        this.data.users.push({
            id,
            username: name.toLowerCase().replace(/\s/g, ''),
            password: 'password',
            role: 'student',
            name: name,
            classId,
            pic: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&color=fff`
        });

        this.save();
        return newStudent;
    }

    initMonthlyFees() {
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const fees = {};
        months.forEach(m => fees[m] = 'Unpaid');
        return fees;
    }

    // Auth
    async hashPassword(password) {
        if (!password) return '';
        const enc = new TextEncoder();
        const data = enc.encode(password);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const arr = Array.from(new Uint8Array(hash));
        return arr.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    // login will only succeed for enrolled users; admin is preconfigured
    async login(username, password) {
        if (!username || !password) return null;
        let user = this.data.users.find(u => (u.username && u.username.toLowerCase() === username.toLowerCase()));
        // allow admin alias 'admin' to match admin@admin.com
        if (!user && username.toLowerCase() === 'admin') {
            user = this.data.users.find(u => (u.username && u.username.toLowerCase() === 'admin@admin.com'));
        }
        if (!user) return null;

        // If stored password looks like a hex SHA-256 (64 hex chars), compare hashed passwords
        const isStoredHashed = typeof user.password === 'string' && /^[a-f0-9]{64}$/i.test(user.password);
        if (isStoredHashed) {
            const hash = await this.hashPassword(password);
            if (hash === user.password) return user;
            return null;
        }

        // stored as plaintext - accept if matches and migrate to hashed password
        if (user.password === password) {
            const hash = await this.hashPassword(password);
            user.password = hash;
            this.save();
            return user;
        }

        return null;
    }

    register(user) {
        if (this.data.users.find(u => u.username && u.username.toLowerCase() === user.username.toLowerCase())) {
            return { success: false, message: 'Username already exists' };
        }

        // only allow student or teacher registration
        const role = (user.role || '').toLowerCase();
        if (!['student', 'teacher'].includes(role)) {
            return { success: false, message: 'Invalid role for registration' };
        }

        const id = (role.charAt(0)) + Date.now();
        const newUser = {
            id,
            username: user.username,
            password: user.password, // should be hashed by caller
            role,
            name: user.name,
            pic: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=random&color=fff`
        };

        if (role === 'student') {
            newUser.classId = user.classId || '';
            const rollNumber = `${user.classId || '0'}${Math.floor(1000 + Math.random() * 9000)}`;
            this.data.students.push({ id, name: user.name, classId: user.classId || '', rollNumber });
            this.data.fees[id] = this.initMonthlyFees();
            this.data.results[id] = [];
            this.data.attendance[id] = {};
        } else if (role === 'teacher') {
            newUser.subjects = user.subjects || [];
            this.data.attendance[id] = {};
            this.data.teacherAssignments[id] = [];
        }

        this.data.users.push(newUser);
        this.save();
        return { success: true, user: newUser };
    }

    getUser(id) {
        return this.data.users.find(u => u.id === id);
    }

    updateProfilePic(userId, newUrl) {
        const user = this.data.users.find(u => u.id === userId);
        if (user) {
            user.pic = newUrl;
            this.save();
            return true;
        }
        return false;
    }

    getStudentFees(studentId) {
        return this.data.fees[studentId] || this.initMonthlyFees();
    }

    payMonthFees(studentId, month) {
        if (!this.data.fees[studentId]) {
            this.data.fees[studentId] = this.initMonthlyFees();
        }
        this.data.fees[studentId][month] = 'Paid';
        this.save();
        return true;
    }

    getStudentResults(studentId) {
        return this.data.results[studentId] || [];
    }

    getStudentAttendance(studentId) {
        return this.data.attendance[studentId] || {};
    }

    getClasses() {
        return this.data.classes;
    }

    addClass(name) {
        if (!name || !name.trim()) return null;
        const idBase = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || ('class' + Date.now());
        let id = idBase;
        // ensure unique id
        let i = 1;
        while (this.data.classes.find(c => c.id === id)) {
            id = idBase + '_' + i;
            i++;
        }
        const cls = { id, name: name.trim() };
        this.data.classes.push(cls);
        this.save();
        return cls;
    }

    addTeacherSubject(teacherId, subject) {
        if (!teacherId || !subject || !subject.trim()) return false;
        const user = this.data.users.find(u => u.id === teacherId && (u.role || '').toLowerCase() === 'teacher');
        if (!user) return false;
        if (!Array.isArray(user.subjects)) user.subjects = [];
        const s = subject.trim();
        if (!user.subjects.includes(s)) user.subjects.push(s);
        this.save();
        return true;
    }

    getStudentsByClass(classId) {
        return this.data.students.filter(s => s.classId === classId);
    }


    markAttendance(id, date, status) {
        if (!this.data.attendance[id]) this.data.attendance[id] = {};
        const dateStr = (date instanceof Date) ? date.toISOString().split('T')[0] : date;
        this.data.attendance[id][dateStr] = status;
        this.save();
    }


    updateMarks(studentId, subject, marks, remarks = '') {
        if (!this.data.results[studentId]) {
            this.data.results[studentId] = [];
        }
        let existing = this.data.results[studentId].find(r => r.subject === subject);
        if (existing) {
            existing.marks = parseInt(marks);
            existing.remarks = remarks;
            existing.grade = this.calculateGrade(marks);
        } else {
            this.data.results[studentId].push({
                subject,
                marks: parseInt(marks),
                total: 100,
                grade: this.calculateGrade(marks),
                remarks: remarks
            });
        }
        this.save();
    }

    // Enhanced wrappers that record actor logs
    markAttendanceBy(studentId, date, status, actorId) {
        this.markAttendance(studentId, date, status);
        if (!this.data.logs) this.data.logs = [];
        this.addLog({ type: 'attendance', action: status, studentId, date: (date instanceof Date) ? date.toISOString().split('T')[0] : date, actorId });
    }

    updateMarksBy(actorId, studentId, subject, marks, remarks = '') {
        this.updateMarks(studentId, subject, marks, remarks);
        if (!this.data.logs) this.data.logs = [];
        this.addLog({ type: 'marks', action: 'update', studentId, subject, marks, remarks, actorId, date: new Date().toISOString() });
    }

    addLog(entry) {
        if (!this.data.logs) this.data.logs = [];
        const item = { id: 'log' + Date.now(), ...entry };
        this.data.logs.push(item);
        this.save();
        return item;
    }

    getLogs() {
        return this.data.logs || [];
    }

    getAttendancePercentage(studentId) {
        const att = this.data.attendance[studentId] || {};
        const dates = Object.keys(att);
        if (dates.length === 0) return 0;
        const present = dates.filter(d => att[d] === 'Present').length;
        return Math.round((present / dates.length) * 100);
    }

    calculateGrade(marks) {
        if (marks >= 90) return 'A+';
        if (marks >= 80) return 'A';
        if (marks >= 70) return 'B';
        if (marks >= 60) return 'C';
        if (marks >= 50) return 'D';
        return 'F';
    }

    getTeacherAssignments(teacherId) {
        return this.data.teacherAssignments[teacherId] || [];
    }

    assignSubjectToTeacher(teacherId, classId, subject, schedule) {
        if (!this.data.teacherAssignments[teacherId]) {
            this.data.teacherAssignments[teacherId] = [];
        }
        this.data.teacherAssignments[teacherId].push({ classId, subject, schedule });
        this.save();
    }

    removeUser(userId) {
        this.data.users = this.data.users.filter(u => u.id !== userId);
        this.data.students = this.data.students.filter(s => s.id !== userId);
        // Clean up other refs if needed
        this.save();
    }

    updateUserName(userId, newName) {
        const user = this.data.users.find(u => u.id === userId);
        if (!user) return false;
        user.name = newName;
        this.save();
        return true;
    }

    getAllUsers() {
        return this.data.users.slice();
    }

    reset() {
        localStorage.removeItem(STORAGE_KEY);
        this.load();
    }
    adminCreateUser(data) {
        if (!data.username || !data.password || !data.name || !data.role) {
            return { success: false, message: 'Missing required fields' };
        }
        if (this.data.users.find(u => u.username && u.username.toLowerCase() === data.username.toLowerCase())) {
            return { success: false, message: 'Username already exists' };
        }

        const role = data.role.toLowerCase();
        const id = (role.charAt(0)) + Date.now() + Math.floor(Math.random() * 100);

        const newUser = {
            id,
            username: data.username,
            password: data.password, // handled by caller hashing or login migration
            role,
            name: data.name,
            pic: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name)}&background=random&color=fff`
        };

        if (role === 'student') {
            newUser.classId = data.classId || '';
            const rollNumber = `${data.classId || '0'}${Math.floor(1000 + Math.random() * 9000)}`;
            this.data.students.push({ id, name: data.name, classId: data.classId || '', rollNumber });
            this.data.fees[id] = this.initMonthlyFees();
            this.data.results[id] = [];
            this.data.attendance[id] = {};
        } else if (role === 'teacher') {
            newUser.subjects = data.subjects || [];
            this.data.attendance[id] = {};
            this.data.teacherAssignments[id] = [];

            // Create initial assignments if classes are selected
            if (data.assignedClassIds && Array.isArray(data.assignedClassIds)) {
                const subjectToAssign = (newUser.subjects.length > 0) ? newUser.subjects[0] : 'General';
                data.assignedClassIds.forEach(cid => {
                    this.data.teacherAssignments[id].push({ classId: cid, subject: subjectToAssign, schedule: '' });
                });
            }
        }

        this.data.users.push(newUser);
        this.save();
        return { success: true, user: newUser };
    }
}

// Expose to window
window.db = new DataService();

