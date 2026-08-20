const ADMIN_USER = "oneregitim";
const ADMIN_PASS = "oneregitim123";

function getData(key) {
    return JSON.parse(localStorage.getItem(key) || "[]");
}

function setData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function formatTime(start, end) {
    return start + " - " + end;
}

function formatDate(dateStr) {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    const day = d.getDate();
    const months = ["Oca","Şub","Mar","Nis","May","Haz","Tem","Ağu","Eyl","Eki","Kas","Ara"];
    return day + " " + months[d.getMonth()] + " " + d.getFullYear();
}

const dayLabels = {
    pazartesi: "Pazartesi",
    sali: "Salı",
    carsamba: "Çarşamba",
    persembe: "Perşembe",
    cuma: "Cuma",
    cumartesi: "Cumartesi",
    pazar: "Pazar"
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

function showToast(msg) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:24px;right:24px;background:#10b981;color:white;padding:14px 24px;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);animation:fadeIn .3s;";
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
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

    function initPanel() {
        renderTeachers();
        renderClasses();
        updateDashboard();
        initNavigation();
    }

    function initNavigation() {
        document.querySelectorAll(".sidebar-btn").forEach(btn => {
            btn.addEventListener("click", () => {
                document.querySelectorAll(".sidebar-btn").forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const section = btn.dataset.section;
                document.querySelectorAll(".section-page").forEach(p => p.classList.remove("active"));
                document.getElementById(section + "Page").classList.add("active");
                document.getElementById("sectionTitle").textContent = btn.textContent.trim();
            });
        });
    }

    function renderTeachers() {
        const teachers = getData("teachers");
        const tbody = document.getElementById("teacherTable");
        const empty = document.getElementById("emptyTeachers");

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
                <td>${t.branch}</td>
                <td>${t.email || "-"}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editTeacher('${t.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteTeacher('${t.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join("");

        updateTeacherSelect();
    }

    function updateTeacherSelect() {
        const teachers = getData("teachers");
        const select = document.getElementById("classTeacher");
        select.innerHTML = '<option value="">Öğretmen Seçin</option>' +
            teachers.map(t => `<option value="${t.id}">${t.name} ${t.surname} (${t.branch})</option>`).join("");
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

    document.getElementById("teacherFormEl").addEventListener("submit", (e) => {
        e.preventDefault();
        const teachers = getData("teachers");
        const editId = document.getElementById("editTeacherId").value;

        const teacherData = {
            name: document.getElementById("teacherName").value.trim(),
            surname: document.getElementById("teacherSurname").value.trim(),
            branch: document.getElementById("teacherBranch").value.trim(),
            email: document.getElementById("teacherEmail").value.trim()
        };

        if (editId) {
            const idx = teachers.findIndex(t => t.id === editId);
            if (idx !== -1) teachers[idx] = { ...teachers[idx], ...teacherData };
            showToast("Öğretmen güncellendi!");
        } else {
            teacherData.id = generateId();
            teachers.push(teacherData);
            showToast("Öğretmen eklendi!");
        }

        setData("teachers", teachers);
        renderTeachers();
        updateDashboard();
        document.getElementById("teacherForm").style.display = "none";
    });

    window.editTeacher = function(id) {
        const teachers = getData("teachers");
        const t = teachers.find(x => x.id === id);
        if (!t) return;

        document.getElementById("teacherForm").style.display = "block";
        document.getElementById("teacherFormTitle").textContent = "Öğretmeni Düzenle";
        document.getElementById("editTeacherId").value = t.id;
        document.getElementById("teacherName").value = t.name;
        document.getElementById("teacherSurname").value = t.surname;
        document.getElementById("teacherBranch").value = t.branch;
        document.getElementById("teacherEmail").value = t.email || "";
    };

    window.deleteTeacher = function(id) {
        showConfirm("Bu öğretmeni silmek istediğinize emin misiniz?", () => {
            let teachers = getData("teachers");
            teachers = teachers.filter(t => t.id !== id);
            setData("teachers", teachers);
            renderTeachers();
            updateDashboard();
            showToast("Öğretmen silindi!");
        });
    };

    function renderClasses(filter) {
        let classes = getData("classes");
        const teachers = getData("teachers");
        const tbody = document.getElementById("classTable");
        const empty = document.getElementById("emptyClasses");

        const filterDay = document.getElementById("filterDay").value;
        const searchTerm = document.getElementById("searchClass").value.toLowerCase();

        if (filterDay !== "tum") {
            classes = classes.filter(c => c.day === filterDay);
        }
        if (searchTerm) {
            classes = classes.filter(c =>
                c.title.toLowerCase().includes(searchTerm) ||
                c.description.toLowerCase().includes(searchTerm)
            );
        }

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
            const teacher = teachers.find(t => t.id === c.teacherId);
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
                    <button class="btn-edit" onclick="editClass('${c.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete" onclick="deleteClass('${c.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
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

    document.getElementById("classFormEl").addEventListener("submit", (e) => {
        e.preventDefault();
        let classes = getData("classes");
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

        const teachers = getData("teachers");
        const teacher = teachers.find(t => t.id === classData.teacherId);
        classData.courseType = teacher ? getCourseType(teacher.branch) : "math";

        if (editId) {
            const idx = classes.findIndex(c => c.id === editId);
            if (idx !== -1) classes[idx] = { ...classes[idx], ...classData };
            showToast("Ders güncellendi!");
        } else {
            classData.id = generateId();
            classes.push(classData);
            showToast("Ders eklendi!");
        }

        setData("classes", classes);
        renderClasses();
        updateDashboard();
        document.getElementById("classForm").style.display = "none";
    });

    window.editClass = function(id) {
        const classes = getData("classes");
        const c = classes.find(x => x.id === id);
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
        showConfirm("Bu dersi silmek istediğinize emin misiniz?", () => {
            let classes = getData("classes");
            classes = classes.filter(c => c.id !== id);
            setData("classes", classes);
            renderClasses();
            updateDashboard();
            showToast("Ders silindi!");
        });
    };

    document.getElementById("filterDay").addEventListener("change", () => renderClasses());
    document.getElementById("searchClass").addEventListener("input", () => renderClasses());

    function updateDashboard() {
        const teachers = getData("teachers");
        const classes = getData("classes");
        const today = new Date().toISOString().split("T")[0];

        document.getElementById("teacherCount").textContent = teachers.length;
        document.getElementById("classCount").textContent = classes.length;
        document.getElementById("todayCount").textContent = classes.filter(c => c.date === today).length;

        const recent = document.getElementById("recentClasses");
        const lastClasses = classes.slice(-5).reverse();

        if (lastClasses.length === 0) {
            recent.innerHTML = '<p style="color:var(--text-light);padding:20px 0;">Henüz ders eklenmemiş</p>';
            return;
        }

        recent.innerHTML = lastClasses.map(c => {
            const teacher = teachers.find(t => t.id === c.teacherId);
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
        const data = {
            teachers: getData("teachers"),
            classes: getData("classes"),
            exportDate: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "oner-egitim-verileri.json";
        a.click();
        URL.revokeObjectURL(url);
        showToast("Veriler dışa aktarıldı!");
    });

    document.getElementById("clearDataBtn").addEventListener("click", () => {
        showConfirm("Tüm öğretmen ve ders verileri silinecek! Emin misiniz?", () => {
            localStorage.removeItem("teachers");
            localStorage.removeItem("classes");
            renderTeachers();
            renderClasses();
            updateDashboard();
            showToast("Tüm veriler temizlendi!");
        });
    });
});
