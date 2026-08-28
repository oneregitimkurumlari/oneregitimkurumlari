const FIREBASE_URL = "https://one-egitim-default-rtdb.firebaseio.com";
const DATA_URL = FIREBASE_URL + "/.json";

let remoteData = { teachers: [], classes: [], students: [], homeworks: [] };
let deletedIds = { teachers: new Set(), classes: new Set(), students: new Set(), homeworks: new Set() };

let recState = { recording: false, classId: null, mediaRecorder: null, chunks: [], stream: null, startedAt: null };

const REC_CHUNK_SIZE = 3000000;

function firebasePut(path, obj) {
    return fetchWithTimeout(FIREBASE_URL + "/" + path + ".json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    }, 30000);
}

function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(",")[1] || "");
        fr.onerror = reject;
        fr.readAsDataURL(blob);
    });
}

async function uploadRecordingToRepo(blob, classId, stamp) {
    const fname = "rec_" + stamp + ".webm";
    const b64 = await blobToBase64(blob);
    const totalChunks = Math.max(1, Math.ceil(b64.length / REC_CHUNK_SIZE));
    for (let i = 0; i < totalChunks; i++) {
        const part = b64.slice(i * REC_CHUNK_SIZE, (i + 1) * REC_CHUNK_SIZE);
        const res = await firebasePut("rec_pending/" + stamp + "/c" + String(i).padStart(3, "0"), { d: part });
        if (!res.ok) throw new Error("Parça yüklenemedi (HTTP " + res.status + ")");
    }
    const res = await firebasePut("rec_pending/" + stamp + "/meta", {
        stamp: String(stamp), fname: fname, totalChunks: totalChunks,
        classId: classId, status: "pending", created: new Date().toISOString()
    });
    if (!res.ok) throw new Error("Meta yazılamadı (HTTP " + res.status + ")");
    return "pending:" + stamp;
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
let currentTeacher = null;

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
        const res = await fetchWithTimeout(DATA_URL + "?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) throw new Error("Veri okunamadı");
        const json = await res.json();
        remoteData.teachers = json.teachers || [];
        remoteData.classes = json.classes || [];
        remoteData.students = json.students || [];
        remoteData.homeworks = json.homeworks || [];
        deletedIds = { teachers: new Set(), classes: new Set(), students: new Set(), homeworks: new Set() };
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

        const payload = {
            teachers: remoteData.teachers,
            classes: remoteData.classes,
            students: remoteData.students,
            homeworks: remoteData.homeworks
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

        deletedIds = { teachers: new Set(), classes: new Set(), students: new Set(), homeworks: new Set() };
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

    if (sessionStorage.getItem("teacherLogged") === "true") {
        const teacherId = sessionStorage.getItem("teacherId");
        const teacherName = sessionStorage.getItem("teacherName");
        loginScreen.style.display = "none";
        adminPanel.classList.add("active");
        document.getElementById("teacherInfo").textContent = teacherName || "Öğretmen";
        (async () => {
            await fetchRemoteData();
            initPanel(teacherId);
        })();
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const u = document.getElementById("username").value.trim();
        const p = document.getElementById("password").value;

        const loading = document.createElement("div");
        loading.style.cssText = "position:fixed;inset:0;background:rgba(255,255,255,0.9);z-index:9999;display:flex;align-items:center;justify-content:center;font-size:1.1rem;";
        loading.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right:12px;"></i> Giriş yapılıyor...';
        document.body.appendChild(loading);

        await fetchRemoteData();
        loading.remove();

        const teacher = remoteData.teachers.find(t => t.username === u && t.password === p);
        if (teacher) {
            sessionStorage.setItem("teacherLogged", "true");
            sessionStorage.setItem("teacherId", teacher.id);
            sessionStorage.setItem("teacherName", teacher.name + " " + teacher.surname);
            loginScreen.style.display = "none";
            adminPanel.classList.add("active");
            document.getElementById("teacherInfo").textContent = teacher.name + " " + teacher.surname;
            initPanel(teacher.id);
        } else {
            errorMsg.textContent = "Kullanıcı adı veya şifre hatalı!";
        }
    });

    document.getElementById("logoutBtn").addEventListener("click", () => {
        sessionStorage.removeItem("teacherLogged");
        sessionStorage.removeItem("teacherId");
        sessionStorage.removeItem("teacherName");
        location.reload();
    });

    async function initPanel(teacherId) {
        await fetchRemoteData();
        currentTeacher = teacherId;

        renderClasses(teacherId);
        renderHomework(teacherId);
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

    function renderClasses(teacherId) {
        const tbody = document.getElementById("classTable");
        const empty = document.getElementById("emptyClasses");
        let classes = remoteData.classes.filter(c => c.teacherId === teacherId);

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

        tbody.innerHTML = classes.map((c, i) => `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${c.title}</strong><br><small style="color:var(--text-light);">${c.description || ""}</small></td>
                <td>${dayLabels[c.day] || c.day}</td>
                <td>${formatDate(c.date)}</td>
                <td>${formatTime(c.startTime, c.endTime)}</td>
                <td>${c.meetLink ? '<a href="' + c.meetLink + '" target="_blank" class="meet-link">' + c.meetLink + '</a>' : '<span style="color:var(--text-light);font-size:0.8rem;">—</span>'}</td>
                <td class="actions-cell">
                    <button class="btn-edit" onclick="editClass('${c.id}')"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete" onclick="deleteClass('${c.id}')"><i class="fas fa-trash"></i></button>
                    <a href="ders.html?ders=${c.id}&v=2" class="btn-record"><i class="fas fa-record-vinyl"></i> Derse Başla</a>
                </td>
            </tr>
        `).join("");
    }

    document.getElementById("filterDay").addEventListener("change", () => renderClasses(currentTeacher));
    document.getElementById("searchClass").addEventListener("input", () => renderClasses(currentTeacher));

    document.getElementById("addClassBtn").addEventListener("click", () => {
        document.getElementById("classForm").style.display = "block";
        document.getElementById("classFormTitle").textContent = "Yeni Canlı Ders Ekle";
        document.getElementById("classFormEl").reset();
        document.getElementById("editClassId").value = "";
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
            teacherId: currentTeacher,
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

        const teacher = remoteData.teachers.find(t => t.id === currentTeacher);
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
            renderClasses(currentTeacher);
            document.getElementById("classForm").style.display = "none";
        }
    });

    window.editClass = function(id) {
        const c = remoteData.classes.find(x => x.id === id);
        if (!c) return;
        document.getElementById("classForm").style.display = "block";
        document.getElementById("classFormTitle").textContent = "Dersi Düzenle";
        document.getElementById("editClassId").value = c.id;
        document.getElementById("className").value = c.title;
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
                renderClasses(currentTeacher);
                showToast("Ders silindi!");
            }
        });
    };

    function renderHomework(teacherId) {
        const tbody = document.getElementById("homeworkTable");
        const empty = document.getElementById("emptyHomework");
        const homeworks = (remoteData.homeworks || []).filter(h => h.teacherId === teacherId || h.teacherId === "");

        if (homeworks.length === 0) {
            tbody.innerHTML = "";
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        tbody.innerHTML = homeworks.map((h, i) => {
            const fileIcon = h.fileType === "pdf" ? "fa-file-pdf" : h.fileType === "word" ? "fa-file-word" : h.fileType === "excel" ? "fa-file-excel" : "fa-file";
            const fileLink = h.fileUrl ? `<a href="${h.fileUrl}" target="_blank" style="color:var(--primary);"><i class="fas ${fileIcon}"></i> ${h.fileName || "Dosya"}</a>` : `<span style="color:var(--text-light);">-</span>`;
            return `
            <tr>
                <td>${i + 1}</td>
                <td><strong>${h.title}</strong></td>
                <td>${h.subject}</td>
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
            teacherId: currentTeacher
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
            renderHomework(currentTeacher);
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
                renderHomework(currentTeacher);
                showToast("Ödev silindi!");
            }
        });
    };
});

/* ============ Ders Kayıt Sistemi (Ekran Kaydı) ============ */
function findClass(id) {
    return (remoteData.classes || []).find(c => c.id === id);
}

window.startLiveClass = async function(id) {
    const cls = findClass(id);
    if (!cls) { showToast("Ders bulunamadı!", true); return; }

    if (recState.recording) {
        showToast("Zaten kayıt devam ediyor. Önce mevcut kaydı bitirin.", true);
        return;
    }

    // Meet linkini yeni sekmede aç
    if (cls.meetLink) window.open(cls.meetLink, "_blank");

    try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        recState.stream = stream;
        recState.classId = id;
        recState.chunks = [];
        recState.startedAt = Date.now();

        const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9"
            : MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
        const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
        recState.mediaRecorder = mr;
        mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recState.chunks.push(e.data); };
        mr.onstop = () => { uploadAndFinishRecording(); };
        mr.start(1000);

        recState.recording = true;
        document.getElementById("recordingPanel").style.display = "flex";
        document.getElementById("recordingDetail").textContent = cls.title + " - " + (cls.description || "");
        document.getElementById("recordingStatus").querySelector("span").textContent = "Kayıt Başladı";
        document.getElementById("recordingPanel").scrollIntoView({ behavior: "smooth" });

        stream.getVideoTracks()[0].addEventListener("ended", () => {
            if (recState.recording && recState.mediaRecorder) {
                recState.mediaRecorder.stop();
            }
        });

        showToast("Kayıt başladı. Ders bitince 'Dersi Bitir' demeyi unutmayın.");
    } catch (err) {
        console.error("Ekran kaydı başlatılamadı:", err);
        showToast("Ekran kaydı başlatılamadı. Tarayıcı izni verdiğinizden emin olun.", true);
        if (recState.stream) { recState.stream.getTracks().forEach(t => t.stop()); }
    }
};

document.addEventListener("DOMContentLoaded", function () {
    var stopBtn = document.getElementById("stopRecordBtn");
    if (stopBtn) stopBtn.addEventListener("click", stopLiveClass);
});

window.stopLiveClass = function() {
    if (!recState.recording || !recState.mediaRecorder) { showToast("Aktif kayıt yok.", true); return; }
    document.getElementById("recordingStatus").querySelector("span").textContent = "Kayıt durduruluyor & yükleniyor...";
    recState.mediaRecorder.stop();
};

async function uploadAndFinishRecording() {
    const cls = findClass(recState.classId);
    const blob = new Blob(recState.chunks, { type: "video/webm" });
    const classId = recState.classId;
    const startedTime = new Date(recState.startedAt);

    // stream tüm parçalarını durdur
    if (recState.stream) recState.stream.getTracks().forEach(t => t.stop());
    recState.recording = false;

    // Kayıt sıfırla (UI'da uploading göstermek için daha sonra paneli gizle)
    recordStopUI(classId);

    if (!cls || blob.size < 1000) {
        showToast("Kayıt dosyası boş, yüklenmedi.", true);
        return;
    }

    showUploading(classId);

    try {
        const stamp = startedTime.getTime();
        const fname = "kayit_" + stamp + ".webm";

        hideUploading();

        let recordingUrl = null;
        try {
            recordingUrl = await uploadRecordingToRepo(blob, classId, stamp);
            console.log("Kayıt işleme kuyruğuna alındı:", recordingUrl);
        } catch (err) {
            console.warn("base64 yükleme hatası:", err.message, "→ gofile deneniyor.");
        }

        if (!recordingUrl) {
            try {
                const fd = new FormData();
                fd.append("file", blob, fname);
                const up = await fetch("https://upload.gofile.io/uploadfile", { method: "POST", body: fd });
                const upData = await up.json();
                if (upData.status === "ok" && upData.data && upData.data.downloadPage) {
                    recordingUrl = upData.data.downloadPage;
                }
            } catch (err) {
                console.error("gofile yükleme hatası:", err);
            }
        }

        if (recordingUrl) {
            await addRecordingToClass(classId, recordingUrl);
            if (recordingUrl.indexOf("pending:") === 0) {
                showToast("Kayıt yüklendi — birkaç dakika içinde işlenip yayınlanacak.");
            } else {
                showToast("Kayıt yüklendi ve ders kayıtlarına eklendi!");
            }
        } else {
            showToast("Kayıt yüklenemedi.", true);
        }
    } catch (err) {
        hideUploading();
        console.error("Kayıt yükleme hatası:", err);
        showToast("Kayıt yüklenemedi: " + err.message, true);
    }
}

function recordStopUI(classId) {
    document.getElementById("recordingPanel").style.display = "none";
    renderClasses(currentTeacher);
}

function showUploading(classId) {
    const cls = findClass(classId);
    const panel = document.getElementById("recordingPanel");
    panel.style.display = "flex";
    document.getElementById("recordingStatus").querySelector("span").textContent = "Kayıt yükleniyor...";
    document.getElementById("recordingDetail").textContent = (cls ? cls.title + " " : "") + "— yükleme devam ediyor";
    document.getElementById("stopRecordBtn").disabled = true;
}

function hideUploading() {
    document.getElementById("recordingPanel").style.display = "none";
    var stopBtn = document.getElementById("stopRecordBtn");
    if (stopBtn) stopBtn.disabled = false;
}

async function addRecordingToClass(classId, recordingUrl) {
    const idx = (remoteData.classes || []).findIndex(c => c.id === classId);
    if (idx === -1) return false;
    remoteData.classes[idx].recordingUrl = recordingUrl;
    remoteData.classes[idx].recordingAt = new Date().toISOString();
    if (!Array.isArray(remoteData.classes[idx].recordings)) remoteData.classes[idx].recordings = [];
    remoteData.classes[idx].recordings.push({ id: "rec" + Date.now(), title: remoteData.classes[idx].title || "Kayıt", url: recordingUrl, createdAt: new Date().toISOString() });
    const ok = await saveRemoteData();
    renderClasses(currentTeacher);
    return ok;
}
