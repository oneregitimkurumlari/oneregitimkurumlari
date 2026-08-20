const scheduleData = [
    {
        id: 1,
        title: "Matematik - Türev",
        instructor: "Dr. Ahmet Yılmaz",
        day: "pazartesi",
        dayLabel: "Pazartesi",
        time: "09:00 - 10:30",
        classroom: "A-101",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "math",
        description: "Türev kavramı, kuralları ve uygulamaları",
        link: "https://meet.google.com/gvf-csrk-mid",
        students: 32,
        duration: "90 dk"
    },
    {
        id: 2,
        title: "Fizik - Kuvvet ve Hareket",
        instructor: "Prof. Mehmet Kaya",
        day: "pazartesi",
        dayLabel: "Pazartesi",
        time: "11:00 - 12:30",
        classroom: "B-202",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "physics",
        description: "Newton yasaları ve hareket denklemleri",
        link: "https://meet.google.com/tpy-gcfb-tnq",
        students: 28,
        duration: "90 dk"
    },
    {
        id: 3,
        title: "Biyoloji - Hücre Biyolojisi",
        instructor: "Dr. Fatma Demir",
        day: "pazartesi",
        dayLabel: "Pazartesi",
        time: "14:00 - 15:30",
        classroom: "C-303",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "biology",
        description: "Hücre yapısı ve organelleri",
        link: "https://meet.google.com/qkk-bhdd-ene",
        students: 35,
        duration: "90 dk"
    },
    {
        id: 4,
        title: "Kimya - Periyodik Tablo",
        instructor: "Dr. Ali Çelik",
        day: "sali",
        dayLabel: "Salı",
        time: "09:00 - 10:30",
        classroom: "A-102",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "chemistry",
        description: "Elementler ve periyodik özellikler",
        link: "https://meet.google.com/vtm-huvd-dmo",
        students: 30,
        duration: "90 dk"
    },
    {
        id: 5,
        title: "İngilizce - Grammar",
        instructor: "Sarah Johnson",
        day: "sali",
        dayLabel: "Salı",
        time: "11:00 - 12:30",
        classroom: "D-104",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "english",
        description: "Present tenses ve Usage",
        link: "https://meet.google.com/wzh-qfbq-oxh",
        students: 25,
        duration: "90 dk"
    },
    {
        id: 6,
        title: "Tarih - Osmanlı Tarihi",
        instructor: "Prof. Hasan Özkan",
        day: "sali",
        dayLabel: "Salı",
        time: "14:00 - 15:30",
        classroom: "B-201",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "history",
        description: "Osmanlı Devleti'nin kuruluşu ve yükselişi",
        link: "https://meet.google.com/oyd-rjou-xih",
        students: 40,
        duration: "90 dk"
    },
    {
        id: 7,
        title: "Matematik - İntegral",
        instructor: "Dr. Ahmet Yılmaz",
        day: "carsamba",
        dayLabel: "Çarşamba",
        time: "09:00 - 10:30",
        classroom: "A-101",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "math",
        description: "Belirsiz ve belirli integral",
        link: "https://meet.google.com/gvf-csrk-mid",
        students: 32,
        duration: "90 dk"
    },
    {
        id: 8,
        title: "Bilgisayar - Python Programlama",
        instructor: "Eng. Zeynep Arslan",
        day: "carsamba",
        dayLabel: "Çarşamba",
        time: "11:00 - 12:30",
        classroom: "E-Lab",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "computer",
        description: "Python'a giriş ve temel kavramlar",
        link: "https://meet.google.com/zqb-xwom-lvv",
        students: 22,
        duration: "90 dk"
    },
    {
        id: 9,
        title: "Fizik - Elektrik ve Manyetizma",
        instructor: "Prof. Mehmet Kaya",
        day: "persembe",
        dayLabel: "Perşembe",
        time: "09:00 - 10:30",
        classroom: "B-202",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "physics",
        description: "Elektriksel alan ve potansiyel",
        link: "https://meet.google.com/tpy-gcfb-tnq",
        students: 28,
        duration: "90 dk"
    },
    {
        id: 10,
        title: "İngilizce - Speaking",
        instructor: "Sarah Johnson",
        day: "persembe",
        dayLabel: "Perşembe",
        time: "11:00 - 12:30",
        classroom: "D-104",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "english",
        description: "Günlük konuşma pratiği",
        link: "https://meet.google.com/wzh-qfbq-oxh",
        students: 20,
        duration: "90 dk"
    },
    {
        id: 11,
        title: "Kimya - Organik Kimya",
        instructor: "Dr. Ali Çelik",
        day: "cuma",
        dayLabel: "Cuma",
        time: "09:00 - 10:30",
        classroom: "A-102",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "chemistry",
        description: "Karbon bileşikleri ve reaksiyonları",
        link: "https://meet.google.com/vtm-huvd-dmo",
        students: 30,
        duration: "90 dk"
    },
    {
        id: 12,
        title: "Biyoloji - Genetik",
        instructor: "Dr. Fatma Demir",
        day: "cuma",
        dayLabel: "Cuma",
        time: "14:00 - 15:30",
        classroom: "C-303",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "biology",
        description: "Genetik kod ve kalıtım",
        link: "https://meet.google.com/qkk-bhdd-ene",
        students: 35,
        duration: "90 dk"
    },
    {
        id: 13,
        title: "Matematik - Olasılık",
        instructor: "Dr. Ahmet Yılmaz",
        day: "cumartesi",
        dayLabel: "Cumartesi",
        time: "10:00 - 12:00",
        classroom: "A-101",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "math",
        description: "Olasılık kuramı ve istatistik",
        link: "https://meet.google.com/gvf-csrk-mid",
        students: 32,
        duration: "120 dk"
    },
    {
        id: 14,
        title: "Bilgisayar - Web Tasarım",
        instructor: "Eng. Zeynep Arslan",
        day: "cumartesi",
        dayLabel: "Cumartesi",
        time: "13:00 - 15:00",
        classroom: "E-Lab",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "computer",
        description: "HTML, CSS ve JavaScript",
        link: "https://meet.google.com/zqb-xwom-lvv",
        students: 18,
        duration: "120 dk"
    },
    {
        id: 15,
        title: "Matematik - Geometri",
        instructor: "Dr. Ahmet Yılmaz",
        day: "pazar",
        dayLabel: "Pazar",
        time: "10:00 - 12:00",
        classroom: "A-101",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "math",
        description: "Dik üçgenler ve trigonometri",
        link: "https://meet.google.com/gvf-csrk-mid",
        students: 28,
        duration: "120 dk"
    },
    {
        id: 16,
        title: "Fizik - Optik",
        instructor: "Prof. Mehmet Kaya",
        day: "pazar",
        dayLabel: "Pazar",
        time: "13:00 - 15:00",
        classroom: "B-202",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "physics",
        description: "Işık ve optik olayları",
        link: "https://meet.google.com/tpy-gcfb-tnq",
        students: 25,
        duration: "120 dk"
    },
    {
        id: 17,
        title: "İngilizce - Writing",
        instructor: "Sarah Johnson",
        day: "pazar",
        dayLabel: "Pazar",
        time: "15:00 - 17:00",
        classroom: "D-104",
        type: "Canlı Ders",
        status: "upcoming",
        courseType: "english",
        description: "Kompozisyon ve yazma teknikleri",
        link: "https://meet.google.com/wzh-qfbq-oxh",
        students: 22,
        duration: "120 dk"
    }
];

const courses = [
    { name: "Matematik", icon: "fa-square-root-variable", desc: "Lise ve üniversite seviyesinde matematik eğitimi", lessons: 48, students: 150 },
    { name: "Fizik", icon: "fa-atom", desc: "Temel ve ileri fizik konuları", lessons: 36, students: 95 },
    { name: "Biyoloji", icon: "fa-dna", desc: "Yaşam bilimleri ve uygulamaları", lessons: 32, students: 85 },
    { name: "Kimya", icon: "fa-flask", desc: "Analitik ve organik kimya", lessons: 36, students: 90 },
    { name: "İngilizce", icon: "fa-language", desc: "Gramer, konuşma ve yazma", lessons: 40, students: 120 },
    { name: "Bilgisayar", icon: "fa-code", desc: "Programlama ve yazılım geliştirme", lessons: 44, students: 75 }
];

const statusMap = {
    live: { label: "Canlı", class: "status-live" },
    upcoming: { label: "Yaklaşıyor", class: "status-upcoming" },
    finished: { label: "Bitti", class: "status-finished" }
};

function renderSchedule(filter = "tum") {
    const grid = document.getElementById("scheduleGrid");
    const filtered = filter === "tum" ? scheduleData : scheduleData.filter(s => s.day === filter);

    grid.innerHTML = filtered.map(item => `
        <div class="schedule-card ${item.courseType}" data-id="${item.id}">
            <div class="schedule-header">
                <span class="schedule-day">${item.dayLabel}</span>
                <span class="schedule-status ${statusMap[item.status].class}">${statusMap[item.status].label}</span>
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
                <button class="schedule-btn btn-details" onclick="showDetails(${item.id})">
                    Detay
                </button>
            </div>
        </div>
    `).join("");
}

function renderCourses() {
    const grid = document.getElementById("coursesGrid");
    grid.innerHTML = courses.map(c => `
        <div class="course-card">
            <div class="course-icon">
                <i class="fas ${c.icon}"></i>
            </div>
            <h3>${c.name}</h3>
            <p>${c.desc}</p>
            <div class="course-meta">
                <span><i class="fas fa-book"></i> ${c.lessons} Seans</span>
                <span><i class="fas fa-users"></i> ${c.students} Öğrenci</span>
            </div>
        </div>
    `).join("");
}

function joinClass(link) {
    window.open(link, "_blank");
}

function showDetails(id) {
    const item = scheduleData.find(s => s.id === id);
    if (!item) return;

    const modal = document.getElementById("classModal");
    const body = document.getElementById("modalBody");

    body.innerHTML = `
        <h3>${item.title}</h3>
        <div class="modal-detail">
            <i class="fas fa-user"></i>
            <span><strong>Eğitmen:</strong> ${item.instructor}</span>
        </div>
        <div class="modal-detail">
            <i class="fas fa-calendar"></i>
            <span><strong>Gün:</strong> ${item.dayLabel}</span>
        </div>
        <div class="modal-detail">
            <i class="fas fa-clock"></i>
            <span><strong>Saat:</strong> ${item.time}</span>
        </div>
        <div class="modal-detail">
            <i class="fas fa-door-open"></i>
            <span><strong>Sınıf:</strong> ${item.classroom}</span>
        </div>
        <div class="modal-detail">
            <i class="fas fa-users"></i>
            <span><strong>Katılımcı:</strong> ${item.students} öğrenci</span>
        </div>
        <div class="modal-detail">
            <i class="fas fa-hourglass-half"></i>
            <span><strong>Süre:</strong> ${item.duration}</span>
        </div>
        <div class="modal-detail">
            <i class="fas fa-info-circle"></i>
            <span><strong>Açıklama:</strong> ${item.description}</span>
        </div>
        <div class="modal-detail">
            <i class="fas fa-video"></i>
            <span><strong>Google Meet:</strong> <a href="${item.link}" target="_blank" style="color: var(--primary); text-decoration: underline; font-family: monospace; font-size: 0.85rem;">${item.link}</a></span>
        </div>
        <div class="modal-actions">
            <a href="${item.link}" target="_blank" class="btn btn-secondary">
                <i class="fas fa-video"></i> Derse Katıl
            </a>
            <button class="btn btn-details" onclick="closeModal()">Kapat</button>
        </div>
    `;

    modal.classList.add("active");
}

function closeModal() {
    document.getElementById("classModal").classList.remove("active");
}

document.addEventListener("DOMContentLoaded", () => {
    renderSchedule();
    renderCourses();

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

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") closeModal();
    });

    document.querySelectorAll(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            document.querySelector(".nav").classList.remove("active");
        });
    });
});
