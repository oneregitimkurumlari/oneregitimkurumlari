const ADMIN_USER = "oneregitim";
const ADMIN_PASS = "oneregitim123";
const GITHUB_REPO = "oneregitimkurumlari/oneregitimkurumlari";
const DATA_FILE = "data.json";
const DATA_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/master/data.json`;

let GITHUB_TOKEN = localStorage.getItem("github_token") || "";
let remoteData = { teachers: [], classes: [], students: [], homeworks: [], sha: "" };

const dayLabels = {
    pazartesi: "Pazartesi", sali: "Salı", carsamba: "Çarşamba",
    persembe: "Perşembe", cuma: "Cuma", cumartesi: "Cumartesi", pazar: "Pazar"
};

const courseTypes = {
    "Matematik": "math", "Fizik": "physics", "Biyoloji": "biology",
    "Kimya": "chemistry", "İngilizce": "english", "Tarih": "history",
    "Bilgisayar": "computer"
};

function getCourseType(branch) {
    for (const [key, val] of Object.entries(courseTypes)) {
        if (branch.toLowerCase().includes(key.toLowerCase())) return val;
    }
    return "math";
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
    return d.getDate() + " " + months[d.getMonth()] + " " + d.getFullYear();
}

function formatTime(start, end) { return start + " - " + end; }

function showToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:24px;right:24px;background:#10b981;color:white;padding:14px 24px;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

function showError(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:24px;right:24px;background:#ef4444;color:white;padding:14px 24px;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

function showConfirm(msg, callback) {
    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML = `
        <div style="background:white;padding:32px;border-radius:12px;max-width:400px;width:90%;text-align:center;">
            <p style="margin-bottom:20px;font-size:1rem;">${msg}</p>
            <div style="display:flex;gap:12px;justify-content:center;">
                <button id="confirmYes" style="padding:10px 24px;background:#ef4444;color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Evet</button>
                <button id="confirmNo" style="padding:10px 24px;background:#f1f5f9;color:#475569;border:1px solid #e2e8f0;border-radius:8px;font-weight:600;cursor:pointer;">İptal</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector("#confirmYes").onclick = () => { overlay.remove(); callback(); };
    overlay.querySelector("#confirmNo").onclick = () => overlay.remove();
}

async function fetchRemoteData() {
    try {
        if (GITHUB_TOKEN) {
            const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE}?t=${Date.now()}`, {
                headers: { "Authorization": "token " + GITHUB_TOKEN, "Cache-Control": "no-cache" }
            });
            if (!res.ok) throw new Error("Veri okunamadı");
            const meta = await res.json();
            remoteData.sha = meta.sha;
            const decoded = decodeURIComponent(escape(atob(meta.content)));
            const json = JSON.parse(decoded);
            remoteData.teachers = json.teachers || [];
            remoteData.classes = json.classes || [];
            remoteData.students = json.students || [];
            remoteData.homeworks = json.homeworks || [];
        } else {
            const res = await fetch(DATA_URL + "?t=" + Date.now());
            if (!res.ok) throw new Error("Veri okunamadı");
            const json = await res.json();
            remoteData.teachers = json.teachers || [];
            remoteData.classes = json.classes || [];
            remoteData.students = json.students || [];
            remoteData.homeworks = json.homeworks || [];
        }
        return true;
    } catch (e) {
        console.error("Uzak veri okuma hatası:", e);
        return false;
    }
}

async function saveRemoteData() {
    if (!GITHUB_TOKEN) {
        showError("GitHub Token tanımlanmamış! Ayarlar sekmesinden girin.");
        return false;
    }

    const metaRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE}?t=${Date.now()}`, {
        headers: { "Authorization": "token " + GITHUB_TOKEN, "Cache-Control": "no-cache" }
    });
    if (!metaRes.ok) {
        const err = await metaRes.json();
        showError("SHA alınamadı: " + (err.message || metaRes.status));
        return false;
    }
    const meta = await metaRes.json();
    remoteData.sha = meta.sha;

    const content = btoa(unescape(encodeURIComponent(JSON.stringify({
        teachers: remoteData.teachers,
        classes: remoteData.classes,
        students: remoteData.students,
        homeworks: remoteData.homeworks || []
    }, null, 2))));

    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${DATA_FILE}`, {
            method: "PUT",
            headers: {
                "Authorization": "token " + GITHUB_TOKEN,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "Yönetim paneli güncellendi - " + new Date().toISOString(),
                content: content,
                sha: remoteData.sha
            })
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || "HTTP " + res.status);
        }

        const result = await res.json();
        remoteData.sha = result.content.sha;
        return true;
    } catch (e) {
        console.error("Kayıt hatası:", e);
        showError("Kayıt başarısız: " + e.message);
        return false;
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("loginScreen");
    const adminPanel = document.getElementById("adminPanel");
    const loginForm = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");

    if (sessionStorage.getItem("adminLogged") === "true") {
        loginScreen.style.display = "none";
        adminPanel.classList.add("active");
        initPanel();
    }

    loginForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const u = document.getElementById("username").value.trim();
        const p = document.getElementById("password").value;
        if (u === ADMIN_USER && p === ADMIN_PASS) {
            sessionStorage.setItem("adminLogged", "true");
            loginScreen.style.display = "none";
            adminPanel.classList.add("active");
            initPanel();
        } else {
            errorMsg.textContent = "Kullanıcı adı veya şifre hatalı!";
        }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        sessionStorage.removeItem("adminLogged");
        location.reload();
    });

    async function initPanel() {
        const loading = document.createElement("div");
        loading.id = "loadingOverlay";
        loading.style.cssText = "position:fixed;inset:0;background:rgba(255,255,255,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:600;color:var(--primary);";
        loading.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:12px;font-size:2rem;"></i> Veriler yükleniyor...';
        document.body.appendChild(loading);

        const ok = await fetchRemoteData();
        loading.remove();

        if (!ok && !GITHUB_TOKEN) {
            document.getElementById("settingsPage").innerHTML = `
                <div style="background:white;padding:40px;border-radius:12px;box-shadow:var(--shadow);text-align:center;max-width:600px;margin:0 auto;">
                    <i class="fas fa-key" style="font-size:3rem;color:var(--warning);margin-bottom:16px;display:block;"></i>
                    <h3 style="margin-bottom:12px;">GitHub Token Gerekli</h3>
                    <p style="color:var(--text-medium);margin-bottom:20px;">Verilerin kaydedilmesi ve tüm cihazlardan görüntülenebilmesi için bir GitHub Personal Access Token gerekiyor.</p>
                    <ol style="text-align:left;max-width:400px;margin:0 auto 20px;color:var(--text-medium);line-height:2;">
                        <li><a href="https://github.com/settings/tokens" target="_blank">GitHub Token sayfasına</a> git</li>
                        <li><strong>"Generate new token (classic)"</strong> tıkla</li>
                        <li><strong>repo</strong> iznini işaretle</li>
                        <li>Oluşturulan tokenı aşağıya yapıştır</li>
                    </ol>
                    <div style="display:flex;gap:8px;max-width:400px;margin:0 auto;">
                        <input type="password" id="tokenInput" placeholder="GitHub Token" style="flex:1;padding:10px 14px;border:2px solid var(--border);border-radius:8px;font-size:0.9rem;">
                        <button onclick="saveToken()" style="padding:10px 20px;background:var(--primary);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Kaydet</button>
                    </div>
                </div>`;
            return;
        }

        if (ok && GITHUB_TOKEN) {
            const sp = document.getElementById("settingsPage");
            if (sp) {
                sp.innerHTML = `
                    <div style="background:white;padding:40px;border-radius:12px;box-shadow:var(--shadow);text-align:center;max-width:600px;margin:0 auto;">
                        <i class="fas fa-check-circle" style="font-size:3rem;color:#10b981;margin-bottom:16px;display:block;"></i>
                        <h3 style="margin-bottom:12px;">GitHub Bağlantısı Aktif</h3>
                        <p style="color:var(--text-medium);margin-bottom:20px;">Token kayıtlı ve çalışıyor. Veriler otomatik olarak GitHub'a kaydediliyor.</p>
                        <div style="display:flex;gap:8px;max-width:400px;margin:0 auto;">
                            <input type="password" id="tokenInput" value="${GITHUB_TOKEN}" style="flex:1;padding:10px 14px;border:2px solid #10b981;border-radius:8px;font-size:0.9rem;background:#f0fdf4;">
                            <button onclick="saveToken()" style="padding:10px 20px;background:var(--primary);color:white;border:none;border-radius:8px;font-weight:600;cursor:pointer;">Güncelle</button>
                        </div>
                    </div>`;
            }
        }

        renderTeachers();
        renderClasses();
        renderStudents();
        renderHomework();
        updateDashboard();
        initNavigation();
    }

    window.saveToken = function() {
        const token = document.getElementById("tokenInput").value.trim();
        if (!token) { showError("Token boş olamaz!"); return; }
        GITHUB_TOKEN = token;
        localStorage.setItem("github_token", token);
        showToast("Token kaydedildi! Sayfa yenileniyor...");
        setTimeout(() => location.reload(), 1500);
    };

    function initNavigation() {
        document.querySelectorAll(".sidebar-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const section = btn.dataset.section;
                document.querySelectorAll(".section-page").forEach(p => p.classList.remove("active"));
                document.getElementById(section + "Page").classList.add("active");
                document.getElementById("sectionTitle").textContent = btn.textContent.trim();
                document.querySelector(".sidebar").classList.remove("mobile-open");
            });
        });

        document.getElementById("menuToggle").addEventListener("click", () => {
            document.querySelector(".sidebar").classList.toggle("mobile-open");
        });

        let overlay = document.querySelector(".sidebar-overlay");
        if (!overlay) {
            overlay = document.createElement("div");
            overlay.className = "sidebar-overlay";
            document.body.appendChild(overlay);
        }
        overlay.addEventListener("click", () => {
            document.querySelector(".sidebar").classList.remove("mobile-open");
            overlay.classList.remove("active");
        });

        const sidebar = document.querySelector(".sidebar");
        const observer = new MutationObserver(() => {
            if (sidebar.classList.contains("mobile-open")) {
                overlay.classList.add("active");
            } else {
                overlay.classList.remove("active");
            }
        });
        observer.observe(sidebar, { attributes: true, attributeFilter: ["class"] });
    }

    function renderTeachers() {
        const tbody = document.getElementById("teacherTable");
        const empty = document.getElementById("emptyTeachers");
        const teachers = remoteData.teachers;

        if (teachers.length === 0) {
            tbody.innerHTML = "";
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        tbody.innerHTML = teachers.map((t, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${t.name} ${t.surname}</strong></td>
                <td>${t.username || "-"}</td>
                <td>${t.branch}</td>
                <td>${t.email || "-"}</td>
                <td>${t.password ? '<span style="color:#10b981;"><i class="fas fa-lock"></i> Kayıtlı</span>' : '<span style="color:var(--text-light);">-</span>'}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editTeacher('${t.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteTeacher('${t.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join("");
        updateTeacherSelect();
    }

    function updateTeacherSelect() {
        const select = document.getElementById("classTeacher");
        select.innerHTML = '<option value="">Öğretmen Seçin</option>' +
            remoteData.teachers.map(t => `<option value="${t.id}">${t.name} ${t.surname} (${t.branch})</option>`).join("");
    }

    document.getElementById("addTeacherBtn").addEventListener("click", () => {
        document.getElementById("teacherForm").style.display = "block";
        document.getElementById("teacherFormTitle").textContent = "Yeni Öğretmen Ekle";
        document.getElementById("teacherFormEl").reset();
        document.getElementById("editTeacherId").value = "";
        document.getElementById("teacherName").focus();
    });

    document.getElementById("cancelTeacherBtn").addEventListener("click", () => {
        document.getElementById("teacherForm").style.display = "none";
    });

    document.getElementById("teacherFormEl").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("editTeacherId").value;
        const password = document.getElementById("teacherPassword").value;

        if (!editId && password.length < 6) {
            showError("Şifre en az 6 karakter olmalıdır!");
            return;
        }

        const teacherData = {
            name: document.getElementById("teacherName").value.trim(),
            surname: document.getElementById("teacherSurname").value.trim(),
            username: document.getElementById("teacherUsername").value.trim(),
            branch: document.getElementById("teacherBranch").value.trim(),
            email: document.getElementById("teacherEmail").value.trim()
        };

        if (!editId || password.length > 0) {
            teacherData.password = password;
        }

        if (editId) {
            const idx = remoteData.teachers.findIndex(t => t.id === editId);
            if (idx !== -1) remoteData.teachers[idx] = { ...remoteData.teachers[idx], ...teacherData };
        } else {
            teacherData.id = generateId();
            remoteData.teachers.push(teacherData);
        }

        const ok = await saveRemoteData();
        if (ok) {
            showToast(editId ? "Öğretmen güncellendi!" : "Öğretmen eklendi!");
            renderTeachers();
            updateDashboard();
            document.getElementById("teacherForm").style.display = "none";
        }
    });

    window.editTeacher = function(id) {
        const t = remoteData.teachers.find(x => x.id === id);
        if (!t) return;
        document.getElementById("teacherForm").style.display = "block";
        document.getElementById("teacherFormTitle").textContent = "Öğretmeni Düzenle";
        document.getElementById("editTeacherId").value = t.id;
        document.getElementById("teacherName").value = t.name;
        document.getElementById("teacherSurname").value = t.surname;
        document.getElementById("teacherUsername").value = t.username || "";
        const pwField = document.getElementById("teacherPassword");
        if (t.password) {
            pwField.placeholder = "•••••• (Şifre kayıtlı, değiştirmek için yazın)";
            pwField.required = false;
        } else {
            pwField.placeholder = "En az 6 karakter";
            pwField.required = true;
        }
        pwField.value = "";
        document.getElementById("teacherBranch").value = t.branch;
        document.getElementById("teacherEmail").value = t.email || "";
    };

    window.deleteTeacher = function(id) {
        showConfirm("Bu öğretmeni silmek istediğinize emin misiniz?", async () => {
            remoteData.teachers = remoteData.teachers.filter(t => t.id !== id);
            const ok = await saveRemoteData();
            if (ok) {
                renderTeachers();
                updateDashboard();
                showToast("Öğretmen silindi!");
            }
        });
    };

    function renderClasses() {
        const tbody = document.getElementById("classTable");
        const empty = document.getElementById("emptyClasses");
        let classes = [...remoteData.classes];

        const filterDay = document.getElementById("filterDay").value;
        const searchTerm = document.getElementById("searchClass").value.toLowerCase();

        if (filterDay !== "tum") classes = classes.filter(c => c.day === filterDay);
        if (searchTerm) classes = classes.filter(c =>
            c.title.toLowerCase().includes(searchTerm) ||
            (c.description || "").toLowerCase().includes(searchTerm)
        );

        if (classes.length === 0) {
            tbody.innerHTML = "";
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        classes.sort((a, b) => {
            const days = ["pazartesi","sali","carsamba","persembe","cuma","cumartesi","pazar"];
            return days.indexOf(a.day) - days.indexOf(b.day);
        });

        tbody.innerHTML = classes.map((c, i) => {
            const teacher = remoteData.teachers.find(t => t.id === c.teacherId);
            const teacherName = teacher ? teacher.name + " " + teacher.surname : "Bilinmiyor";
            return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${c.title}</strong><br><small style="color:var(--text-light);">${c.description || ""}</small></td>
                <td>${teacherName}</td>
                <td>${dayLabels[c.day] || c.day}</td>
                <td>${formatDate(c.date)}</td>
                <td>${formatTime(c.startTime, c.endTime)}</td>
                <td><a href="${c.meetLink}" target="_blank" class="meet-link">${c.meetLink}</a></td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editClass('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteClass('${c.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join("");
    }

    document.getElementById("addClassBtn").addEventListener("click", () => {
        document.getElementById("classForm").style.display = "block";
        document.getElementById("classFormTitle").textContent = "Yeni Canlı Ders Ekle";
        document.getElementById("classFormEl").reset();
        document.getElementById("editClassId").value = "";
        updateTeacherSelect();
        document.getElementById("className").focus();
    });

    document.getElementById("cancelClassBtn").addEventListener("click", () => {
        document.getElementById("classForm").style.display = "none";
    });

    document.getElementById("classFormEl").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("editClassId").value;
        const day = document.getElementById("classDay").value;

        const classData = {
            title: document.getElementById("className").value.trim(),
            teacherId: document.getElementById("classTeacher").value,
            day: day,
            dayLabel: dayLabels[day],
            date: document.getElementById("classDate").value,
            startTime: document.getElementById("classStartTime").value,
            endTime: document.getElementById("classEndTime").value,
            meetLink: document.getElementById("classMeetLink").value.trim(),
            classroom: document.getElementById("classRoom").value.trim() || "-",
            description: document.getElementById("classDesc").value.trim(),
            capacity: parseInt(document.getElementById("classCapacity").value) || 25,
            type: "Canlı Ders",
            status: "upcoming"
        };

        const teacher = remoteData.teachers.find(t => t.id === classData.teacherId);
        classData.courseType = teacher ? getCourseType(teacher.branch) : "math";

        if (editId) {
            const idx = remoteData.classes.findIndex(c => c.id === editId);
            if (idx !== -1) remoteData.classes[idx] = { ...remoteData.classes[idx], ...classData };
        } else {
            classData.id = generateId();
            remoteData.classes.push(classData);
        }

        const ok = await saveRemoteData();
        if (ok) {
            showToast(editId ? "Ders güncellendi!" : "Ders eklendi!");
            renderClasses();
            updateDashboard();
            document.getElementById("classForm").style.display = "none";
        }
    });

    window.editClass = function(id) {
        const c = remoteData.classes.find(x => x.id === id);
        if (!c) return;
        updateTeacherSelect();
        document.getElementById("classForm").style.display = "block";
        document.getElementById("classFormTitle").textContent = "Dersi Düzenle";
        document.getElementById("editClassId").value = c.id;
        document.getElementById("className").value = c.title;
        document.getElementById("classTeacher").value = c.teacherId || "";
        document.getElementById("classDay").value = c.day;
        document.getElementById("classDate").value = c.date || "";
        document.getElementById("classStartTime").value = c.startTime;
        document.getElementById("classEndTime").value = c.endTime;
        document.getElementById("classMeetLink").value = c.meetLink;
        document.getElementById("classRoom").value = c.classroom || "";
        document.getElementById("classDesc").value = c.description || "";
        document.getElementById("classCapacity").value = c.capacity || "";
    };

    window.deleteClass = function(id) {
        showConfirm("Bu dersi silmek istediğinize emin misiniz?", async () => {
            remoteData.classes = remoteData.classes.filter(c => c.id !== id);
            const ok = await saveRemoteData();
            if (ok) {
                renderClasses();
                updateDashboard();
                showToast("Ders silindi!");
            }
        });
    };

    document.getElementById("filterDay").addEventListener("change", () => renderClasses());
    document.getElementById("searchClass").addEventListener("input", () => renderClasses());

    function renderStudents() {
        const tbody = document.getElementById("studentTable");
        const empty = document.getElementById("emptyStudents");
        const students = remoteData.students || [];

        if (students.length === 0) {
            tbody.innerHTML = "";
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        tbody.innerHTML = students.map((s, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${s.username}</strong></td>
                <td>${s.name} ${s.surname}</td>
                <td>${s.studentClass || "-"}</td>
                <td>${s.email || "-"}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editStudent('${s.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteStudent('${s.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("addStudentBtn").addEventListener("click", () => {
        document.getElementById("studentForm").style.display = "block";
        document.getElementById("studentFormTitle").textContent = "Yeni Öğrenci Ekle";
        document.getElementById("studentFormEl").reset();
        document.getElementById("editStudentId").value = "";
        document.getElementById("studentUsername").focus();
    });

    document.getElementById("cancelStudentBtn").addEventListener("click", () => {
        document.getElementById("studentForm").style.display = "none";
    });

    document.getElementById("studentFormEl").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("editStudentId").value;
        const username = document.getElementById("studentUsername").value.trim();
        const password = document.getElementById("studentPassword").value;

        if (!editId && password.length < 6) {
            showError("Şifre en az 6 karakter olmalıdır!");
            return;
        }

        const studentData = {
            username: username,
            name: document.getElementById("studentName").value.trim(),
            surname: document.getElementById("studentSurname").value.trim(),
            studentClass: document.getElementById("studentClass").value.trim(),
            email: document.getElementById("studentEmail").value.trim()
        };

        if (!editId || password.length > 0) {
            studentData.password = password;
        }

        if (editId) {
            const idx = (remoteData.students || []).findIndex(s => s.id === editId);
            if (idx !== -1) remoteData.students[idx] = { ...remoteData.students[idx], ...studentData };
        } else {
            studentData.id = generateId();
            if (!remoteData.students) remoteData.students = [];
            remoteData.students.push(studentData);
        }

        const ok = await saveRemoteData();
        if (ok) {
            showToast(editId ? "Öğrenci güncellendi!" : "Öğrenci eklendi!");
            renderStudents();
            updateDashboard();
            document.getElementById("studentForm").style.display = "none";
        }
    });

    window.editStudent = function(id) {
        const s = (remoteData.students || []).find(x => x.id === id);
        if (!s) return;
        document.getElementById("studentForm").style.display = "block";
        document.getElementById("studentFormTitle").textContent = "Öğrenciyi Düzenle";
        document.getElementById("editStudentId").value = s.id;
        document.getElementById("studentUsername").value = s.username;
        document.getElementById("studentPassword").value = "";
        document.getElementById("studentName").value = s.name;
        document.getElementById("studentSurname").value = s.surname;
        document.getElementById("studentClass").value = s.studentClass || "";
        document.getElementById("studentEmail").value = s.email || "";
    };

    window.deleteStudent = function(id) {
        showConfirm("Bu öğrenciyi silmek istediğinize emin misiniz?", async () => {
            remoteData.students = (remoteData.students || []).filter(s => s.id !== id);
            const ok = await saveRemoteData();
            if (ok) {
                renderStudents();
                updateDashboard();
                showToast("Öğrenci silindi!");
            }
        });
    };

    function renderHomework() {
        const tbody = document.getElementById("homeworkTable");
        const empty = document.getElementById("emptyHomework");
        const homeworks = remoteData.homeworks || [];

        if (homeworks.length === 0) {
            tbody.innerHTML = "";
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        tbody.innerHTML = homeworks.map((h, i) => {
            const teacher = remoteData.teachers.find(t => t.id === h.teacherId);
            const teacherName = teacher ? teacher.name + " " + teacher.surname : "Yönetim";
            const fileIcon = h.fileType === "pdf" ? "fa-file-pdf" : h.fileType === "word" ? "fa-file-word" : h.fileType === "excel" ? "fa-file-excel" : "fa-file";
            const fileLink = h.fileUrl ? `<a href="${h.fileUrl}" target="_blank" style="color:var(--primary);"><i class="fas ${fileIcon}"></i> ${h.fileName || "Dosya"}</a>` : `<span style="color:var(--text-light);">-</span>`;
            return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${h.title}</strong></td>
                <td>${h.subject}</td>
                <td>${teacherName}</td>
                <td>${fileLink}</td>
                <td>${formatDate(h.createdAt)}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editHomework('${h.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteHomework('${h.id}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join("");
    }

    document.getElementById("addHomeworkBtn").addEventListener("click", () => {
        document.getElementById("homeworkForm").style.display = "block";
        document.getElementById("homeworkFormTitle").textContent = "Yeni Ödev Ekle";
        document.getElementById("homeworkFormEl").reset();
        document.getElementById("editHomeworkId").value = "";
        document.getElementById("homeworkTitle").focus();
    });

    document.getElementById("cancelHomeworkBtn").addEventListener("click", () => {
        document.getElementById("homeworkForm").style.display = "none";
    });

    document.getElementById("homeworkFormEl").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("editHomeworkId").value;
        const fileInput = document.getElementById("homeworkFile");
        const file = fileInput.files[0];

        let fileData = {};
        if (file) {
            const ext = file.name.split(".").pop().toLowerCase();
            const fileType = ext === "pdf" ? "pdf" : ["doc","docx"].includes(ext) ? "word" : ["xls","xlsx"].includes(ext) ? "excel" : "other";
            fileData = { fileName: file.name, fileType: fileType };

            const loading = document.createElement("div");
            loading.style.cssText = "position:fixed;inset:0;background:rgba(255,255,255,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:1.1rem;";
            loading.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:12px;"></i> Dosya yükleniyor...';
            document.body.appendChild(loading);

            try {
                const fileContent = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result.split(",")[1]);
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });

                const filePath = "uploads/" + Date.now() + "_" + file.name;
                const uploadRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`, {
                    method: "PUT",
                    headers: {
                        "Authorization": "token " + GITHUB_TOKEN,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        message: "Ödev dosyası yüklendi: " + file.name,
                        content: fileContent
                    })
                });

                if (uploadRes.ok) {
                    const uploadData = await uploadRes.json();
                    fileData.fileUrl = uploadData.content.html_url;
                    fileData.filePath = filePath;
                } else {
                    const err = await uploadRes.json();
                    console.error("Dosya yükleme hatası:", err);
                }
            } catch (err) {
                console.error("Dosya okuma hatası:", err);
            }
            loading.remove();
        }

        const homeworkData = {
            title: document.getElementById("homeworkTitle").value.trim(),
            subject: document.getElementById("homeworkSubject").value.trim(),
            description: document.getElementById("homeworkDesc").value.trim(),
            fileUrl: document.getElementById("homeworkFileUrl").value.trim() || fileData.fileUrl || "",
            ...fileData,
            teacherId: ""
        };

        if (editId) {
            const idx = (remoteData.homeworks || []).findIndex(h => h.id === editId);
            if (idx !== -1) remoteData.homeworks[idx] = { ...remoteData.homeworks[idx], ...homeworkData };
        } else {
            homeworkData.id = generateId();
            homeworkData.createdAt = new Date().toISOString().split("T")[0];
            if (!remoteData.homeworks) remoteData.homeworks = [];
            remoteData.homeworks.push(homeworkData);
        }

        const ok = await saveRemoteData();
        if (ok) {
            showToast(editId ? "Ödev güncellendi!" : "Ödev eklendi!");
            renderHomework();
            document.getElementById("homeworkForm").style.display = "none";
        }
    });

    window.editHomework = function(id) {
        const h = (remoteData.homeworks || []).find(x => x.id === id);
        if (!h) return;
        document.getElementById("homeworkForm").style.display = "block";
        document.getElementById("homeworkFormTitle").textContent = "Ödevi Düzenle";
        document.getElementById("editHomeworkId").value = h.id;
        document.getElementById("homeworkTitle").value = h.title;
        document.getElementById("homeworkSubject").value = h.subject;
        document.getElementById("homeworkDesc").value = h.description || "";
        document.getElementById("homeworkFileUrl").value = h.fileUrl || "";
    };

    window.deleteHomework = function(id) {
        showConfirm("Bu ödevi silmek istediğinize emin misiniz?", async () => {
            remoteData.homeworks = (remoteData.homeworks || []).filter(h => h.id !== id);
            const ok = await saveRemoteData();
            if (ok) {
                renderHomework();
                showToast("Ödev silindi!");
            }
        });
    };

    function updateDashboard() {
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("teacherCount").textContent = remoteData.teachers.length;
        document.getElementById("classCount").textContent = remoteData.classes.length;
        document.getElementById("todayCount").textContent = remoteData.classes.filter(c => c.date === today).length;
        document.getElementById("studentCount").textContent = (remoteData.students || []).length;

        const recent = document.getElementById("recentClasses");
        const lastClasses = remoteData.classes.slice(-5).reverse();

        if (lastClasses.length === 0) {
            recent.innerHTML = '<p style="color:var(--text-light);padding:20px 0;">Henüz ders eklenmemiş</p>';
            return;
        }

        recent.innerHTML = lastClasses.map(c => {
            const teacher = remoteData.teachers.find(t => t.id === c.teacherId);
            const name = teacher ? teacher.name + " " + teacher.surname : "Bilinmiyor";
            return `
            <div class="recent-item">
                <div class="recent-item-info">
                    <h4>${c.title}</h4>
                    <p>${name} | ${dayLabels[c.day]} ${formatTime(c.startTime, c.endTime)}</p>
                </div>
                <span class="recent-item-badge">${formatDate(c.date)}</span>
            </div>`;
        }).join("");
    }

    document.getElementById("exportDataBtn").addEventListener("click", () => {
        const data = { teachers: remoteData.teachers, classes: remoteData.classes, students: remoteData.students || [], homeworks: remoteData.homeworks || [], exportDate: new Date().toISOString() };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = "oner-egitim-verileri.json"; a.click();
        URL.revokeObjectURL(url);
        showToast("Veriler dışa aktarıldı!");
    });

    document.getElementById("clearDataBtn").addEventListener("click", () => {
        showConfirm("Tüm öğretmen ve ders verileri silinecek! Emin misiniz?", async () => {
            remoteData.teachers = [];
            remoteData.classes = [];
            remoteData.students = [];
            remoteData.homeworks = [];
            const ok = await saveRemoteData();
            if (ok) {
                renderTeachers();
                renderClasses();
                renderStudents();
                renderHomework();
                updateDashboard();
                showToast("Tüm veriler temizlendi!");
            }
        });
    });

    document.getElementById("tokenSaveBtn")?.addEventListener("click", () => {
        const token = document.getElementById("tokenInput").value.trim();
        if (!token) { showError("Token boş olamaz!"); return; }
        GITHUB_TOKEN = token;
        localStorage.setItem("github_token", token);
        showToast("Token kaydedildi! Sayfa yenileniyor...");
        setTimeout(() => location.reload(), 1500);
    });
});
