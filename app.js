document.addEventListener('DOMContentLoaded', () => {
    const path = window.location.pathname.split('/').pop();

    function setSession(user) {
        const safeUser = { id: user.id, username: user.username, name: user.name, role: user.role, pic: user.pic };
        localStorage.setItem('currentUser', JSON.stringify(safeUser));
    }

    function getSession() {
        try { return JSON.parse(localStorage.getItem('currentUser')); } catch (e) { return null; }
    }

    // Login page
    if (path === 'login.html') {
        const params = new URLSearchParams(window.location.search);
        const role = (params.get('role') || 'student').toLowerCase();

        const roleTitle = document.getElementById('roleTitle');
        const roleIcon = document.getElementById('roleIcon');
        const roleDesc = document.getElementById('roleDesc');
        const form = document.getElementById('loginForm');
        const errorEl = document.getElementById('error');

        roleTitle.textContent = `${role.charAt(0).toUpperCase() + role.slice(1)} Login`;
        roleDesc.textContent = `Sign in with your ${role} account`;
        roleIcon.className = `role-icon ${role}`;
        // set a role-specific icon glyph but keep styling consistent
        if (role === 'student') roleIcon.innerHTML = '<i class="fas fa-user-graduate"></i>';
        else if (role === 'teacher') roleIcon.innerHTML = '<i class="fas fa-chalkboard-teacher"></i>';
        else if (role === 'admin') roleIcon.innerHTML = '<i class="fas fa-user-shield"></i>';
        else roleIcon.innerHTML = '<i class="fas fa-user"></i>';

        // Adjust username/email label and placeholder per-role
        const usernameLabel = document.querySelector('label[for="username"]');
        const usernameInput = document.getElementById('username');
        if (usernameLabel && usernameInput) {
            if (role === 'admin') {
                usernameLabel.innerHTML = '<b>Email</b>';
                usernameInput.placeholder = 'Enter email';
                usernameInput.type = 'email';
            } else {
                usernameLabel.innerHTML = '<b>Username</b>';
                usernameInput.placeholder = 'Enter username';
                usernameInput.type = 'text';
            }
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;

            if (!username || !password) {
                errorEl.textContent = 'Please enter username and password';
                errorEl.style.display = 'block';
                return;
            }

            const user = await window.db.login(username, password);
            if (!user) {
                errorEl.textContent = 'Invalid username or password or not enrolled';
                errorEl.style.display = 'block';
                return;
            }

            if ((user.role || '').toLowerCase() !== role) {
                errorEl.textContent = 'This account is not authorized for the selected role';
                errorEl.style.display = 'block';
                return;
            }

            setSession(user);
            window.location.href = `${role}-dashboard.html`;
        });
    }

    // Enrollment page
    if (path === 'enroll.html') {
        const form = document.getElementById('enrollForm');
        const roleSelect = document.getElementById('roleSelect');
        const studentFields = document.getElementById('studentFields');
        const teacherFields = document.getElementById('teacherFields');
        const classSelect = document.getElementById('classSelect');
        const subjectInput = document.getElementById('subjectInput');
        const errorEl = document.getElementById('enrollError');
        const successEl = document.getElementById('enrollSuccess');

        // populate classes
        const classes = (window.db && window.db.getClasses) ? window.db.getClasses() : [];
        classSelect.innerHTML = classes.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

        roleSelect.addEventListener('change', () => {
            const r = roleSelect.value;
            if (r === 'student') {
                studentFields.style.display = '';
                teacherFields.style.display = 'none';
            } else {
                studentFields.style.display = 'none';
                teacherFields.style.display = '';
            }
        });

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            errorEl.style.display = 'none';
            successEl.style.display = 'none';

            const name = document.getElementById('fullName').value.trim();
            const username = document.getElementById('username').value.trim();
            const password = document.getElementById('password').value;
            const role = roleSelect.value;
            const classId = classSelect.value;
            const subjects = (subjectInput.value || '').split(',').map(s => s.trim()).filter(Boolean);

            if (!name || !username || !password) {
                errorEl.textContent = 'Please complete all required fields.';
                errorEl.style.display = 'block';
                return;
            }

            try {
                const hashed = await window.db.hashPassword(password);
                const payload = { name, username, password: hashed, role };
                if (role === 'student') payload.classId = classId;
                if (role === 'teacher') payload.subjects = subjects;

                const res = window.db.register(payload);
                if (!res || !res.success) {
                    errorEl.textContent = res && res.message ? res.message : 'Enrollment failed';
                    errorEl.style.display = 'block';
                    return;
                }

                successEl.textContent = 'Enrollment successful. Redirecting to login...';
                successEl.style.display = 'block';
                setTimeout(() => {
                    window.location.href = `login.html?role=${role}`;
                }, 1200);
            } catch (err) {
                errorEl.textContent = 'Unexpected error: ' + (err && err.message ? err.message : err);
                errorEl.style.display = 'block';
            }
        });
    }

    // Dashboard pages
    if (path && path.endsWith('-dashboard.html')) {
        const session = getSession();
        const pageRole = path.split('-')[0];
        if (!session) {
            window.location.href = 'index.html';
            return;
        }
        if ((session.role || '').toLowerCase() !== pageRole) {
            // Role mismatch, send back to role selection
            window.location.href = 'index.html';
            return;
        }

        // Populate profile area
        const avatar = document.getElementById('avatar');
        const displayName = document.getElementById('displayName');
        const displayRole = document.getElementById('displayRole');
        if (avatar) avatar.src = session.pic || '';
        if (displayName) displayName.textContent = session.name || session.username;
        if (displayRole) displayRole.textContent = `${session.role.charAt(0).toUpperCase() + session.role.slice(1)}`;

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('currentUser');
                window.location.href = 'index.html';
            });
        }

        // Shared helper: attach a robust save-profile handler to a button
        function attachSaveProfileHandler({ buttonId = 'saveProfile', nameInputId = 'editName', fileInputId = 'editPicFile', msgId = 'profileMsg' } = {}) {
            const btn = document.getElementById(buttonId);
            const nameEl = document.getElementById(nameInputId);
            const fileEl = document.getElementById(fileInputId);
            const msgEl = document.getElementById(msgId);
            if (!btn) return;
            // replace the button node to clear previous listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (msgEl) { msgEl.style.display = 'none'; }
                const newName = (nameEl && nameEl.value) ? nameEl.value.trim() : '';
                const hasFile = fileEl && fileEl.files && fileEl.files.length > 0;
                if (!newName && !hasFile) {
                    if (msgEl) {
                        msgEl.textContent = 'Please provide a name or choose a picture to update.';
                        msgEl.style.color = '#c0392b';
                        msgEl.style.display = 'block';
                    }
                    return;
                }
                newBtn.disabled = true;
                const origText = newBtn.textContent;
                newBtn.textContent = 'Saving...';
                try {
                    let picUrl = (session && session.pic) ? session.pic : '';
                    if (hasFile) {
                        const file = fileEl.files[0];
                        picUrl = await new Promise((res, rej) => {
                            const fr = new FileReader();
                            fr.onload = () => res(fr.result);
                            fr.onerror = rej;
                            fr.readAsDataURL(file);
                        });
                        if (window.db && window.db.updateProfilePic) window.db.updateProfilePic(session.id, picUrl);
                    }
                    if (newName && window.db && window.db.updateUserName) window.db.updateUserName(session.id, newName);
                    const updated = { ...session, name: newName || session.name, pic: picUrl };
                    localStorage.setItem('currentUser', JSON.stringify(updated));
                    if (msgEl) {
                        msgEl.textContent = 'Profile updated successfully';
                        msgEl.style.color = '#2e7d32';
                        msgEl.style.display = 'block';
                    }
                    if (displayName && newName) displayName.textContent = newName;
                    if (avatar && picUrl) avatar.src = picUrl;
                } catch (err) {
                    console.error('Save profile failed', err);
                    if (msgEl) {
                        msgEl.textContent = 'Failed to save profile. Try again.';
                        msgEl.style.color = '#c0392b';
                        msgEl.style.display = 'block';
                    }
                } finally {
                    newBtn.disabled = false;
                    newBtn.textContent = origText;
                }
            });
        }

        // Profile Menu Logic
        const profileMenuBtn = document.getElementById('profileMenuBtn');
        const profileMenuDropdown = document.getElementById('profileMenuDropdown');
        const menuEditProfile = document.getElementById('menuEditProfile');
        const profileEditCard = document.getElementById('profileEditCard');

        if (profileMenuBtn && profileMenuDropdown) {
            profileMenuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Close any other open menus if we had them, but here just toggle
                profileMenuDropdown.classList.toggle('show');
            });

            // Close menu when clicking outside
            document.addEventListener('click', (e) => {
                if (!profileMenuBtn.contains(e.target) && !profileMenuDropdown.contains(e.target)) {
                    profileMenuDropdown.classList.remove('show');
                }
            });
        }

        if (menuEditProfile && profileEditCard) {
            menuEditProfile.addEventListener('click', (e) => {
                e.preventDefault();
                profileMenuDropdown.classList.remove('show');
                profileEditCard.style.display = 'block';
                // Popoulate/focus
                const editName = document.getElementById('editName');
                if (editName && !editName.value) {
                    editName.value = session.name || session.username || '';
                }
                const firstInput = profileEditCard.querySelector('input');
                if (firstInput) firstInput.focus();
            });
        }

        // Cancel Button Logic
        const cancelProfileBtn = document.getElementById('cancelProfile');
        if (cancelProfileBtn && profileEditCard) {
            cancelProfileBtn.addEventListener('click', (e) => {
                e.preventDefault();
                profileEditCard.style.display = 'none';
                const msgEl = document.getElementById('profileMsg');
                if (msgEl) msgEl.style.display = 'none';
            });
        }

        // Initialize save handler for all roles if elements exist
        attachSaveProfileHandler();

        // Student dashboard enhancements
        if (pageRole === 'student') {
            const editName = document.getElementById('editName');
            const editPicFile = document.getElementById('editPicFile');
            const saveProfile = document.getElementById('saveProfile');
            const profileMsg = document.getElementById('profileMsg');
            const attendancePercent = document.getElementById('attendancePercent');
            const attendanceMeta = document.getElementById('attendanceMeta');
            const resultsTableBody = document.querySelector('#resultsTable tbody');
            const performanceSummary = document.getElementById('performanceSummary');

            // Populate editable fields
            if (editName) editName.value = session.name || '';
            // file input cannot be prefilled for security; show current avatar instead via img

            // Load attendance & results
            const percent = (window.db && window.db.getAttendancePercentage) ? window.db.getAttendancePercentage(session.id) : 0;
            if (attendancePercent) attendancePercent.textContent = percent + '%';
            const att = window.db.getStudentAttendance(session.id) || {};
            const dates = Object.keys(att).sort().reverse();
            if (attendanceMeta) {
                if (dates.length === 0) attendanceMeta.textContent = 'No attendance records yet.';
                else attendanceMeta.innerHTML = dates.slice(0, 7).map(d => `${d}: <strong>${att[d]}</strong>`).join('<br>');
            }

            const results = window.db.getStudentResults(session.id) || [];
            if (resultsTableBody) {
                resultsTableBody.innerHTML = results.map(r => `<tr><td>${r.subject}</td><td>${r.marks}</td><td>${r.grade}</td><td>${r.remarks || ''}</td></tr>`).join('');
            }

            if (performanceSummary) {
                if (results.length === 0) performanceSummary.textContent = 'No result data yet.';
                else {
                    const avg = Math.round(results.reduce((s, r) => s + (r.marks || 0), 0) / results.length);
                    performanceSummary.innerHTML = `<div>Avg Marks: <strong>${avg}</strong></div><div>Subjects: ${results.length}</div>`;
                }
            }

            // Attach centralized save handler for student profile
            attachSaveProfileHandler({ buttonId: 'saveProfile', nameInputId: 'editName', fileInputId: 'editPicFile', msgId: 'profileMsg' });
        }

        // Teacher dashboard enhancements
        if (pageRole === 'teacher') {
            const classSelect = document.getElementById('classSelect');
            const subjectSelect = document.getElementById('subjectSelect');
            const loadStudents = document.getElementById('loadStudents');
            const studentsArea = document.getElementById('studentsArea');
            const studentsTableBody = document.querySelector('#studentsTable tbody');
            const saveAttendance = document.getElementById('saveAttendance');
            const saveMarks = document.getElementById('saveMarks');
            const teacherMsg = document.getElementById('teacherMsg');
            const monthSelect = document.getElementById('monthSelect');
            const dateInput = document.getElementById('dateInput');

            // populate classes and subjects from teacher assignments when possible
            const assignments = window.db.getTeacherAssignments(session.id) || [];
            const assignedClasses = [...new Set(assignments.map(a => a.classId))];
            // populate class select with placeholder and show preferred early-years classes first
            const allClasses = window.db.getClasses() || [];
            const preferredOrder = ['playgroup', 'nursary', 'prep'];
            const preferredClasses = preferredOrder.map(id => allClasses.find(c => c.id === id)).filter(Boolean);
            const assignedClassObjects = assignedClasses.map(cid => allClasses.find(c => c.id === cid)).filter(Boolean).filter(c => !preferredOrder.includes(c.id));
            const remaining = allClasses.filter(c => !preferredOrder.includes(c.id) && !assignedClasses.includes(c.id));
            const orderedClasses = [...preferredClasses, ...assignedClassObjects, ...remaining];
            classSelect.innerHTML = '<option value="">-- Select Class --</option>' + orderedClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');

            // populate subjects: prefer teacher's user.subjects, then assignments, else empty placeholder
            const teacherUser = window.db.getUser(session.id) || {};
            const subjectsFromUser = (teacherUser.subjects || []).slice();
            const subjectsFromAssign = assignments.map(a => a.subject).filter(Boolean);
            const subjectsSet = [...new Set([...(subjectsFromUser || []), ...(subjectsFromAssign || [])])];
            // populate datalist for editable subject input
            const subjectList = document.getElementById('subjectList');
            if (subjectList) subjectList.innerHTML = subjectsSet.map(s => `<option value="${s}">`).join('');

            // Populate teacher attendance card
            const teacherAttendancePercent = document.getElementById('teacherAttendancePercent');
            const teacherAttendanceMeta = document.getElementById('teacherAttendanceMeta');
            try {
                const tPercent = (window.db && window.db.getAttendancePercentage) ? window.db.getAttendancePercentage(session.id) : 0;
                if (teacherAttendancePercent) teacherAttendancePercent.textContent = tPercent + '%';
                const tatt = (window.db && window.db.getStudentAttendance) ? window.db.getStudentAttendance(session.id) : {};
                const tdates = Object.keys(tatt).sort().reverse();
                if (teacherAttendanceMeta) {
                    if (tdates.length === 0) teacherAttendanceMeta.textContent = 'No attendance records yet.';
                    else teacherAttendanceMeta.innerHTML = tdates.slice(0, 7).map(d => `${d}: <strong>${tatt[d]}</strong>`).join('<br>');
                }
            } catch (e) {
                if (teacherAttendanceMeta) teacherAttendanceMeta.textContent = 'Unable to load attendance.';
            }

            // Dependent dropdown: when class changes, prefer subjects assigned to that class; otherwise fall back to teacher subjects
            if (classSelect) {
                classSelect.addEventListener('change', () => {
                    const cid = classSelect.value;
                    const assignForClass = assignments.filter(a => a.classId === cid).map(a => a.subject).filter(Boolean);
                    let options = [];
                    if (cid && assignForClass.length > 0) options = [...new Set(assignForClass)];
                    else options = subjectsSet.slice();
                    // update datalist options for the subject input
                    const subjectList2 = document.getElementById('subjectList');
                    if (subjectList2) subjectList2.innerHTML = options.map(s => `<option value="${s}">`).join('');
                    if (teacherMsg) teacherMsg.style.display = 'none';
                    if (studentsArea) studentsArea.style.display = 'none';
                });
            }

            loadStudents.addEventListener('click', () => {
                const classId = classSelect.value;
                const subject = subjectSelect.value;
                if (!classId) {
                    teacherMsg.textContent = 'Please select a class.';
                    teacherMsg.style.color = '#c0392b';
                    teacherMsg.style.display = 'block';
                    return;
                }
                if (!subject) {
                    teacherMsg.textContent = 'Please select a subject before loading students.';
                    teacherMsg.style.color = '#c0392b';
                    teacherMsg.style.display = 'block';
                    return;
                }
                const students = window.db.getStudentsByClass(classId) || [];
                if (!students.length) {
                    teacherMsg.textContent = 'No students found for selected class.';
                    teacherMsg.style.display = 'block';
                    studentsArea.style.display = 'none';
                    return;
                }
                teacherMsg.style.display = 'none';
                studentsArea.style.display = '';
                const dateVal = (dateInput && dateInput.value) ? dateInput.value : '';
                studentsTableBody.innerHTML = students.map(s => {
                    const results = window.db.getStudentResults(s.id) || [];
                    const sub = results.find(r => r.subject === subject);
                    const marksVal = sub ? sub.marks : '';
                    const att = dateVal ? ((window.db.getStudentAttendance(s.id) || {})[dateVal] || '') : '';
                    return `<tr data-student="${s.id}"><td>${s.rollNumber || ''}</td><td>${s.name}</td><td><select class="attSelect"><option value="">--</option><option value="Present" ${att === 'Present' ? 'selected' : ''}>Present</option><option value="Absent" ${att === 'Absent' ? 'selected' : ''}>Absent</option></select></td><td><input class="marksInput" type="number" min="0" max="100" value="${marksVal}" style="width:80px" /></td></tr>`;
                }).join('');
            });

            // Clear messages / student area when selections change
            [classSelect, subjectSelect, monthSelect, dateInput].forEach(el => {
                if (!el) return;
                el.addEventListener('change', () => {
                    if (teacherMsg) teacherMsg.style.display = 'none';
                    if (studentsArea) studentsArea.style.display = 'none';
                    if (studentsTableBody) studentsTableBody.innerHTML = '';
                });
            });

            // Enable/disable marks inputs when subject changes (for rows already loaded)
            if (subjectSelect) {
                subjectSelect.addEventListener('input', () => {
                    const rows = document.querySelectorAll('#studentsTable tbody tr');
                    rows.forEach(r => {
                        const input = r.querySelector('.marksInput');
                        if (input) input.disabled = !subjectSelect.value;
                    });
                });
            }

            // Save attendance handler
            if (saveAttendance) {
                saveAttendance.addEventListener('click', () => {
                    const monthVal = monthSelect && monthSelect.value ? parseInt(monthSelect.value) : null;
                    const dateVal = dateInput && dateInput.value ? dateInput.value : null;
                    if (!monthVal || !dateVal) {
                        if (teacherMsg) { teacherMsg.textContent = 'Select both month and day before saving attendance.'; teacherMsg.style.color = '#c0392b'; teacherMsg.style.display = 'block'; }
                        return;
                    }
                    const dt = new Date(dateVal);
                    if ((dt.getMonth() + 1) !== monthVal) {
                        if (teacherMsg) { teacherMsg.textContent = 'Selected day does not match selected month.'; teacherMsg.style.color = '#c0392b'; teacherMsg.style.display = 'block'; }
                        return;
                    }
                    const rows = document.querySelectorAll('#studentsTable tbody tr');
                    rows.forEach(r => {
                        const sid = r.getAttribute('data-student');
                        const sel = r.querySelector('.attSelect');
                        if (sel && sel.value) {
                            window.db.markAttendanceBy(sid, dateVal, sel.value, session.id);
                        }
                    });
                    if (teacherMsg) { teacherMsg.textContent = 'Attendance saved.'; teacherMsg.style.color = '#2e7d32'; teacherMsg.style.display = 'block'; setTimeout(() => teacherMsg.style.display = 'none', 1800); }
                });
            }

            // Save marks handler
            if (saveMarks) {
                saveMarks.addEventListener('click', () => {
                    const subject = subjectSelect && subjectSelect.value ? subjectSelect.value.trim() : '';
                    if (!subject) {
                        if (teacherMsg) { teacherMsg.textContent = 'Select subject before saving marks.'; teacherMsg.style.color = '#c0392b'; teacherMsg.style.display = 'block'; }
                        return;
                    }
                    const rows = document.querySelectorAll('#studentsTable tbody tr');
                    rows.forEach(r => {
                        const sid = r.getAttribute('data-student');
                        const input = r.querySelector('.marksInput');
                        const val = input && input.value ? parseInt(input.value) : null;
                        if (val !== null && !isNaN(val)) {
                            window.db.updateMarksBy(session.id, sid, subject, val, 'Entered by teacher');
                        }
                    });
                    if (teacherMsg) { teacherMsg.textContent = 'Marks saved.'; teacherMsg.style.color = '#2e7d32'; teacherMsg.style.display = 'block'; setTimeout(() => teacherMsg.style.display = 'none', 1800); }
                });
            }


            // Attach centralized save handler for teacher profile
            attachSaveProfileHandler({ buttonId: 'saveProfile', nameInputId: 'editName', fileInputId: 'editPicFile', msgId: 'profileMsg' });
        }

        // Admin dashboard enhancements
        if (pageRole === 'admin') {
            const adminStudentsCount = document.getElementById('adminStudentsCount');
            const adminTeachersCount = document.getElementById('adminTeachersCount');
            const logsArea = document.getElementById('logsArea');
            const adminTeacherSelect = document.getElementById('adminTeacherSelect');
            const adminSubjectInput = document.getElementById('adminSubjectInput');
            const adminSubjectList = document.getElementById('adminSubjectList');
            const adminMonthSelect = document.getElementById('adminMonthSelect');
            const adminDateInput = document.getElementById('adminDateInput');
            const adminAttStatus = document.getElementById('adminAttStatus');
            const adminSaveTeacherAtt = document.getElementById('adminSaveTeacherAtt');
            const adminTeacherMsg = document.getElementById('adminTeacherMsg');
            const users = window.db.getAllUsers();
            const students = users.filter(u => (u.role || '').toLowerCase() === 'student');
            const teachers = users.filter(u => (u.role || '').toLowerCase() === 'teacher');
            if (adminStudentsCount) adminStudentsCount.textContent = students.length;
            if (adminTeachersCount) adminTeachersCount.textContent = teachers.length;
            const logs = window.db.getLogs().slice().reverse();
            if (logsArea) logsArea.innerHTML = logs.slice(0, 200).map(l => `<div style="padding:6px;border-bottom:1px solid #eef">[${l.date || ''}] ${l.type} - ${l.action} ${l.subject ? (' ' + l.subject) : ''} by ${l.actorId || ''} ${l.studentId ? (' on ' + l.studentId) : ''}</div>`).join('');

            // Populate admin teacher select and subject suggestions
            if (adminTeacherSelect) {
                adminTeacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>' + teachers.map(t => `<option value="${t.id}">${t.name || t.username}</option>`).join('');
            }
            const commonSubjects = ['English', 'Urdu', 'Math', 'Science', 'Social Studies', 'Islamiyat', 'Computer', 'G.K', 'Drawing'];
            if (adminSubjectList) {
                adminSubjectList.innerHTML = commonSubjects.map(s => `<option value="${s}">`).join('');
            }

            // New User Creation Logic
            const newUserRole = document.getElementById('newUserRole');
            const newUserClassSelect = document.getElementById('newUserClassSelect');
            // const newUserTeacherClasses = document.getElementById('newUserTeacherClasses'); // Removed
            const toggleTeacherClassesBtn = document.getElementById('toggleTeacherClassesBtn');
            const teacherClassesList = document.getElementById('teacherClassesList');

            const newUserTeacherClassesGroup = document.getElementById('newUserTeacherClassesGroup');
            const newUserSubjectsGroup = document.getElementById('newUserSubjectsGroup');
            const newUserClassGroup = document.getElementById('newUserClassGroup');
            const btnCreateUser = document.getElementById('btnCreateUser');
            const createUserMsg = document.getElementById('createUserMsg');

            if (newUserClassSelect) {
                newUserClassSelect.innerHTML = '<option value="">-- Select Class --</option>' + allClasses.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
            }

            // Populate checkboxes
            if (teacherClassesList) {
                teacherClassesList.innerHTML = allClasses.map(c =>
                    `<label style="display:block;margin-bottom:6px;cursor:pointer;">
                        <input type="checkbox" value="${c.id}" class="teacher-class-checkbox" style="width:auto;min-width:auto;margin-right:8px;"> ${c.name}
                     </label>`
                ).join('');
            }

            // Toggle logic
            if (toggleTeacherClassesBtn && teacherClassesList) {
                toggleTeacherClassesBtn.addEventListener('click', (e) => {
                    e.preventDefault(); // prevent form submit/refresh if inside form
                    const isHidden = teacherClassesList.style.display === 'none';
                    teacherClassesList.style.display = isHidden ? 'block' : 'none';
                    toggleTeacherClassesBtn.innerHTML = isHidden ? 'Hide Classes &#9652;' : 'Select Classes &#9662;';
                });
            }

            if (newUserRole) {
                newUserRole.addEventListener('change', () => {
                    const r = newUserRole.value;
                    if (r === 'student') {
                        if (newUserClassGroup) newUserClassGroup.style.display = 'flex';
                        if (newUserTeacherClassesGroup) newUserTeacherClassesGroup.style.display = 'none';
                        if (newUserSubjectsGroup) newUserSubjectsGroup.style.display = 'none';
                    } else {
                        if (newUserClassGroup) newUserClassGroup.style.display = 'none';
                        if (newUserTeacherClassesGroup) newUserTeacherClassesGroup.style.display = 'flex';
                        if (newUserSubjectsGroup) newUserSubjectsGroup.style.display = 'flex';
                    }
                });
            }

            if (btnCreateUser) {
                btnCreateUser.addEventListener('click', async () => {
                    createUserMsg.style.display = 'none';
                    const role = newUserRole.value;
                    const name = document.getElementById('newUserName').value.trim();
                    const username = document.getElementById('newUserUsername').value.trim();
                    let password = document.getElementById('newUserPassword').value;
                    const classId = newUserClassSelect ? newUserClassSelect.value : '';
                    const subjectsStr = document.getElementById('newUserSubjects').value;

                    // Collect assignments if teacher
                    let assignedClassIds = [];
                    if (role === 'teacher') {
                        const checkboxes = document.querySelectorAll('.teacher-class-checkbox:checked');
                        assignedClassIds = Array.from(checkboxes).map(cb => cb.value);
                    }

                    if (!name || !username || !password) {
                        createUserMsg.textContent = 'Please fill all required fields';
                        createUserMsg.style.color = '#c0392b';
                        createUserMsg.style.display = 'block';
                        return;
                    }

                    if (role === 'student' && !classId) {
                        createUserMsg.textContent = 'Please select a class for the student';
                        createUserMsg.style.color = '#c0392b';
                        createUserMsg.style.display = 'block';
                        return;
                    }

                    const hashed = await window.db.hashPassword(password);

                    const payload = {
                        role,
                        name,
                        username,
                        password: hashed,
                        classId: (role === 'student') ? classId : null,
                        subjects: (role === 'teacher') ? subjectsStr.split(',').map(s => s.trim()).filter(Boolean) : [],
                        assignedClassIds: (role === 'teacher') ? assignedClassIds : []
                    };

                    const res = window.db.adminCreateUser(payload);
                    if (res.success) {
                        createUserMsg.textContent = 'User created successfully!';
                        createUserMsg.style.color = '#2e7d32';
                        createUserMsg.style.display = 'block';

                        // Refresh stats
                        const allUsers = window.db.getAllUsers();
                        if (adminStudentsCount) adminStudentsCount.textContent = allUsers.filter(u => u.role === 'student').length;
                        if (adminTeachersCount) adminTeachersCount.textContent = allUsers.filter(u => u.role === 'teacher').length;

                        // Refresh teacher select if teacher added
                        if (role === 'teacher' && adminTeacherSelect) {
                            const updatedTeachers = allUsers.filter(u => u.role === 'teacher');
                            adminTeacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>' + updatedTeachers.map(t => `<option value="${t.id}">${t.name || t.username}</option>`).join('');
                        }

                        // Clear form
                        document.getElementById('newUserName').value = '';
                        document.getElementById('newUserUsername').value = '';
                        document.getElementById('newUserPassword').value = '';
                        document.getElementById('newUserSubjects').value = '';
                        if (newUserClassSelect) newUserClassSelect.value = '';

                        // Reset checkboxes
                        const allChecks = document.querySelectorAll('.teacher-class-checkbox');
                        allChecks.forEach(cb => cb.checked = false);
                        if (teacherClassesList) teacherClassesList.style.display = 'none';
                        if (toggleTeacherClassesBtn) toggleTeacherClassesBtn.innerHTML = 'Select Classes &#9662;';

                    } else {
                        createUserMsg.textContent = res.message || 'Failed to create user';
                        createUserMsg.style.color = '#c0392b';
                        createUserMsg.style.display = 'block';
                    }
                });
            }

            if (adminSaveTeacherAtt) {
                adminSaveTeacherAtt.addEventListener('click', () => {
                    const teacherId = adminTeacherSelect && adminTeacherSelect.value ? adminTeacherSelect.value : null;
                    const subjectVal = adminSubjectInput && adminSubjectInput.value ? adminSubjectInput.value.trim() : null;
                    const monthVal = adminMonthSelect && adminMonthSelect.value ? parseInt(adminMonthSelect.value) : null;
                    const dateVal = adminDateInput && adminDateInput.value ? adminDateInput.value : null;
                    const status = adminAttStatus && adminAttStatus.value ? adminAttStatus.value : null;
                    if (!teacherId) {
                        if (adminTeacherMsg) { adminTeacherMsg.textContent = 'Please select a teacher.'; adminTeacherMsg.style.color = '#c0392b'; adminTeacherMsg.style.display = 'block'; }
                        return;
                    }
                    if (!dateVal || !monthVal) {
                        if (adminTeacherMsg) { adminTeacherMsg.textContent = 'Please select month and day.'; adminTeacherMsg.style.color = '#c0392b'; adminTeacherMsg.style.display = 'block'; }
                        return;
                    }
                    const dt = new Date(dateVal);
                    if ((dt.getMonth() + 1) !== monthVal) {
                        if (adminTeacherMsg) { adminTeacherMsg.textContent = 'Selected day does not match selected month.'; adminTeacherMsg.style.color = '#c0392b'; adminTeacherMsg.style.display = 'block'; }
                        return;
                    }
                    // Save attendance for the teacher (optionally attach subject info via log)
                    window.db.markAttendanceBy(teacherId, dateVal, status || 'Present', session.id);
                    // Add a log entry
                    window.db.addLog({ type: 'attendance', action: status || 'Present', actorId: session.id, studentId: teacherId, date: dateVal, subject: subjectVal || '' });
                    if (adminTeacherMsg) { adminTeacherMsg.textContent = 'Teacher attendance saved.'; adminTeacherMsg.style.color = '#2e7d32'; adminTeacherMsg.style.display = 'block'; setTimeout(() => adminTeacherMsg.style.display = 'none', 2000); }
                });
            }
        }
    }

    // End of dashboard logic
});