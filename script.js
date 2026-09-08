const FIREBASE_URL = "https://one-egitim-default-rtdb.firebaseio.com";
const DATA_URL = FIREBASE_URL + "/.json";

function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c])); }
function jsEsc(s) { return String(s == null ? "" : s).replace(/\\/g, "\\\\").replace(/'/g, "\\'"); }

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

function applyJson(json) {
    cachedData.teachers = json.teachers || [];
    cachedData.classes = json.classes || [];
    cachedData.students = json.students || [];
    cachedData.homeworks = json.homeworks || [];
}

async function loadData() {
    try {
        const res = await fetch(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("Veri yüklenemedi (" + res.status + ")");
        const json = await res.json();
        applyJson(json);
    } catch (rawErr) {
        console.warn("Veri okunamadı:", rawErr.message);
        try {
            const res = await fetch(DATA_URL, { cache: "no-store" });
            if (!res.ok) throw new Error("Veri yüklenemedi (" + res.status + ")");
            applyJson(await res.json());
        } catch (e) {
            console.error("Veri yüklenemedi:", e);
            cachedData = { teachers: [], classes: [], students: [], homeworks: [] };
        }
    }
}

function getClassDateTime(c) {
    var dowMap = { pazartesi: 1, sali: 2, carsamba: 3, persembe: 4, cuma: 5, cumartesi: 6, pazar: 0 };
    var d = dowMap[c.day];
    if (d === undefined) return null;
    var now = new Date();
    var monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((now.getDay() || 7) - 1));
    var dayStart = new Date(monday);
    dayStart.setDate(monday.getDate() + ((d === 0 ? 7 : d) - 1));
    var sh = (c.startTime || "00:00").split(":").map(Number);
    var eh = (c.endTime || "23:59").split(":").map(Number);
    var start = new Date(dayStart); start.setHours(sh[0] || 0, sh[1] || 0, 0, 0);
    var end = new Date(dayStart); end.setHours(eh[0] || 23, eh[1] || 59, 0, 0);
    return { start: start, end: end };
}

function getClassLiveState(c) {
    var t = getClassDateTime(c);
    if (!t) return { state: "upcoming" };
    var now = new Date();
    if (now.getTime() > t.end.getTime()) return { state: "past" };
    var join = new Date(t.start);
    join.setMinutes(join.getMinutes() - 10);
    if (now.getTime() >= join.getTime()) return { state: "live", start: t.start, end: t.end, join: join };
    return { state: "upcoming", start: t.start, join: join };
}

function getScheduleData() {
    return cachedData.classes.map(c => {
        const teacher = cachedData.teachers.find(t => t.id === c.teacherId);
        const live = getClassLiveState(c);
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
            duration: getDuration(c.startTime, c.endTime),
            liveState: live.state
        };
    });
}

function renderSchedule(filter = "tum") {
    const grid = document.getElementById("scheduleGrid");
    if (!grid) return;
    const scheduleData = getScheduleData();
    const alive = scheduleData.filter(s => s.liveState !== "past");
    const filtered = filter === "tum" ? alive : alive.filter(s => s.day === filter);

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:var(--text-light);">
                <i class="fas fa-calendar-times" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p style="font-size:1.1rem;">Yaklaşan ders bulunmamaktadır</p>
                <p style="font-size:0.9rem;">Geçmiş dersler listeden kaldırıldı.</p>
            </div>`;
        return;
    }

    grid.innerHTML = filtered.map(item => {
        const isLive = item.liveState === "live";
        const statusCls = isLive ? "status-live" : "status-upcoming";
        const statusLbl = isLive ? "Canlı" : "Yaklaşıyor";
        const joinBtn = isLive
            ? `<button class="schedule-btn btn-join" onclick="joinClass('${jsEsc(item.link)}', '${jsEsc(item.id)}')"><i class="fas fa-video"></i> Derse Katıl</button>`
            : `<span class="schedule-pending"><i class="fas fa-hourglass-half"></i> Ders henüz başlamadı</span>`;
        return `
        <div class="schedule-card ${item.courseType}" data-id="${esc(item.id)}">
            <div class="schedule-header">
                <span class="schedule-day">${item.dayLabel}</span>
                <span class="schedule-status ${statusCls}">${statusLbl}</span>
            </div>
            <h3 class="schedule-title">${esc(item.title)}</h3>
            <div class="schedule-info">
                <span><i class="fas fa-user"></i> ${esc(item.instructor)}</span>
                <span><i class="fas fa-clock"></i> ${item.time}</span>
                <span><i class="fas fa-door-open"></i> ${esc(item.classroom)}</span>
            </div>
            <div class="schedule-actions">
                ${joinBtn}
                <button class="schedule-btn btn-details" onclick="showDetails('${jsEsc(item.id)}')">
                    Detay
                </button>
            </div>
        </div>
    `;
    }).join("");
}

function renderCourses() {
    const grid = document.getElementById("coursesGrid");
    if (!grid) return;
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
            <h3>${esc(c.name)}</h3>
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
        const safeName = (h.fileName || "odev-dosyasi").replace(/\\/g, "").replace(/'/g, "").replace(/"/g, "");
        const fileTag = h.fileUrl ? `<a href="${esc(h.fileUrl)}" class="homework-file" onclick="downloadHomeworkFile('${jsEsc(h.fileUrl)}', '${jsEsc(safeName)}'); return false;"><i class="fas ${fileIcon}"></i> ${esc(h.fileName || "Dosyayı İndir")}</a>` : "";
        return `
        <div class="homework-card">
            <div class="homework-header">
                <span class="homework-subject">${esc(h.subject)}</span>
                <span class="homework-date">${esc(h.createdAt || "")}</span>
            </div>
            <h3>${esc(h.title)}</h3>
            <p class="homework-desc">${esc(h.description || "")}</p>
            <div class="homework-meta">
                <span><i class="fas fa-user"></i> ${esc(teacherName)}</span>
            </div>
            ${fileTag}
        </div>`;
    }).join("");
}

function joinClass(link, id) {
    var params = new URLSearchParams();
    if (id) params.set("ders", id);
    params.set("v", "3");
    params.set("entry", "student");
    window.location.href = "ders.html?" + params.toString();
}

function isClassPast(c) {
    const today = new Date();
    const todayStr = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2, "0") + "-" + String(today.getDate()).padStart(2, "0");
    if (!c.date) return false;
    if (c.date < todayStr) return true;
    if (c.date > todayStr) return false;
    const [eh, em] = (c.endTime || "23:59").split(":").map(Number);
    const endMin = eh * 60 + em;
    const nowMin = today.getHours() * 60 + today.getMinutes();
    return nowMin > endMin;
}

function getRecordings() {
    return cachedData.classes
        .filter(c => isClassPast(c))
        .map(c => {
            const teacher = cachedData.teachers.find(t => t.id === c.teacherId);
            const subject = c.description || c.title;
            return {
                id: c.id,
                title: c.title,
                subject: subject,
                date: c.date || "",
                dayLabel: c.dayLabel || c.day || "",
                time: c.startTime + " - " + c.endTime,
                instructor: teacher ? teacher.name + " " + teacher.surname : "Bilinmiyor",
                courseType: c.courseType || "math",
                link: c.meetLink || "",
                recordingUrl: c.recordingUrl || ""
            };
        })
        .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
}

function recordingRawUrl(url) {
    if (!url) return "";
    const m = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/(?:blob|raw)\/([^\/]+)\/(.+)/);
    if (m) return "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + m[3] + "/" + m[4];
    return url;
}

function recordingBody(r) {
    if (r.recordingUrl) {
        const src = recordingRawUrl(r.recordingUrl);
        return `
        <video controls preload="metadata" class="recording-video" src="${esc(src)}">
            Tarayıcınız video desteklemiyor.
        </video>
        <div class="recording-view-toolbar">
            <a href="${esc(r.recordingUrl)}" target="_blank" class="schedule-btn btn-join recording-watch"><i class="fas fa-external-link-alt"></i> Kaydı Yeni Sekmede Görüntüle</a>
        </div>`;
    }
    return `<span class="recording-pending"><i class="fas fa-hourglass-half"></i> Kayıt henüz eklenmedi</span>`;
}

function recordingCard(r, idx) {
    return `
    <div class="recording-card ${r.courseType}">
        <div class="recording-rank">${idx}</div>
        <div class="recording-info">
            <h3>${esc(r.title)}</h3>
            <p class="recording-subject">${esc(r.subject)}</p>
            <div class="recording-meta">
                <span><i class="fas fa-calendar"></i> ${esc(r.date)}</span>
                <span><i class="fas fa-clock"></i> ${r.time}</span>
                <span><i class="fas fa-user"></i> ${esc(r.instructor)}</span>
            </div>
        </div>
        ${recordingBody(r)}
    </div>`;
}

function renderRecordings() {
    const grid = document.getElementById("recordingsGrid");
    const list = getRecordings();

    if (list.length === 0) {
        grid.innerHTML = `
            <div style="grid-column:1/-1;text-align:center;padding:50px 20px;color:var(--text-light);">
                <i class="fas fa-video-slash" style="font-size:3rem;margin-bottom:16px;display:block;"></i>
                <p style="font-size:1.05rem;">Henüz tamamlanmış ders kaydı yok</p>
                <p style="font-size:0.9rem;">Ders bitince kaydı otomatik olarak burada görünecek.</p>
            </div>`;
        return;
    }

    const top5 = list.slice(0, 5);
    grid.innerHTML = top5.map((r, i) => recordingCard(r, i + 1)).join("");
}

function showAllRecordings() {
    const listEl = document.getElementById("allRecordingsList");
    const list = getRecordings();
    document.getElementById("allRecordingsModal").classList.add("active");

    if (list.length === 0) {
        listEl.innerHTML = `<p style="text-align:center;color:var(--text-light);padding:40px 0;">Henüz tamamlanmış ders kaydı yok.</p>`;
        return;
    }
    listEl.innerHTML = list.map((r, i) => recordingCard(r, i + 1)).join("");
}

function closeAllRecordings() { document.getElementById("allRecordingsModal").classList.remove("active"); }

function showDownloadToast(msg, isError) {
    const t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText = "position:fixed;bottom:24px;right:24px;" +
        "background:" + (isError ? "#ef4444" : "#10b981") + ";color:white;padding:14px 24px;border-radius:8px;font-weight:600;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.2);";
    document.body.appendChild(t);
    if (!isError) setTimeout(() => t.remove(), 8000);
}

async function downloadHomeworkFile(url, fileName) {
    let rawUrl = url;
    const m = url.match(/github\.com\/([^\/]+)\/([^\/]+)\/(?:blob|raw)\/([^\/]+)\/(.+)/);
    if (m) rawUrl = "https://raw.githubusercontent.com/" + m[1] + "/" + m[2] + "/" + m[3] + "/" + m[4];

    try {
        showDownloadToast("Dosya indiriliyor, lütfen bekleyin...");
        const res = await fetch(rawUrl);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objUrl;
        a.download = fileName || "odev-dosyasi";
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(objUrl), 10000);
    } catch (e) {
        console.error("Dosya indirme hatası:", e);
        showDownloadToast("İndirme başarısız, dosya yeni sekmede açılıyor...", true);
        window.open(rawUrl, "_blank");
    }
}

function showDetails(id) {
    const item = getScheduleData().find(s => String(s.id) === String(id));
    if (!item) return;
    const modal = document.getElementById("classModal");
    document.getElementById("modalBody").innerHTML = `
        <h3>${esc(item.title)}</h3>
        <div class="modal-detail"><i class="fas fa-user"></i><span><strong>Eğitmen:</strong> ${esc(item.instructor)}</span></div>
        <div class="modal-detail"><i class="fas fa-calendar"></i><span><strong>Gün:</strong> ${esc(item.dayLabel)}</span></div>
        <div class="modal-detail"><i class="fas fa-clock"></i><span><strong>Saat:</strong> ${item.time}</span></div>
        <div class="modal-detail"><i class="fas fa-door-open"></i><span><strong>Sınıf:</strong> ${esc(item.classroom)}</span></div>
        <div class="modal-detail"><i class="fas fa-hourglass-half"></i><span><strong>Süre:</strong> ${esc(item.duration)}</span></div>
        <div class="modal-detail"><i class="fas fa-info-circle"></i><span><strong>Açıklama:</strong> ${esc(item.description)}</span></div>
        <div class="modal-detail"><i class="fas fa-video"></i><span><strong>Microsoft Teams:</strong> <a href="${esc(item.link)}" target="_blank" style="color:var(--primary);text-decoration:underline;font-family:monospace;font-size:0.85rem;">${esc(item.link)}</a></span></div>
        <div class="modal-actions">
            <a href="ders.html?ders=${esc(item.id)}&v=3&entry=student" class="btn btn-secondary"><i class="fas fa-video"></i> Derse Katıl</a>
            <button class="btn btn-details" onclick="closeModal()">Kapat</button>
        </div>`;
    modal.classList.add("active");
}

function closeModal() { document.getElementById("classModal").classList.remove("active"); }

var dashState = {
    currentUser: null,
    calYear: new Date().getFullYear(),
    calMonth: new Date().getMonth()
};

/* Dini bayramlar yıla göre değişir; her tarih için isim listesi */
var religiousHolidays = {
    2025: {
        "3-30": "Ramazan Bayramı (1. Gün)",
        "3-31": "Ramazan Bayramı (2. Gün)",
        "4-1": "Ramazan Bayramı (3. Gün)",
        "6-6": "Kurban Bayramı (1. Gün)",
        "6-7": "Kurban Bayramı (2. Gün)",
        "6-8": "Kurban Bayramı (3. Gün)",
        "6-9": "Kurban Bayramı (4. Gün)"
    },
    2026: {
        "3-20": "Ramazan Bayramı (1. Gün)",
        "3-21": "Ramazan Bayramı (2. Gün)",
        "3-22": "Ramazan Bayramı (3. Gün)",
        "5-27": "Kurban Bayramı (1. Gün)",
        "5-28": "Kurban Bayramı (2. Gün)",
        "5-29": "Kurban Bayramı (3. Gün)",
        "5-30": "Kurban Bayramı (4. Gün)"
    },
    2027: {
        "3-9": "Ramazan Bayramı (1. Gün)",
        "3-10": "Ramazan Bayramı (2. Gün)",
        "3-11": "Ramazan Bayramı (3. Gün)",
        "5-16": "Kurban Bayramı (1. Gün)",
        "5-17": "Kurban Bayramı (2. Gün)",
        "5-18": "Kurban Bayramı (3. Gün)",
        "5-19": "Kurban Bayramı (4. Gün)"
    }
};

var PLAN_URL = FIREBASE_URL + "/_plans.json";
var planCache = null;

function getStudentId() {
    var u = sessionStorage.getItem("siteUser");
    if (!u) return "default";
    var st = cachedData.students.find(s => (s.name + " " + s.surname) === u);
    return st ? st.id : "default";
}

async function loadPlans() {
    try {
        var res = await fetch(PLAN_URL + "?t=" + Date.now(), { cache: "no-store" });
        var json = await res.json();
        planCache = json || {};
    } catch (e) {
        console.warn("Plan yüklenemedi:", e);
        planCache = {};
    }
}

function myPlans() {
    var sid = getStudentId();
    planCache = planCache || {};
    return planCache[sid] || {};
}

function weekKey() {
    var d = new Date();
    var day = d.getDay() || 7;
    var monday = new Date(d);
    monday.setDate(d.getDate() - day + 1);
    var pad = n => String(n).padStart(2, "0");
    return monday.getFullYear() + "-" + pad(monday.getMonth() + 1) + "-" + pad(monday.getDate());
}

async function savePlans() {
    try {
        await fetch(PLAN_URL + "?t=" + Date.now(), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(planCache)
        });
    } catch (e) {
        console.error("Plan kaydedilemedi:", e);
        alert("Plan kaydedilemedi. Veri bağlantısını kontrol edin.");
    }
}

function getTodayDOM() {
    var d = new Date();
    var labels = ["pazar", "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi"];
    return labels[d.getDay()];
}

function todayPlanList() {
    return myPlans()[weekKey()] || {};
}

function showSite() {
    document.getElementById("siteLogin").style.display = "none";
    document.getElementById("siteMain").style.display = "block";
}

function initDashboard() {
    var user = sessionStorage.getItem("siteUser") || "Öğrenci";
    var parts = user.split(" ");
    dashState.currentUser = user;

    var un = document.getElementById("userName");
    if (un) un.textContent = user;
    var av = document.getElementById("userAvatar");
    if (av) av.textContent = (parts[0] || "Ö").charAt(0).toUpperCase();

    var greet = document.getElementById("dashGreeting");
    if (greet) {
        var now = new Date().getHours();
        var g = now < 12 ? "Günaydın" : now < 18 ? "İyi günler" : "İyi akşamlar";
        var nm = (parts[0] || "Öğrenci").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
        greet.innerHTML = g + ", " + nm + ' <span class="wave">👋</span>';
    }
    var ddate = document.getElementById("dashDate");
    if (ddate) {
        var tr = new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        ddate.textContent = tr.charAt(0).toUpperCase() + tr.slice(1);
    }

    dashState.calYear = new Date().getFullYear();
    dashState.calMonth = new Date().getMonth();

    renderView("panel");
    bindNav();
    renderCalendar("calWidget", dashState.calYear, dashState.calMonth);
    renderCalendar("calFull", dashState.calYear, dashState.calMonth);
    renderTodayPlan();
    renderTodayClasses();
    renderRecentHomeworks();

    var logout = document.getElementById("logoutBtn");
    if (logout) logout.addEventListener("click", async () => {
        await siteSessionRelease(cachedData);
        siteSessionClear();
        sessionStorage.removeItem("teacherLogged");
        sessionStorage.removeItem("teacherId");
        sessionStorage.removeItem("teacherName");
        window.location.reload();
    });

    var menu = document.getElementById("menuToggle");
    if (menu) menu.addEventListener("click", () => {
        var sb = document.getElementById("sidebar");
        if (sb) sb.classList.toggle("open");
    });

    var addBtn = document.getElementById("planAddBtn");
    if (addBtn) addBtn.addEventListener("click", addPlanTask);
    var planInput = document.getElementById("planText");
    if (planInput) planInput.addEventListener("keydown", e => { if (e.key === "Enter") addPlanTask(); });

    if (window.location.hash) {
        var v = window.location.hash.replace("#", "");
        if (document.getElementById("view-" + v)) renderView(v);
    }

    setInterval(async () => {
        if (!(await siteSessionIsActive(cachedData))) {
            siteSessionClear();
            window.location.assign("index.html?expired=1");
            return;
        }
        var dv = document.getElementById("view-dersler");
        if (dv && dv.classList.contains("active")) {
            var activeDay = document.querySelector("#scheduleFilter .day-btn.active");
            renderSchedule(activeDay ? activeDay.dataset.day : "tum");
        }
        renderTodayClasses();
    }, 30000);
}

function bindNav() {
    document.querySelectorAll(".side-link[data-view]").forEach(link => {
        link.addEventListener("click", (e) => {
            e.preventDefault();
            var v = link.dataset.view;
            renderView(v);
            var sb = document.getElementById("sidebar");
            if (sb) sb.classList.remove("open");
        });
    });
    document.querySelectorAll("[data-goto]").forEach(btn => {
        btn.addEventListener("click", () => renderView(btn.dataset.goto));
    });
}

function renderView(view) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    var target = document.getElementById("view-" + view);
    if (target) target.classList.add("active");

    document.querySelectorAll(".side-link[data-view]").forEach(l => {
        l.classList.toggle("active", l.dataset.view === view);
    });

    if (view === "takvim") {
        renderCalendar("calFull", dashState.calYear, dashState.calMonth);
    }
    if (view === "plan") {
        renderPlanList();
    }
    if (view === "dersler") {
        renderSchedule();
        bindScheduleFilter();
    }
    if (view === "kayitlar") {
        renderRecordings();
        var allBtn = document.getElementById("allRecordingsBtn");
        if (allBtn && !allBtn._bound) { allBtn.addEventListener("click", showAllRecordings); allBtn._bound = true; }
        var allClose = document.getElementById("allRecordingsClose");
        if (allClose && !allClose._bound) { allClose.addEventListener("click", closeAllRecordings); allClose._bound = true; }
        var allModal = document.getElementById("allRecordingsModal");
        if (allModal && !allModal._bound) { allModal.addEventListener("click", e => { if (e.target.id === "allRecordingsModal") closeAllRecordings(); }); allModal._bound = true; }
    }
    if (view === "odevler") renderHomework();
}

function bindScheduleFilter() {
    document.querySelectorAll("#scheduleFilter .day-btn").forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener("click", () => {
            document.querySelectorAll("#scheduleFilter .day-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            renderSchedule(btn.dataset.day);
        });
    });
}

function getClassDays() {
    var set = {};
    (cachedData.classes || []).forEach(c => {
        if (c.date) set[c.date] = true;
    });
    return set;
}

function specialFor(dateStr) {
    var p = dateStr.split("-");
    var y = parseInt(p[0], 10), m = parseInt(p[1], 10), d = parseInt(p[2], 10);
    var md = m + "-" + d;

    var fixed = {
        "1-1": "Yılbaşı",
        "4-23": "Ulusal Egemenlik ve Çocuk Bayramı",
        "5-1": "Emek ve Dayanışma Günü",
        "5-19": "Atatürk'ü Anma, Gençlik ve Spor Bayramı",
        "7-15": "Demokrasi ve Milli Birlik Günü",
        "8-30": "Zafer Bayramı",
        "10-29": "Cumhuriyet Bayramı"
    };

    var label = fixed[md] || null;
    if (!label && religiousHolidays[y]) label = religiousHolidays[y][md] || null;
    return label;
}

function renderCalendar(containerId, year, month) {
    var el = document.getElementById(containerId);
    if (!el) return;
    var firstDay = new Date(year, month, 1);
    var startDow = firstDay.getDay();
    var gridStartDow = startDow === 0 ? 6 : startDow - 1;
    var dim = new Date(year, month + 1, 0).getDate();
    var prevDim = new Date(year, month, 0).getDate();
    var pad = n => String(n).padStart(2, "0");
    var dows = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];
    var classDays = getClassDays();
    var today = new Date();
    var todayStr = today.getFullYear() + "-" + pad(today.getMonth() + 1) + "-" + pad(today.getDate());

    var html = '<div class="cal-head"><button class="cal-nav" data-prev="1" data-cal="' + containerId + '"><i class="fas fa-chevron-left"></i></button>';
    html += '<strong>' + firstDay.toLocaleDateString("tr-TR", { month: "long", year: "numeric" }) + '</strong>';
    html += '<button class="cal-nav" data-next="1" data-cal="' + containerId + '"><i class="fas fa-chevron-right"></i></button></div>';

    html += '<div class="cal-grid">';
    dows.forEach(d => { html += '<div class="cal-dow">' + d + '</div>'; });

    for (var i = gridStartDow - 1; i >= 0; i--) {
        var pv = prevDim - i;
        html += '<div class="cal-day other">' + pv + '</div>';
    }
    for (var d = 1; d <= dim; d++) {
        var ds = year + "-" + pad(month + 1) + "-" + pad(d);
        var cls = [];
        if (ds === todayStr) cls.push("today");
        if (classDays[ds]) cls.push("hasclass");
        var sp = specialFor(ds);
        if (sp) cls.push("special");
        html += '<div class="cal-day ' + cls.join(" ") + '"' + (sp ? ' data-tip="' + sp + '"' : '') + ' title="' + (sp || "") + '">' + d + '</div>';
    }
    var after = (7 - ((gridStartDow + dim) % 7)) % 7;
    for (var j = 1; j <= after; j++) {
        html += '<div class="cal-day other">' + j + '</div>';
    }
    html += '</div>';

    html += '<div class="cal-legend">';
    html += '<span class="lg"><i style="background:#3b82f6;"></i> Ders günü</span>';
    html += '<span class="lg"><i style="background:#fdba74;"></i> Özel gün</span>';
    html += '</div>';

    el.innerHTML = html;

    el.querySelectorAll('[data-prev]').forEach(b => {
        b.addEventListener("click", () => {
            var m = dashState.calMonth - 1, y = dashState.calYear;
            if (m < 0) { m = 11; y--; }
            dashState.calMonth = m; dashState.calYear = y;
            renderCalendar("calWidget", y, m);
            renderCalendar("calFull", y, m);
        });
    });
    el.querySelectorAll('[data-next]').forEach(b => {
        b.addEventListener("click", () => {
            var m = dashState.calMonth + 1, y = dashState.calYear;
            if (m > 11) { m = 0; y++; }
            dashState.calMonth = m; dashState.calYear = y;
            renderCalendar("calWidget", y, m);
            renderCalendar("calFull", y, m);
        });
    });
}

function addPlanTask() {
    var daySel = document.getElementById("planDay");
    var txt = document.getElementById("planText");
    var day = daySel.value;
    var text = (txt.value || "").trim();
    if (!text) { txt.focus(); return; }

    var wk = weekKey();
    var all = myPlans();
    if (!all[wk]) all[wk] = {};
    var weekMap = {};
    var labels = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];
    labels.forEach(l => { weekMap[l] = l === day ? wk : wk; });
    if (!all[weekMap[day]]) all[weekMap[day]] = {};
    var dayTasks = all[weekMap[day]][day] || [];
    dayTasks.push({ id: Date.now().toString(), text: text, done: false });
    all[weekMap[day]][day] = dayTasks;

    planCache[getStudentId()] = all;
    txt.value = "";

    savePlans().then(() => {
        renderPlanList();
        renderTodayPlan();
    });
}

function renderTodayPlan() {
    var el = document.getElementById("todayPlan");
    var empty = document.getElementById("todayPlanEmpty");
    if (!el) return;
    var today = getTodayDOM();
    var wk = weekKey();
    var tasks = (myPlans()[wk] || {})[today] || [];

    if (tasks.length === 0) {
        el.innerHTML = "";
        if (empty) empty.style.display = "block";
        return;
    }
    if (empty) empty.style.display = "none";
    var done = tasks.filter(t => t.done).length;
    var html = '<div class="plan-progress"><div style="width:' + (tasks.length ? Math.round(done / tasks.length * 100) : 0) + '%"></div></div>';
    html += tasks.map((t, i) => `
        <div class="today-task ${t.done ? 'done' : ''}">
            <span class="t-check ${t.done ? 'checked' : ''}" onclick="toggleTodayTask(${i})"><i class="fas fa-check"></i></span>
            <span class="t-text">${esc(t.text)}</span>
            <span class="plan-del" onclick="deleteTodayTask(${i})"><i class="fas fa-trash"></i></span>
        </div>`).join("");
    el.innerHTML = html;
}

function toggleTodayTask(idx) {
    var today = getTodayDOM();
    var wk = weekKey();
    var tasks = (myPlans()[wk] || {})[today] || [];
    if (!tasks[idx]) return;
    tasks[idx].done = !tasks[idx].done;
    savePlans().then(() => { renderTodayPlan(); renderPlanList(); });
}

function deleteTodayTask(idx) {
    var today = getTodayDOM();
    var wk = weekKey();
    var pl = myPlans();
    var tasks = (pl[wk] || {})[today] || [];
    tasks.splice(idx, 1);
    if (pl[wk]) pl[wk][today] = tasks;
    savePlans().then(() => { renderTodayPlan(); renderPlanList(); });
}

function renderPlanList() {
    var el = document.getElementById("planList");
    if (!el) return;
    var wk = weekKey();
    var pl = myPlans()[wk] || {};
    var dayDom = getTodayDOM();
    var labels = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];

    var html = "";
    labels.forEach(day => {
        var tasks = pl[day] || [];
        if (tasks.length === 0) return;
        var isToday = day === dayDom;
        html += '<div class="plan-day-label">' + dayLabels[day] + (isToday ? ' <span style="font-weight:400;color:var(--primary)">(bugün)</span>' : '') + '</div>';
        html += '<div class="plan-list">';
        tasks.forEach((t, i) => {
            html += `<div class="plan-item ${t.done ? 'done' : ''}">
                <span class="plan-check ${t.done ? 'checked' : ''}" onclick="togglePlanTask('${day}', ${i})"><i class="fas fa-check"></i></span>
                <span class="plan-text">${esc(t.text)}</span>
                <span class="plan-del" onclick="deletePlanTask('${day}', ${i})"><i class="fas fa-trash"></i></span>
            </div>`;
        });
        html += '</div>';
    });

    if (!html) {
        el.innerHTML = '<p class="plan-empty">Bu hafta için planınız yok. Yukarıdan görev ekleyin.</p>';
    } else {
        el.innerHTML = html;
    }
}

function togglePlanTask(day, idx) {
    var wk = weekKey();
    var pl = myPlans();
    var tasks = (pl[wk] || {})[day] || [];
    if (!tasks[idx]) return;
    tasks[idx].done = !tasks[idx].done;
    savePlans().then(() => { renderPlanList(); renderTodayPlan(); });
}

function deletePlanTask(day, idx) {
    var wk = weekKey();
    var pl = myPlans();
    var tasks = (pl[wk] || {})[day] || [];
    tasks.splice(idx, 1);
    if (pl[wk]) pl[wk][day] = tasks;
    savePlans().then(() => { renderPlanList(); renderTodayPlan(); });
}

function renderTodayClasses() {
    var el = document.getElementById("todayClasses");
    var empty = document.getElementById("todayClassesEmpty");
    if (!el) return;
    var today = getTodayDOM();
    var items = getScheduleData().filter(s => s.day === today && s.liveState !== "past");
    if (items.length === 0) {
        el.innerHTML = "";
        if (empty) empty.style.display = "block";
        return;
    }
    if (empty) empty.style.display = "none";
    el.innerHTML = items.map(s => {
        var action = s.liveState === "live"
            ? `<button onclick="joinClass('${jsEsc(s.link)}', '${jsEsc(s.id)}')"><i class="fas fa-play"></i> Katıl</button>`
            : `<span class="tc-pending"><i class="fas fa-hourglass-half"></i> Henüz başlamadı</span>`;
        return `
        <div class="today-class">
            <div class="tc-icon"><i class="fas fa-video"></i></div>
            <div class="tc-info"><strong>${esc(s.title)}</strong><span>${s.time} · ${esc(s.instructor)}</span></div>
            ${action}
        </div>`;
    }).join("");
}

function renderRecentHomeworks() {
    var el = document.getElementById("recentHomeworks");
    var empty = document.getElementById("homeworksEmpty");
    if (!el) return;
    var hw = (cachedData.homeworks || []).slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3);
    if (hw.length === 0) {
        el.innerHTML = "";
        if (empty) empty.style.display = "block";
        return;
    }
    if (empty) empty.style.display = "none";
    el.innerHTML = hw.map(h => `
        <div class="mini-hw" onclick="showHomeWorkDetail('${jsEsc(h.title)}', '${jsEsc(h.description || "")}', '${jsEsc(h.fileUrl || "")}')">
            <div class="mh-icon"><i class="fas ${h.fileType === "pdf" ? "fa-file-pdf" : h.fileType === "word" ? "fa-file-word" : "fa-file-alt"}"></i></div>
            <div class="mh-info"><strong>${esc(h.title)}</strong><span>${esc(h.subject || "")} · ${esc(h.createdAt || "")}</span></div>
        </div>`).join("");
}

function showHomeWorkDetail(title, desc, url) {
    var modal = document.getElementById("classModal");
    document.getElementById("modalBody").innerHTML = `
        <h3>${esc(title)}</h3>
        <div class="modal-detail"><i class="fas fa-info-circle"></i><span>${esc(desc || "Açıklama yok")}</span></div>
        ${url ? `<a class="btn btn-primary" href="${esc(url)}" target="_blank" rel="noopener"><i class="fas fa-external-link-alt"></i> Dosyayı Gör</a>` : ""}
        <div class="modal-actions"><button class="btn btn-details" onclick="closeModal()">Kapat</button></div>`;
    modal.classList.add("active");
}

function initSite() {
    renderSchedule();
    renderRecordings();
    renderHomework();
    initDashboard();
    loadPlans().then(() => {
        renderTodayPlan();
        renderPlanList();
    });

    var menuToggle = document.getElementById("menuToggle");
    if (menuToggle) {
        menuToggle.addEventListener("click", () => document.querySelector(".nav")?.classList.toggle("active"));
    }

    var allBtn = document.getElementById("allRecordingsBtn");
    if (allBtn) allBtn.addEventListener("click", showAllRecordings);
    var allClose = document.getElementById("allRecordingsClose");
    if (allClose) allClose.addEventListener("click", closeAllRecordings);
    var allModal = document.getElementById("allRecordingsModal");
    if (allModal) allModal.addEventListener("click", (e) => { if (e.target.id === "allRecordingsModal") closeAllRecordings(); });

    var modalClose = document.getElementById("modalClose");
    if (modalClose) modalClose.addEventListener("click", closeModal);
    var classModal = document.getElementById("classModal");
    if (classModal) classModal.addEventListener("click", (e) => { if (e.target.id === "classModal") closeModal(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") { closeModal(); closeAllRecordings(); } });
    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => document.querySelector(".nav")?.classList.remove("active"));
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadData();

    const q = new URLSearchParams(window.location.search);
    if (q.get("expired") === "1" && document.getElementById("siteErrorMsg")) {
        document.getElementById("siteErrorMsg").textContent = "Oturum süreniz doldu veya başka bir cihazdan giriş yapıldı. Lütfen tekrar giriş yapın.";
    }

    if (sessionStorage.getItem("siteLogged") === "true") {
        const active = await siteSessionIsActive(cachedData);
        if (active) {
            sessionStorage.removeItem("teacherLogged");
            sessionStorage.removeItem("teacherId");
            sessionStorage.removeItem("teacherName");
            showSite();
            initSite();
            return;
        }
        siteSessionClear();
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
                sessionStorage.removeItem("teacherLogged");
                sessionStorage.removeItem("teacherId");
                sessionStorage.removeItem("teacherName");
                sessionStorage.setItem("siteLogged", "true");
                sessionStorage.setItem("siteUser", student.name + " " + student.surname);
                sessionStorage.setItem("siteLoginAt", String(Date.now()));
                sessionStorage.setItem("siteToken", "dev" + Date.now().toString(36) + Math.random().toString(36).substr(2, 8));
                errorMsg.textContent = "";
                siteSessionWrite(cachedData);
                showSite();
                initSite();
            } else {
                errorMsg.textContent = "Kullanıcı adı veya şifre hatalı!";
            }
        });
    }
});
