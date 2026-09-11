const ADMIN_USER = "oneregitim";
const ADMIN_PASS = "oneregitim123";
const FIREBASE_URL = "https://one-egitim-default-rtdb.firebaseio.com";
const DATA_URL = FIREBASE_URL + "/.json";

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function jsEsc(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

let remoteData = { teachers: [], classes: [], students: [], homeworks: [], exams: [], optik: null };
let deletedIds = { teachers: new Set(), classes: new Set(), students: new Set(), homeworks: new Set(), exams: new Set() };

function normalizeClassRecordings(c) {
    if (!c) return c;
    if (!Array.isArray(c.recordings)) {
        c.recordings = [];
        if (c.recordingUrl) {
            c.recordings.push({ id: generateId(), title: "Kayıt", url: c.recordingUrl, createdAt: new Date().toISOString() });
        }
    }
    return c;
}

function fetchWithTimeout(url, options = {}, timeoutMs = 20000) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function showSaveOverlay() {
    const o = document.createElement("div");
    o.id = "saveOverlay";
    o.style.cssText = "position:fixed;inset:0;background:rgba(255,255,255,0.85);z-index:10000;display:flex;align-items:center;justify-content:center;font-size:1.1rem;font-weight:600;color:#2563eb;flex-direction:column;gap:12px;";
    o.innerHTML = '<i class="fas fa-cloud-upload-alt fa-spin" style="font-size:2rem;"></i> GitHub\'a kaydediliyor...';
    document.body.appendChild(o);
}

function hideSaveOverlay() {
    const o = document.getElementById("saveOverlay");
    if (o) o.remove();
}

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

function classEndPassed(c) {
    const dowMap = { pazartesi: 1, sali: 2, carsamba: 3, persembe: 4, cuma: 5, cumartesi: 6, pazar: 0 };
    const d = dowMap[c.day];
    if (d === undefined) return false;
    const now = new Date();
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((now.getDay() || 7) - 1));
    const dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + ((d === 0 ? 7 : d) - 1));
    const eh = (c.endTime || "23:59").split(":").map(Number);
    const end = new Date(dayStart);
    end.setHours(eh[0] || 23, eh[1] || 59, 0, 0);
    return now.getTime() > end.getTime();
}

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
        const res = await fetchWithTimeout(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("Veri okunamadı");
        const json = await res.json();
        remoteData.teachers = json.teachers || [];
        remoteData.classes = (json.classes || []).map(normalizeClassRecordings);
        remoteData.students = json.students || [];
        remoteData.homeworks = json.homeworks || [];
        remoteData.exams = json.exams || [];
        remoteData.optik = json.optik || null;
        deletedIds = { teachers: new Set(), classes: new Set(), students: new Set(), homeworks: new Set(), exams: new Set() };
        return true;
    } catch (e) {
        console.error("Uzak veri okuma hatası:", e);
        return false;
    }
}

async function saveRemoteData() {
    showSaveOverlay();

    try {
        const metaRes = await fetchWithTimeout(FIREBASE_URL + "/.json", { cache: "no-store" });
        const serverData = metaRes.ok ? await metaRes.json() : {};

        function mergeArrays(serverArr, localArr, delSet) {
            const merged = new Map();
            for (const item of (serverArr || [])) {
                if (!delSet.has(item.id)) merged.set(item.id, item);
            }
            for (const item of (localArr || [])) merged.set(item.id, item);
            return Array.from(merged.values());
        }

        remoteData.teachers = mergeArrays(serverData.teachers, remoteData.teachers, deletedIds.teachers);
        remoteData.classes = mergeArrays(serverData.classes, remoteData.classes, deletedIds.classes);
        remoteData.students = mergeArrays(serverData.students, remoteData.students, deletedIds.students);
        remoteData.homeworks = mergeArrays(serverData.homeworks, remoteData.homeworks || [], deletedIds.homeworks);
        remoteData.exams = mergeArrays(serverData.exams, remoteData.exams || [], deletedIds.exams);
        remoteData.optik = serverData.optik !== undefined ? serverData.optik : (remoteData.optik || null);

        const payload = {
            teachers: remoteData.teachers,
            classes: remoteData.classes,
            students: remoteData.students,
            homeworks: remoteData.homeworks,
            exams: remoteData.exams,
            optik: remoteData.optik
        };

        const res = await fetchWithTimeout(FIREBASE_URL + "/.json", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        }, 30000);

        if (!res.ok) {
            showError("Kayit basarisiz: HTTP " + res.status);
            return false;
        }

        deletedIds = { teachers: new Set(), classes: new Set(), students: new Set(), homeworks: new Set(), exams: new Set() };
        return true;
    } catch (e) {
        console.error("Kayit hatasi:", e);
        const msg = e.name === "AbortError"
            ? "Kayit basarisiz: Istek zaman asimina ugradi (ag cok yavas)"
            : "Kayit basarisiz: " + e.message;
        showError(msg);
        return false;
    } finally {
        hideSaveOverlay();
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

        if (ok) {
            const sp = document.getElementById("settingsPage");
            if (sp) {
                sp.innerHTML = `
                    <div style="background:white;padding:40px;border-radius:12px;box-shadow:var(--shadow);text-align:center;max-width:600px;margin:0 auto;">
                        <i class="fas fa-check-circle" style="font-size:3rem;color:#10b981;margin-bottom:16px;display:block;"></i>
                        <h3 style="margin-bottom:12px;">Veritabanı Bağlantısı Aktif</h3>
                        <p style="color:var(--text-medium);">Veriler Firebase üzerinden senkronize ediliyor. Ders ve kayıt ekleme/silme tüm cihazlarda otomatik olarak güncellenir.</p>
                    </div>`;
            }
        }

        renderTeachers();
        renderClasses();
        renderStudents();
        renderHomework();
        renderExams();
        renderOptik();
        updateDashboard();
        initNavigation();
        setInterval(() => { renderClasses(); updateDashboard(); }, 30000);
    }

    window.saveToken = function() {
        showToast("Veriler Firebase üzerinden otomatik senkronize ediliyor, token gerekmez.");
        const ti = document.getElementById("tokenInput");
        if (ti) ti.value = "";
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
                <td><strong>${esc(t.name)} ${esc(t.surname)}</strong></td>
                <td>${esc(t.username || "-")}</td>
                <td>${esc(t.branch)}</td>
                <td>${esc(t.email || "-")}</td>
                <td>${t.password ? '<span style="color:#10b981;"><i class="fas fa-lock"></i> Kayıtlı</span>' : '<span style="color:var(--text-light);">-</span>'}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editTeacher('${jsEsc(t.id)}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteTeacher('${jsEsc(t.id)}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join("");
        updateTeacherSelect();
    }

    function updateTeacherSelect() {
        const select = document.getElementById("classTeacher");
        select.innerHTML = '<option value="">Öğretmen Seçin</option>' +
            remoteData.teachers.map(t => `<option value="${esc(t.id)}">${esc(t.name)} ${esc(t.surname)} (${esc(t.branch)})</option>`).join("");
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
            showError("Sifre en az 6 karakter olmalidir!");
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

        try {
            const ok = await saveRemoteData();
            if (ok) {
                showToast(editId ? "Ogretmen guncellendi!" : "Ogretmen eklendi!");
                renderTeachers();
                updateDashboard();
                document.getElementById("teacherForm").style.display = "none";
            }
        } catch (err) {
            console.error("Ogretmen kayit hatasi:", err);
            showError("Kayit hatasi: " + err.message);
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
            deletedIds.teachers.add(id);
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
        let classes = remoteData.classes.filter(c => !classEndPassed(c));

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
            const recs = c.recordings || [];
            return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${esc(c.title)}</strong><br><small style="color:var(--text-light);">${esc(c.description || "")}</small></td>
                <td>${esc(teacherName)}</td>
                <td>${esc(dayLabels[c.day] || c.day)}</td>
                <td>${formatDate(c.date)}</td>
                <td>${formatTime(c.startTime, c.endTime)}</td>
                <td>${c.meetLink ? '<a href="' + esc(c.meetLink) + '" target="_blank" class="meet-link">' + esc(c.meetLink) + '</a>' : '<span style="color:var(--text-light);font-size:0.8rem;">—</span>'}</td>
                <td><button class="btn-rec" onclick="openRecordModal('${jsEsc(c.id)}')"><i class="fas fa-video"></i> Kayıtlar<span class="rec-count">${recs.length}</span></button></td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editClass('${jsEsc(c.id)}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteClass('${jsEsc(c.id)}')"><i class="fas fa-trash"></i></button>
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
            deletedIds.classes.add(id);
            const ok = await saveRemoteData();
            if (ok) {
                renderClasses();
                updateDashboard();
                showToast("Ders silindi!");
            }
        });
    };

    let currentRecordClassId = null;
    window.openRecordModal = function(classId) {
        const c = remoteData.classes.find(x => x.id === classId);
        if (!c) return;
        currentRecordClassId = classId;
        document.getElementById("recordClassLabel").textContent = "Ders: " + c.title;
        renderRecordList();
        document.getElementById("recordModal").style.display = "flex";
    };

    window.closeRecordModal = function() {
        document.getElementById("recordModal").style.display = "none";
        currentRecordClassId = null;
    };

    function renderRecordList() {
        const c = remoteData.classes.find(x => x.id === currentRecordClassId);
        const list = document.getElementById("recordList");
        if (!c || !c.recordings || c.recordings.length === 0) {
            list.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;margin:0;">Henüz kayıt eklenmemiş.</p>';
            return;
        }
        list.innerHTML = c.recordings.map(r => `
            <div class="record-item">
                <div class="rec-info">
                    <span class="rec-title">${esc(r.title || "Kayıt")}</span>
                    <a class="rec-link" href="${esc(r.url)}" target="_blank">${esc(r.url)}</a>
                </div>
                <div class="rec-btns">
                    <button class="btn-edit" onclick="recordModalEdit('${jsEsc(r.id)}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="recordModalDelete('${jsEsc(r.id)}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>`).join("");
    }

    window.recordModalAdd = async function() {
        const title = document.getElementById("recTitleInput").value.trim();
        const url = document.getElementById("recLinkInput").value.trim();
        if (!url) { showToast("Video linki gerekli!"); return; }
        const c = remoteData.classes.find(x => x.id === currentRecordClassId);
        if (!c) return;
        if (!c.recordings) c.recordings = [];
        c.recordings.push({ id: generateId(), title: title || "Kayıt", url, createdAt: new Date().toISOString() });
        c.recordingUrl = url;
        const ok = await saveRemoteData();
        if (ok) {
            showToast("Kayıt eklendi!");
            document.getElementById("recTitleInput").value = "";
            document.getElementById("recLinkInput").value = "";
            renderRecordList();
            renderClasses();
        }
    };

    window.recordModalEdit = async function(recId) {
        const c = remoteData.classes.find(x => x.id === currentRecordClassId);
        if (!c) return;
        const r = (c.recordings || []).find(x => x.id === recId);
        if (!r) return;
        const title = prompt("Kayıt başlığını düzenle:", r.title || "");
        if (title === null) return;
        const url = prompt("Kayıt linkini düzenle:", r.url || "");
        if (url === null) return;
        r.title = title.trim() || r.title;
        r.url = url.trim() || r.url;
        c.recordingUrl = r.url;
        const ok = await saveRemoteData();
        if (ok) { showToast("Kayıt güncellendi!"); renderRecordList(); renderClasses(); }
    };

    window.recordModalDelete = async function(recId) {
        const c = remoteData.classes.find(x => x.id === currentRecordClassId);
        if (!c) return;
        showConfirm("Bu kaydı silmek istediğinize emin misiniz?", async () => {
            c.recordings = (c.recordings || []).filter(x => x.id !== recId);
            c.recordingUrl = (c.recordings && c.recordings.length) ? c.recordings[c.recordings.length - 1].url : "";
            const ok = await saveRemoteData();
            if (ok) { showToast("Kayıt silindi!"); renderRecordList(); renderClasses(); }
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
                <td><strong>${esc(s.username)}</strong></td>
                <td>${esc(s.name)} ${esc(s.surname)}</td>
                <td>${esc(s.studentClass || "-")}</td>
                <td>${esc(s.email || "-")}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editStudent('${jsEsc(s.id)}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteStudent('${jsEsc(s.id)}')"><i class="fas fa-trash"></i></button>
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
            email: document.getElementById("studentEmail").value.trim(),
            no: document.getElementById("studentNo").value.trim(),
            tcno: document.getElementById("studentTcno").value.trim()
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
        document.getElementById("studentNo").value = s.no || "";
        document.getElementById("studentTcno").value = s.tcno || "";
    };

    window.deleteStudent = function(id) {
        showConfirm("Bu öğrenciyi silmek istediğinize emin misiniz?", async () => {
            remoteData.students = (remoteData.students || []).filter(s => s.id !== id);
            deletedIds.students.add(id);
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
            const fileLink = h.fileUrl ? `<a href="${esc(h.fileUrl)}" target="_blank" style="color:var(--primary);"><i class="fas ${fileIcon}"></i> ${esc(h.fileName || "Dosya")}</a>` : `<span style="color:var(--text-light);">-</span>`;
            return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${esc(h.title)}</strong></td>
                <td>${esc(h.subject)}</td>
                <td>${esc(teacherName)}</td>
                <td>${fileLink}</td>
                <td>${formatDate(h.createdAt)}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editHomework('${jsEsc(h.id)}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteHomework('${jsEsc(h.id)}')"><i class="fas fa-trash"></i></button>
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

                fileData.fileContent = fileContent;
                fileData.fileName = file.name;
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
            deletedIds.homeworks.add(id);
            const ok = await saveRemoteData();
            if (ok) {
                renderHomework();
                showToast("Ödev silindi!");
            }
        });
    };

    /* ============ Sınav Yönetimi (Admin) ============ */
    const GEMINI_KEY = atob("QVEuQWI4Uk42S3JsTTZCcWlVczF3S2NmUVUxMXAzZ0xsdVVKY3NZZ3lZOG9xRFJ0bjJjUlE=");

    document.getElementById("pdfImportBtn").addEventListener("click", () => {
        document.getElementById("pdfInput").click();
    });

    document.getElementById("pdfInput").addEventListener("change", async (e) => {
        const file = e.target.files && e.target.files[0];
        e.target.value = "";
        if (!file) return;
        if (file.type !== "application/pdf") { showError("Lütfen bir PDF dosyası seçin."); return; }
        if (file.size > 25 * 1024 * 1024) { showError("PDF 25 MB'tan küçük olmalı."); return; }

        const status = document.getElementById("pdfStatus");
        const btn = document.getElementById("pdfImportBtn");
        btn.disabled = true;
        status.textContent = "PDF okunuyor, sorular çıkarılıyor...";

        try {
            const dataUrl = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => resolve(r.result);
                r.onerror = () => reject(new Error("Dosya okunamadı"));
                r.readAsDataURL(file);
            });
            const base64 = dataUrl.split(",")[1];
            if (window.pdfjsLib) window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/legacy/build/pdf.worker.min.js";

            const payload = {
                systemInstruction: { parts: [{ text: "Sen bir sınav soru çıkarıcısısın. PDF'teki test sorularını 4 şıklı (A,B,C,D) çoktan seçmeli sorulara çevirirsin. PDF'te şıklar yoksa kendin 4 makul şık üretirsin. DOĞRU CEVABI ASLA BELİRLEMEZ VE YAZMAZSIN; cevaplar öğretmen tarafından elle girilir. Çıktı yalnızca JSON dizisidir, başka hiçbir şey yazmazsın. HER SORU için sorunun PDF'teki tam konumu (page ve bbox) JSON'a eklenir; soruyu asla yeniden üretme, sadece konumunu bildir." }] },
                contents: [{ parts: [
                    { inline_data: { mime_type: "application/pdf", data: base64 } },
                    { text: "Bu PDF'teki her soruyu şu formatta JSON dizisi olarak döndür: [{\"text\":\"soru metni\",\"options\":[\"A şıkkı\",\"B şıkkı\",\"C şıkkı\",\"D şıkkı\"]}] - answer alanı ekleme. HER soru için ZORUNLU olarak \"page\": <sayfa no, 1'den başlar> ve \"bbox\": {\"x\":0,\"y\":0,\"w\":200,\"h\":100} alanlarını ekle. bbox, TÜM soruyu (soru metni + varsa görsel/şekil/grafik/tablo + varsa yazılı şıklar) PDF nokta biriminde (72 DPI, sol üst köşe 0,0) sıkı ve TAM çevreleyen kutu olmalı. bbox'ı asla atlama, hiçbir soruyu atlama." }
                ] }],
                generationConfig: { temperature: 0.1, maxOutputTokens: 65536 }
            };

            const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" + GEMINI_KEY, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error("AI servis hatası (" + res.status + ")");
            const j = await res.json();
            const text = ((j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text).join("");
            const m = text.match(/\[[\s\S]*\]/);
            const list = JSON.parse(m ? m[0] : text);
            if (!Array.isArray(list) || list.length === 0) throw new Error("Soru bulunamadı");

            const questions = [];
            const cap = Math.min(list.length, 150);
            let pdfDoc = null;
            try {
                if (window.pdfjsLib) pdfDoc = await window.pdfjsLib.getDocument({ data: base64ToU8(base64) }).promise;
            } catch (e) { pdfDoc = null; }
            for (let qi = 0; qi < cap; qi++) {
                const raw = list[qi];
                const q = {
                    text: String(raw.text || "").trim(),
                    options: Array.isArray(raw.options) ? ["", "", "", ""].map((_, i) => String(raw.options[i] || "").trim()) : ["", "", "", ""],
                    answer: -1,
                    image: ""
                };
                if (!q.text && !(raw.bbox && raw.page)) continue;
                if (pdfDoc && raw.bbox && raw.page) {
                    status.textContent = "Soru görüntüleri oluşturuluyor: " + (questions.length + 1) + " / " + cap + "...";
                    try {
                        q.image = await cropPdfRegion(pdfDoc, raw.page, raw.bbox);
                    } catch (err) { q.image = ""; }
                    if (q.image) q.text = "";
                }
                questions.push(q);
            }

            if (questions.length === 0) throw new Error("Soru bulunamadı");

            const wrap = document.getElementById("examQuestions");
            wrap.innerHTML = "";
            questions.forEach(q => addExamQuestionRow(q, true));
            status.textContent = questions.length + " soru eklendi ✓";
            showToast(questions.length + " soru PDF'ten alındı. Soru metinlerini kontrol edip kaydedin.");
        } catch (err) {
            status.textContent = "";
            showError("PDF okunamadı: " + err.message);
        } finally {
            btn.disabled = false;
        }
    });

    function base64ToU8(b64) {
        const bin = atob(b64);
        const u = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
        return u;
    }

    async function cropPdfRegion(pdf, pageNum, bbox) {
        if (!pdf || !pageNum || !bbox) return "";
        if (!pdf.numPages || pdf.numPages < pageNum) return "";
        const page = await pdf.getPage(pageNum);
        const vp = page.getViewport({ scale: 1 });
        const pad = 10;
        const x = Math.max(0, Math.min(vp.width - 1, (Number(bbox.x) || 0) - pad));
        const y = Math.max(0, Math.min(vp.height - 1, (Number(bbox.y) || 0) - pad));
        const w = Math.min(vp.width - x, Math.max(1, (Number(bbox.w) || 0) + 2 * pad));
        const h = Math.min(vp.height - y, Math.max(1, (Number(bbox.h) || 0) + 2 * pad));
        const scale = Math.min(2.5, 900 / Math.max(w, 1));
        const cv = document.createElement("canvas");
        cv.width = Math.max(2, Math.round(w * scale));
        cv.height = Math.max(2, Math.round(h * scale));
        const ctx = cv.getContext("2d");
        await page.render({ canvasContext: ctx, viewport: vp, transform: [scale, 0, 0, scale, -x * scale, -y * scale] }).promise;
        return cv.toDataURL("image/jpeg", 0.72);
    }

    function renderExamQuestions(questions) {
        const wrap = document.getElementById("examQuestions");
        wrap.innerHTML = "";
        (questions || []).forEach(q => addExamQuestionRow(q, true));
    }

    function addExamQuestionRow(q, silent) {
        const wrap = document.getElementById("examQuestions");
        const row = document.createElement("div");
        row.className = "exam-q-box";
        const text = (q && q.text) ? q.text : "";
        const opts = (q && q.options) || ["", "", "", ""];
        const img = (q && q.image) ? q.image : "";
        const letters = ["A", "B", "C", "D"];
        let optRows = "";
        for (let j = 0; j < 4; j++) {
            optRows += `<div class="qq-opt-row"><span class="qq-letter">${letters[j]}</span><input type="text" class="qq-opt" placeholder="Şık ${letters[j]}" value="${esc(opts[j] || "")}"></div>`;
        }
        row.innerHTML = `
            <div class="qq-head">
                <strong>Soru ${wrap.children.length + 1}</strong>
                <button type="button" class="btn-delete" onclick="removeExamQuestion(this)"><i class="fas fa-trash"></i></button>
            </div>
            <input type="text" class="qq-text" placeholder="Soru metni" value="${esc(text)}">
            <div class="qq-img-row" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:10px;">
                <input type="hidden" class="qq-img" value="${img ? img : ""}">
                <button type="button" class="qq-img-add" style="background:var(--bg-light);border:1px dashed var(--border);border-radius:8px;padding:8px 12px;font-size:0.82rem;font-weight:600;color:var(--text-medium);cursor:pointer;">
                    <i class="fas fa-image"></i> Görsel Ekle
                </button>
                <input type="file" class="qq-img-file" accept="image/*" style="display:none;">
                <div class="qq-img-preview"${img ? "" : ' style="display:none;"'} style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                    <img src="${img}" style="max-height:80px;border-radius:8px;border:1px solid var(--border);" alt="Önizleme">
                    <button type="button" class="qq-img-remove" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.78rem;color:#b91c1c;">
                        <i class="fas fa-trash"></i> Kaldır
                    </button>
                </div>
            </div>
            ${optRows}`;
        wrap.appendChild(row);

        const addBtn = row.querySelector(".qq-img-add");
        const fileInp = row.querySelector(".qq-img-file");
        const prev = row.querySelector(".qq-img-preview");
        if (img) addBtn.innerHTML = '<i class="fas fa-image"></i> Görseli Değiştir';

        addBtn.addEventListener("click", () => fileInp.click());
        fileInp.addEventListener("change", async (e) => {
            const f = e.target.files && e.target.files[0];
            e.target.value = "";
            if (!f) return;
            try {
                const dataUrl = await processQuestionImage(f);
                row.querySelector(".qq-img").value = dataUrl;
                prev.style.display = "flex";
                prev.innerHTML = `<img src="${dataUrl}" style="max-height:80px;border-radius:8px;border:1px solid var(--border);" alt="Önizleme">
                    <button type="button" class="qq-img-remove" style="background:#fee2e2;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:0.78rem;color:#b91c1c;"><i class="fas fa-trash"></i> Kaldır</button>`;
                addBtn.innerHTML = '<i class="fas fa-image"></i> Görseli Değiştir';
                prev.querySelector(".qq-img-remove").addEventListener("click", () => {
                    row.querySelector(".qq-img").value = "";
                    prev.style.display = "none";
                    prev.innerHTML = "";
                    addBtn.innerHTML = '<i class="fas fa-image"></i> Görsel Ekle';
                });
            } catch (err) {
                showError(err.message);
            }
        });
        prev.querySelector(".qq-img-remove").addEventListener("click", () => {
            row.querySelector(".qq-img").value = "";
            prev.style.display = "none";
            prev.innerHTML = "";
            addBtn.innerHTML = '<i class="fas fa-image"></i> Görsel Ekle';
        });
    }

    function processQuestionImage(file) {
        return new Promise((resolve, reject) => {
            if (!file.type || file.type.indexOf("image/") !== 0) { reject(new Error("Lütfen bir görsel dosyası seçin.")); return; }
            if (file.size > 4 * 1024 * 1024) { reject(new Error("Görsel 4 MB'tan küçük olmalı.")); return; }
            const rd = new FileReader();
            rd.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const scale = Math.min(1, 900 / img.width, 600 / img.height);
                    const w = Math.max(1, Math.round(img.width * scale));
                    const h = Math.max(1, Math.round(img.height * scale));
                    const cv = document.createElement("canvas");
                    cv.width = w;
                    cv.height = h;
                    cv.getContext("2d").drawImage(img, 0, 0, w, h);
                    resolve(cv.toDataURL("image/jpeg", 0.72));
                };
                img.onerror = () => reject(new Error("Görsel okunamadı"));
                img.src = rd.result;
            };
            rd.onerror = () => reject(new Error("Dosya okunamadı"));
            rd.readAsDataURL(file);
        });
    }

    window.removeExamQuestion = function(btn) {
        const row = btn.closest(".exam-q-box");
        if (!row) return;
        row.remove();
        document.querySelectorAll("#examQuestions .exam-q-box").forEach((r, idx) => {
            const s = r.querySelector(".qq-head strong");
            if (s) s.textContent = "Soru " + (idx + 1);
        });
    };

    function collectExamQuestions() {
        const rows = document.querySelectorAll("#examQuestions .exam-q-box");
        const questions = [];
        rows.forEach(r => {
            const qt = r.querySelector(".qq-text");
            const text = qt ? qt.value.trim() : "";
            const imgEl = r.querySelector(".qq-img");
            const image = imgEl && imgEl.value ? imgEl.value : "";
            if (!text && !image) return;
            const options = Array.from(r.querySelectorAll(".qq-opt")).map(o => (o.value || "").trim());
            questions.push({ text, options, answer: -1, image });
        });
        return questions;
    }

    /* Branş soru sayıları */
    function renderBranchCounts(counts) {
        const wrap = document.getElementById("branchCounts");
        const c = counts || {};
        wrap.innerHTML = OPTIK_SUBJECT_DEFS.map(s => `
            <div style="display:flex;align-items:center;gap:10px;">
                <label style="flex:1;font-size:0.88rem;color:var(--text);" title="${esc(s.label)}">${esc(s.label)}</label>
                <input type="text" class="branch-count" data-branch="${s.id}" placeholder="0" inputmode="numeric"
                       oninput="numericOnly(this);updateBranchPreview()" value="${c[s.id] !== undefined ? c[s.id] : ""}">
            </div>`).join("");
        updateBranchPreview();
    }

    function readBranchCounts() {
        const res = {};
        document.querySelectorAll("#branchCounts .branch-count").forEach(inp => {
            res[inp.dataset.branch] = parseInt(inp.value || "0", 10);
        });
        return res;
    }

    window.updateBranchPreview = function() {
        const counts = readBranchCounts();
        const pre = document.getElementById("branchRangePreview");
        let start = 1;
        let total = 0;
        const lines = [];
        OPTIK_SUBJECT_DEFS.forEach(s => {
            const cnt = counts[s.id] || 0;
            total += cnt;
            const last = cnt > 0 ? start + cnt - 1 : start - 1;
            lines.push(s.label + ": " + cnt + " soru" + (cnt > 0 ? " (cevap " + start + "-" + last + ")" : " (boş)"));
            start += cnt;
        });
        pre.textContent = lines.join("\n") + "\nToplam: " + total + " soru";
    };

    document.getElementById("addExamBtn").addEventListener("click", () => {
        document.getElementById("examForm").style.display = "block";
        document.getElementById("examFormTitle").textContent = "Yeni Sınav Ekle";
        document.getElementById("examFormEl").reset();
        document.getElementById("editExamId").value = "";
        const wrap = document.getElementById("examQuestions");
        wrap.innerHTML = "";
        renderBranchCounts({});
        addExamQuestionRow(null);
        document.getElementById("examTitle").focus();
    });

    document.getElementById("addQuestionBtn").addEventListener("click", () => addExamQuestionRow(null));
    document.getElementById("cancelExamBtn").addEventListener("click", () => {
        document.getElementById("examForm").style.display = "none";
    });

    document.getElementById("examFormEl").addEventListener("submit", async (e) => {
        e.preventDefault();
        const editId = document.getElementById("editExamId").value;
        const questions = collectExamQuestions();
        if (questions.length === 0) { showError("En az bir soru girmelisiniz."); return; }
        const title = document.getElementById("examTitle").value.trim();
        const subject = document.getElementById("examSubject").value.trim();
        if (!title || !subject) { showError("Sınav başlığı ve ders zorunludur."); return; }

        const counts = readBranchCounts();
        const totalBranch = OPTIK_SUBJECT_DEFS.reduce((t, s) => t + (counts[s.id] || 0), 0);
        if (totalBranch !== questions.length) {
            showError("Branş soru sayılarının toplamı (" + totalBranch + ") ile eklenen soru sayısı (" + questions.length + ") uyuşmuyor. Cevap kaymasını önlemek için düzeltin.");
            return;
        }
        const branches = OPTIK_SUBJECT_DEFS.filter(s => (counts[s.id] || 0) > 0).map(s => ({ id: s.id, label: s.label, soruSayisi: counts[s.id] }));

        const examData = { title, subject, description: document.getElementById("examDesc").value.trim(), questions, branches, teacherId: "" };
        if (editId) {
            const idx = (remoteData.exams || []).findIndex(x => x.id === editId);
            if (idx !== -1) remoteData.exams[idx] = { ...remoteData.exams[idx], ...examData };
        } else {
            examData.id = generateId();
            examData.createdAt = new Date().toISOString().split("T")[0];
            if (!remoteData.exams) remoteData.exams = [];
            remoteData.exams.push(examData);
        }
        const ok = await saveRemoteData();
        if (ok) {
            showToast(editId ? "Sınav güncellendi!" : "Sınav eklendi!");
            renderExams();
            document.getElementById("examForm").style.display = "none";
        }
    });

    function renderExams() {
        const tbody = document.getElementById("examsTable");
        const empty = document.getElementById("emptyExams");
        const exams = remoteData.exams || [];
        if (exams.length === 0) {
            tbody.innerHTML = "";
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";
        tbody.innerHTML = exams.map((x, i) => {
            const teacher = (remoteData.teachers || []).find(t => t.id === x.teacherId);
            const teacherName = teacher ? (teacher.name + " " + teacher.surname) : "Yönetici";
            return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${esc(x.title)}</strong></td>
                <td>${esc(x.subject)}</td>
                <td>${(x.questions || []).length}</td>
                <td>${esc(teacherName)}</td>
                <td>${formatDate(x.createdAt)}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="showExamResults('${jsEsc(x.id)}')" title="Sonuçlar"><i class="fas fa-list-alt"></i></button>
                    <button class="btn-edit" onclick="editExam('${jsEsc(x.id)}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteExam('${jsEsc(x.id)}')"><i class="fas fa-trash"></i></button>
                </td>
            </tr>`;
        }).join("");
    }

    window.showExamResults = async function(examId) {
        const exam = (remoteData.exams || []).find(x => x.id === examId);
        if (!exam) return;
        try {
            const res = await fetchWithTimeout(FIREBASE_URL + "/_examResults/" + examId + ".json?t=" + Date.now(), { cache: "no-store" });
            const data = res.ok ? await res.json() : null;
            const list = [];
            if (data) {
                Object.keys(data).forEach(k => {
                    const r = data[k] || {};
                    const st = (remoteData.students || []).find(s => s.id === k) || (remoteData.students || []).find(s => (s.name + " " + s.surname) === r.name);
                    list.push({
                        name: st ? (st.name + " " + st.surname) : (r.studentName || "Bilinmiyor"),
                        no: st ? (st.no || "") : "",
                        txt: r.txt || "",
                        done: !!r.done,
                        updatedAt: r.updatedAt || 0
                    });
                });
            }
            const doneList = list.filter(x => x.done).sort((a, b) => (a.no || "") < (b.no || "") ? -1 : 1);
            const header = "TcNo;AdSoyad;Numara;Kitapcik;Turkce;Matematik;FenBilimleri;Inkilap;Din;YabanciDil";
            const allTxt = header + "\n" + doneList.map(x => x.txt).join("\n");

            const ov = document.createElement("div");
            ov.id = "examResultsModal";
            ov.style.cssText = "position:fixed;inset:0;background:rgba(15,23,42,.65);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;";
            ov.innerHTML = `
                <div style="width:100%;max-width:760px;max-height:85vh;overflow:auto;background:#fff;border-radius:14px;padding:22px;box-shadow:0 25px 50px -12px rgba(0,0,0,.4);">
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:14px;">
                        <h3 style="margin:0;color:#0f172a;">${esc(exam.title)} — Sonuçlar</h3>
                        <button style="border:none;background:none;font-size:1.2rem;cursor:pointer;color:#94a3b8;" onclick="document.getElementById('examResultsModal').remove()">✕</button>
                    </div>
                    <p style="font-size:0.82rem;color:#64748b;margin-bottom:10px;">Sınavı bitirmiş öğrencilerin optik TXT kayıtları:</p>
                    <div style="display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap;">
                        <button class="btn-save" onclick="downloadExamTxt()"><i class="fas fa-download"></i> Tüm TXT'leri İndir (.txt)</button>
                        <button class="btn-save" onclick="copyExamTxt()" style="background:#475569;"><i class="fas fa-copy"></i> Kopyala</button>
                    </div>
                    <div id="examResultsList"></div>
                </div>`;
            document.body.appendChild(ov);

            const listEl = document.getElementById("examResultsList");
            if (doneList.length === 0) {
                listEl.innerHTML = '<p style="color:#94a3b8;font-size:0.9rem;">Henüz sınavı bitiren öğrenci yok.</p>';
            } else {
                listEl.innerHTML = doneList.map(x => `
                    <div style="border:1px solid #e2e8f0;border-radius:10px;padding:12px;margin-bottom:10px;background:#f8fafc;">
                        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:8px;">
                            <strong style="color:#0f172a;font-size:0.95rem;">${esc(x.name)}${x.no ? " · No: " + esc(x.no) : ""}</strong>
                            <span style="font-size:0.75rem;color:#64748b;">${new Date(x.updatedAt).toLocaleString("tr-TR")}</span>
                        </div>
                        <code style="display:block;padding:10px 12px;background:#0f172a;color:#a5f3fc;border-radius:8px;font-size:0.78rem;white-space:pre-wrap;word-break:break-all;">${esc(x.txt || "(TXT yok)")}</code>
                    </div>`).join("");
                window.__examTxtAll = allTxt;
            }
        } catch (e) {
            showError("Sonuçlar okunamadı: " + e.message);
        }
    };

    window.copyExamTxt = function() {
        if (!window.__examTxtAll) return;
        const p = navigator.clipboard ? navigator.clipboard.writeText(window.__examTxtAll) : Promise.resolve();
        p.then(() => showToast("TXT panoya kopyalandı!")).catch(() => {});
    };

    window.downloadExamTxt = function() {
        if (!window.__examTxtAll) return;
        const blob = new Blob([window.__examTxtAll], { type: "text/plain;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "optik_sonuclar.txt";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    window.editExam = function(id) {
        const x = (remoteData.exams || []).find(y => y.id === id);
        if (!x) return;
        document.getElementById("examForm").style.display = "block";
        document.getElementById("examFormTitle").textContent = "Sınavı Düzenle";
        document.getElementById("editExamId").value = x.id;
        document.getElementById("examTitle").value = x.title || "";
        document.getElementById("examSubject").value = x.subject || "";
        document.getElementById("examDesc").value = x.description || "";
        const counts = {};
        (x.branches || []).forEach(b => { counts[b.id] = b.soruSayisi; });
        renderBranchCounts(counts);
        renderExamQuestions(x.questions);
    };

    window.deleteExam = function(id) {
        showConfirm("Bu sınavı silmek istediğinize emin misiniz?", async () => {
            remoteData.exams = (remoteData.exams || []).filter(y => y.id !== id);
            deletedIds.exams.add(id);
            const ok = await saveRemoteData();
            if (ok) {
                renderExams();
                showToast("Sınav silindi!");
            }
        });
    };

    function updateDashboard() {
        const today = new Date().toISOString().split("T")[0];
        document.getElementById("teacherCount").textContent = remoteData.teachers.length;
        document.getElementById("classCount").textContent = remoteData.classes.filter(c => !classEndPassed(c)).length;
        document.getElementById("todayCount").textContent = remoteData.classes.filter(c => c.date === today).length;
        document.getElementById("studentCount").textContent = (remoteData.students || []).length;

        const recent = document.getElementById("recentClasses");
        const lastClasses = remoteData.classes.filter(c => !classEndPassed(c)).slice(-5).reverse();

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
                    <h4>${esc(c.title)}</h4>
                    <p>${esc(name)} | ${esc(dayLabels[c.day] || c.day)} ${formatTime(c.startTime, c.endTime)}</p>
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
        showToast("Token site içinde gömülüdür, elle girmeye gerek yok.");
        if (document.getElementById("tokenInput")) document.getElementById("tokenInput").value = "";
    });

    /* ============ Optik Form Tanımları ============ */
    const OPTIK_FIELDS = [
        { id: "isim", label: "İsim" },
        { id: "tcno", label: "TC Kimlik No" },
        { id: "numara", label: "Numara" },
        { id: "kitapcik", label: "Kitapçık" },
        { id: "turkce", label: "Türkçe" },
        { id: "matematik", label: "Matematik" },
        { id: "fen", label: "Fen Bilimleri" },
        { id: "inkilap", label: "T.C. İnkılap Tarihi ve Atatürkçülük" },
        { id: "din", label: "Din Kültürü ve Ahlak Bilgisi" },
        { id: "yabanci", label: "Yabancı Dil" }
    ];
    const OPTIK_SUBJECT_DEFS = [
        { id: "turkce", label: "Türkçe" },
        { id: "matematik", label: "Matematik" },
        { id: "fen", label: "Fen Bilimleri" },
        { id: "inkilap", label: "T.C. İnkılap Tarihi ve Atatürkçülük" },
        { id: "din", label: "Din Kültürü ve Ahlak Bilgisi" },
        { id: "yabanci", label: "Yabancı Dil" }
    ];

    window.numericOnly = function(el) { el.value = el.value.replace(/[^0-9]/g, ""); };

    function renderOptik() {
        const o = remoteData.optik || {};
        document.getElementById("optikBaslangic").value = o.baslangic || "";
        document.getElementById("optikBitis").value = o.bitis || "";
        const stored = {};
        (o.fields || []).forEach(f => { stored[f.id] = { baslangic: f.baslangic, bitis: f.bitis }; });
        const wrap = document.getElementById("optikFields");
        wrap.innerHTML = OPTIK_FIELDS.map(f => {
            const s = stored[f.id] || {};
            const rowClass = OPTIK_SUBJECT_DEFS.some(x => x.id === f.id) ? "optik-row subject" : "optik-row";
            return `<div class="${rowClass}">
                <label class="optik-label" title="${esc(f.label)}">${esc(f.label)}</label>
                <div class="optik-range">
                    <input type="text" class="optik-bs" id="optikBs-${f.id}" placeholder="Başlangıç" inputmode="numeric" oninput="numericOnly(this)" value="${s.baslangic || ""}">
                    <span class="optik-dash">–</span>
                    <input type="text" class="optik-bt" id="optikBt-${f.id}" placeholder="Bitiş" inputmode="numeric" oninput="numericOnly(this)" value="${s.bitis || ""}">
                </div>
            </div>`;
        }).join("");
    }

    document.getElementById("optikSaveBtn").addEventListener("click", async () => {
        remoteData.optik = {
            baslangic: parseInt(document.getElementById("optikBaslangic").value || "0", 10),
            bitis: parseInt(document.getElementById("optikBitis").value || "0", 10),
            fields: OPTIK_FIELDS.map(f => ({
                id: f.id,
                label: f.label,
                baslangic: parseInt(document.getElementById("optikBs-" + f.id).value || "0", 10),
                bitis: parseInt(document.getElementById("optikBt-" + f.id).value || "0", 10)
            }))
        };
        const ok = await saveRemoteData();
        if (ok) {
            renderOptik();
            showToast("Optik form tanımı kaydedildi!");
        }
    });

    /* ============ TXT Birleştirme Bölümü ============ */
    let _txtFileList = null;
    let _txtExamId = "";

    function txtLayout() {
        const o = remoteData.optik || {};
        const fields = OPTIK_FIELDS.map(f => {
            const ff = (o.fields || []).find(x => x.id === f.id) || {};
            return { id: f.id, label: f.label, baslangic: parseInt(ff.baslangic || "0", 10), bitis: parseInt(ff.bitis || "0", 10) };
        });
        const width = Math.max(parseInt(o.bitis || "0", 10), 0, ...fields.map(f => f.bitis));
        return { fields, width };
    }

    function txtParseLine(layout, line) {
        const rec = {};
        layout.fields.forEach(f => {
            rec[f.id] = (f.baslangic > 0 && f.bitis >= f.baslangic) ? line.slice(f.baslangic - 1, f.bitis) : "";
        });
        return rec;
    }

    function txtBuildLine(layout, rec) {
        const width = Math.max(layout.width, 1);
        const chars = new Array(width + 1).join(".").split("");
        layout.fields.forEach(f => {
            const val = String(rec[f.id] || "");
            const start = f.baslangic - 1;
            const end = f.bitis - 1;
            if (start >= 0 && end >= start) {
                for (let k = 0; k < val.length && start + k <= end; k++) chars[start + k] = val[k];
            }
        });
        return chars.join("");
    }

    function txtMergeAll(files) {
        const layout = txtLayout();
        if (!layout.fields.some(f => f.baslangic > 0 && f.bitis >= f.baslangic)) {
            return { error: "Önce Optik Form bölümünde alanlara Başlangıç/Bitiş girilmelidir.", merged: "", count: 0 };
        }
        const records = [];
        (files || []).forEach(f => {
            String(f.content || "").replace(/\r\n/g, "\n").trim().split("\n").forEach(l => {
                const s = l.trimEnd();
                if (s !== "") records.push(txtParseLine(layout, s));
            });
        });
        return { error: "", merged: records.map(r => txtBuildLine(layout, r)).join("\n"), count: records.length };
    }

    function txtRender() {
        const sel = document.getElementById("txtExamSelect");
        const statusEl = document.getElementById("txtStatus");
        const listEl = document.getElementById("txtFileList");
        const preEl = document.getElementById("txtMerged");
        const examId = sel ? sel.value : _txtExamId;
        _txtExamId = examId;
        if (!examId) {
            listEl.innerHTML = "";
            preEl.textContent = "";
            statusEl.textContent = "";
            return;
        }
        const merge = txtMergeAll(_txtFileList || []);
        if (merge.error) {
            preEl.textContent = merge.error;
            listEl.innerHTML = "";
            statusEl.textContent = "";
            return;
        }
        statusEl.textContent = (_txtFileList || []).length + " dosya · " + merge.count + " öğrenci satırı";
        preEl.textContent = merge.merged;
        listEl.innerHTML = (_txtFileList || []).map((f, i) => `
            <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:8px;margin-bottom:6px;background:var(--bg-white);">
                <i class="fas fa-file-alt" style="color:var(--text-light);"></i>
                <span style="flex:1;font-size:0.84rem;color:var(--text);">${esc(f.name || "TXT")}</span>
                <span style="font-size:0.72rem;color:var(--text-light);">${f.addedAt ? new Date(f.addedAt).toLocaleString("tr-TR") : ""}</span>
                <button type="button" class="btn-delete" style="padding:4px 8px;font-size:0.72rem;" onclick="txtRemoveFile(${i})"><i class="fas fa-trash"></i></button>
            </div>`).join("");
    }

    async function txtLoad(examId) {
        if (!examId) { _txtFileList = null; return; }
        try {
            const res = await fetchWithTimeout(FIREBASE_URL + "/_examTxt/" + examId + ".json?t=" + Date.now(), { cache: "no-store" });
            const data = res.ok ? await res.json() : null;
            _txtFileList = Array.isArray(data) ? data : [];
            _txtExamId = examId;
        } catch (e) {
            _txtFileList = null;
            showError("TXT listesi okunamadı: " + e.message);
        }
    }

    async function txtSave(examId, files) {
        const res = await fetchWithTimeout(FIREBASE_URL + "/_examTxt/" + examId + ".json", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(files)
        });
        if (!res.ok) throw new Error("TXT kaydedilemedi (" + res.status + ")");
    }

    window.renderTxtSection = async function() {
        const sel = document.getElementById("txtExamSelect");
        if (!sel) return;
        const exams = (remoteData.exams || []).slice();
        const prev = sel.value;
        sel.innerHTML = `<option value="">Sınav Seç...</option>` + exams.map(x => `<option value="${jsEsc(x.id)}">${esc(x.title)}</option>`).join("");
        if (prev) sel.value = prev;
        if (sel.value) { await txtLoad(sel.value); }
        txtRender();
    };

    window.txtRemoveFile = async function(i) {
        const files = (_txtFileList || []).slice();
        files.splice(i, 1);
        _txtFileList = files;
        try {
            if (files.length === 0) {
                await fetchWithTimeout(FIREBASE_URL + "/_examTxt/" + _txtExamId + ".json", { method: "DELETE" });
            } else {
                await txtSave(_txtExamId, files);
            }
            txtRender();
            showToast("Dosya kaldırıldı.");
        } catch (e) {
            showError(e.message);
        }
    };

    document.querySelector('.sidebar-btn[data-section="txt"]').addEventListener("click", () => { window.renderTxtSection(); });

    document.getElementById("txtExamSelect").addEventListener("change", async () => {
        const sel = document.getElementById("txtExamSelect");
        if (!sel.value) { _txtFileList = null; txtRender(); return; }
        await txtLoad(sel.value);
        txtRender();
    });
    document.getElementById("txtUploadBtn").addEventListener("click", () => document.getElementById("txtFileInput").click());
    document.getElementById("txtFileInput").addEventListener("change", async (e) => {
        const sel = document.getElementById("txtExamSelect");
        if (!sel.value) { showError("Önce sınav seçin."); e.target.value = ""; return; }
        const files = Array.from(e.target.files || []);
        e.target.value = "";
        if (!files.length) return;
        const reads = files.map(f => new Promise((resolve, reject) => {
            const rd = new FileReader();
            rd.onload = () => resolve({ name: f.name, addedAt: Date.now(), content: String(rd.result || "") });
            rd.onerror = () => reject(new Error(f.name + " okunamadı"));
            rd.readAsText(f, "utf-8");
        }));
        try {
            const newOnes = await Promise.all(reads);
            const all = (_txtFileList || []).concat(newOnes);
            await txtSave(_txtExamId, all);
            _txtFileList = all;
            txtRender();
            showToast(newOnes.length + " TXT eklendi ve birleştirildi.");
        } catch (err) {
            showError(err.message);
        }
    });
    document.getElementById("txtDownloadBtn").addEventListener("click", () => {
        const exam = (remoteData.exams || []).find(x => x.id === _txtExamId);
        const content = document.getElementById("txtMerged").textContent;
        if (!content) { showError("Birleştirilmiş TXT yok."); return; }
        const a = document.createElement("a");
        const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
        a.href = URL.createObjectURL(blob);
        a.download = ((exam && exam.title) || "optik") + "_optik.txt";
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    });
    document.getElementById("txtClearBtn").addEventListener("click", () => {
        if (!_txtExamId) return;
        showConfirm("Bu sınava yüklenen tüm TXT'ler silinsin mi?", async () => {
            try {
                await fetchWithTimeout(FIREBASE_URL + "/_examTxt/" + _txtExamId + ".json", { method: "DELETE" });
                _txtFileList = [];
                txtRender();
                showToast("TXT'ler temizlendi.");
            } catch (e) {
                showError(e.message);
            }
        });
    });
});
