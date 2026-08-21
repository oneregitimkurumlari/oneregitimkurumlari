const GITHUB_REPO = "oneregitimkurumlari/oneregitimkurumlari";
const DATA_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/master/data.json`;

const dayLabels = {
    pazartesi: "Pazartesi", sali: "Salı", carsamba: "Çarşamba",
    persembe: "Perşembe", cuma: "Cuma", cumartesi: "Cumartesi", pazar: "Pazar"
};

const statusMap = {
    live: { label: "Canlı", class: "status-live" },
    upcoming: { label: "Yaklaşıyor", class: "status-upcoming" },
    finished: { label: "Bitti", class: "status-finished" }
};

let cachedData = { teachers: [], classes: [], students: [], homeworks: [] };

function getDuration(start, end) {
    if (!start || !end) return "-";
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    const diff = (eh * 60 + em) - (sh * 60 + sm);
    return diff + " dk";
}

async function loadData() {
    try {
        const res = await fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("Veri yüklenemedi");
        const json = await res.json();
        cachedData.teachers = json.teachers || [];
        cachedData.classes = json.classes || [];
        cachedData.students = json.students || [];
        cachedData.homeworks = json.homeworks || [];
    } catch (e) {
        console.log("Veri yüklenemedi:", e);
        cachedData = { teachers: [], classes: [], students: [], homeworks: [] };
    }
}

function getScheduleData() {
    return cachedData.classes.map(c => {
        const teacher = cachedData.teachers.find(t => t.id === c.teacherId);
        return {
            id: c.id,
            title: c.title,
            instructor: teacher ? teacher.name + " " + teacher.surname : "Bilinmiyor",
            day: c.day,
            dayLabel: dayLabels[c.day] || c.day,
            time: c.startTime + " - " + c.endTime,
            classroom: c.classroom || "-",
            type: c.type || "Canlı Ders",
            status: c.status || "upcoming",
            courseType: c.courseType || "math",
            description: c.description || "",
            link: c.meetLink,
            students: c.capacity || 0,
            duration: getDuration(c.startTime, c.endTime)
        };
    });
}

function renderSchedule(filter = "tum") {
    const grid = document.getElementById("scheduleGrid");
    const scheduleData = getScheduleData();
    const filtered = filter === "tum" ? scheduleData : scheduleData.filter(s => s.day === filter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">
                <i class="fas fa-calendar-plus" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p style="font-size:1.1rem;">Henüz ders eklenmemiş</p>
                <p style="font-size:0.9rem;">Yönetim panelinden ders ekleyebilirsiniz.</p>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(item => `
        <div class="schedule-card ${item.courseType}" data-id="${item.id}">
            <div class="schedule-header">
                <span class="schedule-day">${item.dayLabel}</span>
                <span class="schedule-status ${statusMap[item.status]?.class || 'status-upcoming'}">${statusMap[item.status]?.label || 'Yaklaşıyor'}</span>
            </div>
            <h3 class="schedule-title">${item.title}</h3>
            <div class="schedule-info">
                <span><i class="fas fa-user"></i> ${item.instructor}</span>
                <span><i class="fas fa-clock"></i> ${item.time}</span>
                <span><i class="fas fa-door-open"></i> ${item.classroom}</span>
            </div>
            <div class="schedule-actions">
                <button class="schedule-btn btn-join" onclick="joinClass('${item.link}')">
                    <i class="fas fa-video"></i> Derse Katıl
                </button>
                <button class="schedule-btn btn-details" onclick="showDetails('${item.id}')">
                    Detay
                </button>
            </div>
        </div>
    `).join("");
}

function renderCourses() {
    const grid = document.getElementById("coursesGrid");
    const courseMap = {};
    cachedData.classes.forEach(c => {
        const teacher = cachedData.teachers.find(t => t.id === c.teacherId);
        const branch = teacher ? teacher.branch : "Diğer";
        if (!courseMap[branch]) courseMap[branch] = { name: branch, count: 0, students: 0 };
        courseMap[branch].count++;
        courseMap[branch].students += c.capacity || 0;
    });

    const icons = {
        "Matematik":"fa-square-root-variable","Fizik":"fa-atom","Biyoloji":"fa-dna",
        "Kimya":"fa-flask","İngilizce":"fa-language","Tarih":"fa-landmark",
        "Bilgisayar":"fa-code","Geometri":"fa-shapes","Türkçe":"fa-pen-fancy"
    };

    const courses = Object.values(courseMap);
    if (courses.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">
                <i class="fas fa-book-open" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p style="font-size:1.1rem;">Henüz ders eklenmemiş</p>
            </div>`;
        return;
    }

    grid.innerHTML = courses.map(c => `
        <div class="course-card">
            <div class="course-icon"><i class="fas ${icons[c.name] || 'fa-book'}"></i></div>
            <h3>${c.name}</h3>
            <p>Eğitim programı</p>
            <div class="course-meta">
                <span><i class="fas fa-book"></i> ${c.count} Seans</span>
                <span><i class="fas fa-users"></i> ${c.students} Öğrenci</span>
            </div>
        </div>
    `).join("");
}

function renderHomework() {
    const grid = document.getElementById("homeworkGrid");
    const homeworks = cachedData.homeworks || [];

    if (homeworks.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">
                <i class="fas fa-file-alt" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p style="font-size:1.1rem;">Henüz ödev eklenmemiş</p>
            </div>`;
        return;
    }

    const sorted = [...homeworks].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    grid.innerHTML = sorted.map(h => {
        const teacher = cachedData.teachers.find(t => t.id === h.teacherId);
        const teacherName = teacher ? teacher.name + " " + teacher.surname : "Yönetim";
        const fileIcon = h.fileType === "pdf" ? "fa-file-pdf" : h.fileType === "word" ? "fa-file-word" : h.fileType === "excel" ? "fa-file-excel" : "fa-file";
        const fileTag = h.fileUrl ? `<a href="${h.fileUrl}" target="_blank" class="homework-file"><i class="fas ${fileIcon}"></i> ${h.fileName || "Dosyayı İndir"}</a>` : "";
        return `
        <div class="homework-card">
            <div class="homework-header">
                <span class="homework-subject">${h.subject}</span>
                <span class="homework-date">${h.createdAt || ""}</span>
            </div>
            <h3>${h.title}</h3>
            <p class="homework-desc">${h.description || ""}</p>
            <div class="homework-meta">
                <span><i class="fas fa-user"></i> ${teacherName}</span>
            </div>
            ${fileTag}
        </div>`;
    }).join("");
}

function joinClass(link) { if (link) window.open(link, "_blank"); }

function showDetails(id) {
    const item = getScheduleData().find(s => String(s.id) === String(id));
    if (!item) return;
    const modal = document.getElementById("classModal");
    document.getElementById("modalBody").innerHTML = `
        <h3>${item.title}</h3>
        <div class="modal-detail"><i class="fas fa-user"></i><span><strong>Eğitmen:</strong> ${item.instructor}</span></div>
        <div class="modal-detail"><i class="fas fa-calendar"></i><span><strong>Gün:</strong> ${item.dayLabel}</span></div>
        <div class="modal-detail"><i class="fas fa-clock"></i><span><strong>Saat:</strong> ${item.time}</span></div>
        <div class="modal-detail"><i class="fas fa-door-open"></i><span><strong>Sınıf:</strong> ${item.classroom}</span></div>
        <div class="modal-detail"><i class="fas fa-hourglass-half"></i><span><strong>Süre:</strong> ${item.duration}</span></div>
        <div class="modal-detail"><i class="fas fa-info-circle"></i><span><strong>Açıklama:</strong> ${item.description}</span></div>
        <div class="modal-detail"><i class="fas fa-video"></i><span><strong>Google Meet:</strong> <a href="${item.link}" target="_blank" style="color:var(--primary);text-decoration:underline;font-family:monospace;font-size:0.85rem;">${item.link}</a></span></div>
        <div class="modal-actions">
            <a href="${item.link}" target="_blank" class="btn btn-secondary"><i class="fas fa-video"></i> Derse Katıl</a>
            <button class="btn btn-details" onclick="closeModal()">Kapat</button>
        </div>`;
    modal.classList.add("active");
}

function closeModal() { document.getElementById("classModal").classList.remove("active"); }

function showSite() {
    document.getElementById("siteLogin").style.display = "none";
    document.getElementById("siteMain").style.display = "block";
}

function initSite() {
    renderSchedule();
    renderCourses();
    renderHomework();

    document.querySelectorAll(".day-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".day-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderSchedule(btn.dataset.day);
        });
    });

    document.getElementById("menuToggle").addEventListener("click", () => {
        document.querySelector(".nav").classList.toggle("active");
    });

    document.getElementById("modalClose").addEventListener("click", closeModal);
    document.getElementById("classModal").addEventListener("click", (e) => {
        if (e.target.id === "classModal") closeModal();
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => document.querySelector(".nav").classList.remove("active"));
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadData();

    if (sessionStorage.getItem("siteLogged") === "true") {
        showSite();
        initSite();
        return;
    }

    const loginForm = document.getElementById("siteLoginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const username = document.getElementById("siteUsername").value.trim();
            const password = document.getElementById("sitePassword").value;
            const errorMsg = document.getElementById("siteErrorMsg");

            const students = cachedData.students || [];
            const student = students.find(s => s.username === username && s.password === password);

            if (student) {
                sessionStorage.setItem("siteLogged", "true");
                sessionStorage.setItem("siteUser", student.name + " " + student.surname);
                errorMsg.textContent = "";
                showSite();
                initSite();
            } else {
                errorMsg.textContent = "Kullanıcı adı veya şifre hatalı!";
            }
        });
    }
});
