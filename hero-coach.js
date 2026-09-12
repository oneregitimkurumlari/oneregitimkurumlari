(function () {
    if (window.__heroCoachInit) return;
    window.__heroCoachInit = true;

    var GEMINI_KEY = atob("QVEuQWI4Uk42S3JsTTZCcWlVczF3S2NmUVUxMXAzZ0xsdVVKY3NZZ3lZOG9xRFJ0bjJjUlE=");
    var GEMINI_MODEL = "gemini-3.6-flash";

    var DEEPSEEK_KEY = atob("c2stb3ItdjEtMDQ5MDMwN2JjMTgyNDU3Y2ZjOTUzMzYyMjA2YTI1ZTEzMmRiYTZlMTFlN2ZjNDRhMzMzODVjNWI1N2IzNTM0OQ==");
    var DEEPSEEK_URL = "https://openrouter.ai/api/v1/chat/completions";
    var DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3.1";

    var PROFANITY = ["amk", "aq", "oc", "pic", "pis", "kahpe", "orospu", "gavat", "salak", "aptal", "gerizekali", "manyak", "yavsak", "ibne", "serefsiz", "mal", "eşek"];

    function norm(s) {
        var r = { "ğ": "g", "Ğ": "g", "ş": "s", "Ş": "s", "ı": "i", "İ": "i", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u", "ç": "c", "Ç": "c" };
        return String(s).replace(/İ/g, "i").toLowerCase().split("").map(function (ch) { return r[ch] || ch; }).join("")
            .replace(/[.,!?;:()"']/g, " ")
            .replace(/\s+/g, " ").trim();
    }
    function hasBad(q) {
        var n = " " + norm(q) + " ";
        for (var i = 0; i < PROFANITY.length; i++) {
            if (n.indexOf(" " + PROFANITY[i] + " ") !== -1) return true;
        }
        return false;
    }
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }

    function studentName() {
        var u = sessionStorage.getItem("siteUser") || "";
        return u.split(" ")[0] || "Öğrenci";
    }
    function todayKey() {
        try { return getTodayDOM(); } catch (e) { return "pazartesi"; }
    }
    function currentWeek() {
        try { return weekKey(); } catch (e) { var d = new Date(); var day = d.getDay() || 7; var m = new Date(d); m.setDate(d.getDate() - day + 1); var p = n => String(n).padStart(2, "0"); return m.getFullYear() + "-" + p(m.getMonth() + 1) + "-" + p(m.getDate()); }
    }
    function planFor(week) {
        try { var p = window.myPlans ? myPlans() : (window.planCache && planCache[getStudentId()]) || {}; return p[week] || {}; } catch (e) { return {}; }
    }
    function dayLabelTR(d) {
        return { "pazartesi": "Pazartesi", "sali": "Salı", "carsamba": "Çarşamba", "persembe": "Perşembe", "cuma": "Cuma", "cumartesi": "Cumartesi", "pazar": "Pazar" }[String(d).toLowerCase()] || d;
    }

    function weekSummary() {
        var wk = currentWeek();
        var pl = planFor(wk);
        var labels = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];
        var s = { wk: wk, pl: pl, days: [], total: 0, done: 0, todayTotal: 0, todayDone: 0, todays: [], any: false, todayKey: todayKey() };
        labels.forEach(function (day) {
            var tasks = pl[day] || [];
            var dDone = tasks.filter(function (t) { return t.done; }).length;
            s.days.push({ day: day, tasks: tasks, done: dDone });
            tasks.forEach(function () { s.any = true; s.total++; });
            s.done += dDone;
            if (day === s.todayKey) {
                s.todayTotal = tasks.length;
                s.todayDone = dDone;
                s.todays = tasks.slice();
            }
        });
        s.pct = s.total ? Math.round(s.done / s.total * 100) : 0;
        return s;
    }

    /* ---------------- Çalışma Planı paneli (view-plan içi) ---------------- */
    function renderPlanPanel() {
        var host = document.getElementById("heroPlanPanel");
        if (!host) return;
        var s = weekSummary();
        var remaining = s.total - s.done;
        var todayRemain = s.todayTotal - s.todayDone;

        var note;
        if (!s.any) {
            note = "Haftalık planın henüz boş. Plan sekmesindeki kutucuklara görev ekleyelim mi? Ben takip eder, seni uyarırım. 🐾";
        } else if (remaining === 0) {
            note = "Süper! Tüm görevleri tamamladın. Sen bu haftanın yıldızısın HERO seni çok takdir ediyor! ⭐💪";
        } else if (s.todayTotal === 0) {
            note = "Bugün planlanmış görevin yok. Dinlenmek de planın bir parçası! Ama biraz tekrar yapmak istersen ekleyebilirsin. 😺";
        } else if (todayRemain > 0) {
            note = "Bugün " + todayRemain + " görevin kaldı. Unutma, küçük adımlar büyük başarılar getirir. Hadi birini bitir! 🎯";
        } else {
            note = "Bugünkü tüm görevlerini tamamladın! HERO gurur duyuyor. 🎉 Yarını planlamak istersen söyle, yardımcı olayım.";
        }

        var dayRows = "";
        s.days.forEach(function (d) {
            if (!d.tasks.length) return;
            dayRows += '<div class="h-day"><span class="h-day-label">' + dayLabelTR(d.day) + (d.day === s.todayKey ? ' <b>(bugün)</b>' : '') + '</span>' +
                '<span class="h-day-pct">' + d.done + '/' + d.tasks.length + '</span></div>';
        });

        host.innerHTML =
            '<div class="h-panel">' +
            '<div class="h-head">' +
            '<div class="h-avatar">🐱</div>' +
            '<div class="h-info"><strong>HERO — AI Koçun</strong><span>Haftalık çalışma planını takip ediyor</span></div>' +
            '<button type="button" class="h-talk" onclick="heroChatOpen()"><i class="fas fa-comment-dots"></i> Konuş</button>' +
            '</div>' +
            '<div class="h-progress"><div class="h-bar"><div style="width:' + s.pct + '%"></div></div><span class="h-pct">%' + s.pct + '</span></div>' +
            (s.any ? '<div class="h-sum">Bu hafta <b>' + s.done + '</b> / ' + s.total + ' görev tamamlandı</div>' + (dayRows ? '<div class="h-days">' + dayRows + '</div>' : '') : '') +
            '<p class="h-note">' + note + '</p>' +
            '</div>';
    }

    function refreshPlanPanel() {
        var host = document.getElementById("heroPlanPanel");
        if (host && host.offsetParent !== null) renderPlanPanel();
    }

    /* renderPlanList/renderTodayPlan render olduktan sonra paneli tazele */
    try {
        var _po1 = window.renderPlanList;
        window.renderPlanList = function () { var r = _po1 ? _po1.apply(this, arguments) : undefined; setTimeout(refreshPlanPanel, 0); return r; };
        var _po2 = window.renderTodayPlan;
        window.renderTodayPlan = function () { var r = _po2 ? _po2.apply(this, arguments) : undefined; setTimeout(refreshPlanPanel, 0); return r; };
    } catch (e) { }

    /* ---------------- HERO sohbet ---------------- */
    var fab, panel, body, input, sendBtn, typingEl, greeted = false;

    function buildFloat() {
        var css = '#heroRoot{font-family:inherit}' +
            '.h-fab{position:fixed;right:20px;bottom:94px;z-index:9990;width:62px;height:62px;border-radius:50%;border:none;cursor:pointer;background:linear-gradient(135deg,#fb923c,#f97316);color:#fff;font-size:30px;display:flex;align-items:center;justify-content:center;box-shadow:0 8px 24px rgba(249,115,22,.45);opacity:0;pointer-events:none;transform:translateY(14px);transition:.3s}' +
            '.h-fab.h-on{opacity:1;pointer-events:auto;transform:none}' +
            '.h-fab:hover{transform:scale(1.08)}' +
            '.h-fab .h-dot{position:absolute;top:2px;right:2px;width:14px;height:14px;border-radius:50%;background:#ef4444;border:2px solid #fff}' +
            '.h-panel-x{position:fixed;right:20px;bottom:168px;z-index:9991;width:340px;max-width:calc(100vw - 30px);background:#fff;border-radius:18px;box-shadow:0 20px 50px rgba(0,0,0,.25);display:none;flex-direction:column;overflow:hidden;border:1px solid #fed7aa}' +
            '.h-panel-x.h-show{display:flex}' +
            '.h-head2{display:flex;align-items:center;gap:10px;padding:12px 14px;background:linear-gradient(135deg,#ffedd5,#fed7aa);border-bottom:1px solid #ffedd5}' +
            '.h-avatar{width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 2px 6px rgba(0,0,0,.12);flex-shrink:0}' +
            '.h-head2 .h-info{flex:1}' +
            '.h-head2 strong{display:block;color:#9a3412;font-size:.95rem}' +
            '.h-head2 span{display:block;color:#b45309;font-size:.72rem}' +
            '.h-x{background:#fff;border:1px solid #fdba74;color:#9a3412;border-radius:8px;width:28px;height:28px;cursor:pointer;font-size:.8rem}' +
            '.h-body{height:300px;overflow-y:auto;padding:12px;background:#fffdfa;display:flex;flex-direction:column;gap:8px}' +
            '.h-msg{max-width:85%;padding:9px 12px;border-radius:14px;font-size:.85rem;line-height:1.45;white-space:pre-wrap;word-break:break-word}' +
            '.h-msg.bot{background:#fff;border:1px solid #fed7aa;align-self:flex-start;border-bottom-left-radius:4px}' +
            '.h-msg.user{background:#f97316;color:#fff;align-self:flex-end;border-bottom-right-radius:4px}' +
            '.h-typing{display:none;align-items:center;gap:4px;padding:8px 12px}' +
            '.h-typing span{width:7px;height:7px;border-radius:50%;background:#fdba74;animation:hp 1s infinite}' +
            '.h-typing span:nth-child(2){animation-delay:.2s}.h-typing span:nth-child(3){animation-delay:.4s}' +
            '@keyframes hp{0%,100%{opacity:.3;transform:translateY(0)}50%{opacity:1;transform:translateY(-3px)}}' +
            '.h-chips{display:flex;gap:6px;flex-wrap:wrap;padding:8px 12px;background:#fffdfa}' +
            '.h-chip{background:#ffedd5;color:#9a3412;border:none;border-radius:999px;padding:6px 11px;font-size:.74rem;font-weight:600;cursor:pointer;transition:.2s}' +
            '.h-chip:hover{background:#fed7aa}' +
            '.h-inrow{display:flex;gap:8px;padding:10px 12px;background:#fffdfa}' +
            '.h-in{flex:1;border:1px solid #fed7aa;border-radius:12px;padding:9px 12px;font-size:.85rem;outline:none}' +
            '.h-in:focus{border-color:#f97316}' +
            '.h-send{background:#f97316;color:#fff;border:none;border-radius:12px;padding:0 16px;cursor:pointer;font-size:1rem}' +
            '.h-panel-progress{padding:10px 14px;background:#fff7ed;border-bottom:1px solid #ffedd5}' +
            '.h-panel-progress .h-bar{height:8px;background:#fed7aa;border-radius:999px;overflow:hidden}' +
            '.h-panel-progress .h-bar div{height:100%;background:linear-gradient(90deg,#fb923c,#f97316);border-radius:999px;transition:width .4s}' +
            '.h-panel-progress .h-prow{display:flex;justify-content:space-between;font-size:.72rem;color:#b45309;font-weight:600;margin-bottom:4px}' +
            '.h-bar{height:8px;background:#fed7aa;border-radius:999px;overflow:hidden}' +
            '.h-bar div{height:100%;background:linear-gradient(90deg,#fb923c,#f97316);border-radius:999px;transition:width .4s}' +
            '.h-panel{background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:14px;margin-top:14px}' +
            '.h-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}' +
            '.h-info{flex:1;min-width:0}' +
            '.h-info strong{display:block;font-size:.9rem;color:#9a3412}' +
            '.h-info span{display:block;font-size:.72rem;color:#b45309}' +
            '.h-talk{background:#f97316;color:#fff;border:none;border-radius:10px;padding:7px 12px;font-size:.75rem;font-weight:600;cursor:pointer;white-space:nowrap}' +
            '.h-talk:hover{background:#ea580c}' +
            '.h-progress{display:flex;align-items:center;gap:10px;margin-bottom:8px}' +
            '.h-progress .h-bar{flex:1}' +
            '.h-pct{font-weight:700;color:#f97316;font-size:.8rem}' +
            '.h-sum{font-size:.76rem;color:#92400e;margin-bottom:6px;font-weight:600}' +
            '.h-days{margin-bottom:4px}' +
            '.h-day{display:flex;justify-content:space-between;font-size:.72rem;color:#92400e;padding:2px 0}' +
            '.h-day-label{font-weight:600}' +
            '.h-day-pct{color:#f97316;font-weight:700}' +
            '.h-note{font-size:.78rem;color:#92400e;background:#fff;border:1px dashed #fdba74;border-radius:10px;padding:8px 10px;margin:0}' +
            '@media(max-width:640px){.h-fab{right:12px;bottom:82px;width:52px;height:52px;font-size:26px}.h-panel-x{right:12px;bottom:148px;left:12px;width:auto}}';
        var st = document.createElement("style");
        st.textContent = css;
        document.head.appendChild(st);

        var root = document.createElement("div");
        root.id = "heroRoot";

        fab = document.createElement("button");
        fab.className = "h-fab";
        fab.type = "button";
        fab.title = "HERO — AI Koçun";
        fab.innerHTML = "🐱<span class='h-dot'></span>";
        fab.addEventListener("click", function () { toggleOpen(); });

        panel = document.createElement("div");
        panel.className = "h-panel-x";

        var hdr = document.createElement("div");
        hdr.className = "h-head2";
        hdr.innerHTML = '<div class="h-avatar">🐱</div><div class="h-info"><strong>HERO — AI Koçun</strong><span>Haftalık planını takip eder, rehberlik eder</span></div>';
        var xb = document.createElement("button");
        xb.className = "h-x";
        xb.type = "button";
        xb.innerHTML = '<i class="fas fa-times"></i>';
        xb.addEventListener("click", function () { toggleOpen(false); });
        hdr.appendChild(xb);

        var progWrap = document.createElement("div");
        progWrap.className = "h-panel-progress";
        progWrap.innerHTML = '<div class="h-prow"><span>Bu haftaki ilerleme</span><span class="h-pc-t">%0</span></div><div class="h-bar"><div class="h-pc-b" style="width:0%"></div></div>';

        body = document.createElement("div");
        body.className = "h-body";

        typingEl = document.createElement("div");
        typingEl.className = "h-typing";
        typingEl.innerHTML = "<span></span><span></span><span></span>";
        body.appendChild(typingEl);

        var chips = document.createElement("div");
        chips.className = "h-chips";
        var quick = ["Bana haftalık plan oluştur", "Haftalık planım", "Bugünkü görevlerim", "İlerlememi göster", "Koç tavsiyesi ver", "Beni motive et"];
        quick.forEach(function (q) {
            var c = document.createElement("button");
            c.className = "h-chip";
            c.type = "button";
            c.textContent = q;
            c.addEventListener("click", function () { input.value = q; send(); });
            chips.appendChild(c);
        });

        var row = document.createElement("div");
        row.className = "h-inrow";
        input = document.createElement("input");
        input.className = "h-in";
        input.type = "text";
        input.maxLength = 400;
        input.placeholder = "HERO'ya sor (örn. bu akşam ne çalışayım?)";
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
        sendBtn = document.createElement("button");
        sendBtn.className = "h-send";
        sendBtn.type = "button";
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendBtn.addEventListener("click", send);
        row.appendChild(input);
        row.appendChild(sendBtn);

        panel.appendChild(hdr);
        panel.appendChild(progWrap);
        panel.appendChild(body);
        panel.appendChild(chips);
        panel.appendChild(row);
        root.appendChild(fab);
        root.appendChild(panel);
        document.body.appendChild(root);

        watchLogin();
        setInterval(updateProgressBar, 3000);
    }

    function updateProgressBar() {
        var s = weekSummary();
        var b = document.querySelector("#heroRoot .h-pc-b");
        var t = document.querySelector("#heroRoot .h-pc-t");
        if (b && t) { b.style.width = s.pct + "%"; t.textContent = "%" + s.pct; }
        refreshPlanPanel();
    }

    function watchLogin() {
        setInterval(function () {
            var logged = sessionStorage.getItem("siteLogged") === "true";
            fab.classList.toggle("h-on", !!logged);
            if (!logged && panel.classList.contains("h-show")) toggleOpen(false);
        }, 800);
    }

    function toggleOpen(force) {
        var show = typeof force === "boolean" ? force : !panel.classList.contains("h-show");
        panel.classList.toggle("h-show", show);
        fab.classList.toggle("h-open", show);
        if (show) {
            if (window.aiAssistantClose) window.aiAssistantClose();
            if (!greeted) {
                greeted = true;
                botSay("Miyav! 🐱 Ben HERO, senin yapay zekâ koçunum. Haftalık çalışma planını takip ediyorum. Zorlandığın yerde rehberlik etmek için buradayım! ");
            }
            setTimeout(function () { input.focus(); }, 120);
        }
    }

    window.heroChatOpen = function () { toggleOpen(true); };
    window.heroChatClose = function () { toggleOpen(false); };

    function say(role, text) {
        var m = document.createElement("div");
        m.className = "h-msg " + role;
        m.textContent = text;
        body.insertBefore(m, typingEl);
        body.scrollTop = body.scrollHeight;
        return m;
    }
    function botSay(t) { say("bot", t); }
    function userSay(t) { say("user", t); }
    function typing(on) { typingEl.style.display = on ? "flex" : "none"; if (on) body.scrollTop = body.scrollHeight; }

    /* ---------------- Metin üreticileri ---------------- */
    function weekText() {
        var s = weekSummary();
        if (!s.any) return "Haftalık planın henüz boş 🐾 Çalışma Planı sekmesinden görev ekleyebilirsin. Ben de takip etmeye başlayayım!";
        var lines = ["İşte haftalık planın:"];
        s.days.forEach(function (d) {
            if (!d.tasks.length) return;
            lines.push(dayLabelTR(d.day) + ": " + d.tasks.map(function (t) { return (t.done ? "✅ " : "⬜ ") + t.text; }).join(" | "));
        });
        lines.push("Toplam: " + s.done + "/" + s.total + " tamamlandı (%" + s.pct + ")");
        return lines.join("\n");
    }

    function todayText() {
        var s = weekSummary();
        if (s.todayTotal === 0) return "Bugün planlanmış görevin yok 🎈 Dilersen Çalışma Planı'na bugün için görev ekleyebilirsin.";
        var lines = ["Bugün (" + dayLabelTR(s.todayKey) + ") görevlerin:"];
        s.todays.forEach(function (t, i) { lines.push((t.done ? "✅ " : "") + (i + 1) + ". " + t.text); });
        var k = s.todayTotal - s.todayDone;
        lines.push(k > 0 ? k + " görevin daha var. Devam! 💪" : "Hepsini bitirdin, harikasın! 🎉");
        return lines.join("\n");
    }

    function progressText() {
        var s = weekSummary();
        if (!s.any) return "Henüz ilerleme yok çünkü planın boş. Görev ekleyince burası dolacak!";
        return "Bu hafta ilerlemen: %" + s.pct + " (" + s.done + "/" + s.total + " görev)." +
            (s.pct === 100 ? " Mükemmel, hepsini tamamlamışsın! ⭐" : s.pct >= 60 ? " Çok iyi gidiyorsun, az kaldı! 🔥" : s.pct >= 30 ? " İyi bir başlangıç yaptın, devam et! 😺" : " Henüz başlarında sayılırız, hadi bir görevi tamamlayalım ve birlikte ileriye gidelim!");
    }

    function guidanceText() {
        var s = weekSummary();
        if (!s.any) return "Koç tavsiyem: Önce bu hafta için 2-3 gerçekçi hedef belirle ve Çalışma Planı'na ekle. Küçük ama düzenli çalışma her zaman kazanır. 🐾";
        var advice = [];
        var unDone = s.todayTotal - s.todayDone;
        if (unDone > 0) advice.push("Bugün " + unDone + " görevin kalmış. Günün sonuna doğru 30 dakikalık odaklı bir çalışma ayır.");
        var doneDays = s.days.filter(function (d) { return d.tasks.length && d.done === d.tasks.length; }).length;
        if (doneDays > 0) advice.push("Tamamladığın " + doneDays + " gün var, bu harika bir alışkanlık! 🎉");
        var pct = s.pct;
        if (pct < 30) advice.push("Hafta daha yeni, planını küçük parçalara bölüp bugün bir görevini bitirerek başlayabilirsin.");
        else if (pct < 70) advice.push("İyi gidiyorsun! Zorlandığın bir ders varsa onu öğleden önce (zihnin dinçken) çalış.");
        else if (pct < 100) advice.push("Çok az kaldı! Kalan görevleri öncelik sırasına koy: önce en kısa süreni bitir, momentumunu kaybetme.");
        advice.push("Tekrar yapmak ve ara vermek ('Pomodoro': 25 dk çalış + 5 dk mola) başarını artırır. İstediğin ders için benden ipucu isteyebilirsin! 😺");
        return advice.join(" ");
    }

    function motivationText() {
        var list = [
            "HERO sana güveniyor! 🐾 Küçük adım bugün, büyük başarı yarın.",
            "Her soru çözdüğünde biraz daha güçleniyorsun. Sen bir şampiyonsun! 🏆",
            "Zorlandığın anlar seni büyüten anlardır. Bir görev daha, yapabilirsin! 🔥",
            "Miyav! Unutma, sen çalıştıkça seninle gurur duyacak bir sürü insan var. Sen kendinle bile gurur duy zaten! ⭐",
            "Başarı tesadüf değil, tekrarlanan küçük doğruların sonucudur. Bugün de bir doğru yap! 💪"
        ];
        return list[Math.floor(Math.random() * list.length)];
    }

    /* ---------------- HERO haftalık program oluşturabilir ---------------- */
    var pendingReplace = false;

    function scheduleSubjects() {
        var m = {};
        try {
            var sched = (window.getScheduleData && getScheduleData()) ||
                (typeof cachedData !== "undefined" && cachedData && cachedData.classes) ||
                (window.cachedData && window.cachedData.classes) || [];
            sched.forEach(function (c) {
                var d = String(c.dayLabel || c.day || "").toLowerCase();
                if (!d || !c.title) return;
                (m[d] = m[d] || []).push(String(c.title));
            });
        } catch (e) {}
        Object.keys(m).forEach(function (k) { m[k] = m[k].filter(function (v, i, a) { return a.indexOf(v) === i; }); });
        return m;
    }

    function dayKeyTR(s) {
        var keys = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];
        var n = norm(s);
        for (var i = 0; i < keys.length; i++) if (n.indexOf(keys[i]) !== -1) return keys[i];
        return null;
    }

    function normalizeDays(obj) {
        var out = {};
        Object.keys(obj || {}).forEach(function (k) {
            var dk = dayKeyTR(k.replace(/[0-9]/g, ""));
            if (!dk) return;
            var arr = (obj[k] || []).map(function (t) { return String(t).trim(); }).filter(Boolean);
            if (arr.length) out[dk] = arr;
        });
        return out;
    }

    function cachedTeachers() {
        try {
            if (typeof cachedData !== "undefined" && cachedData && cachedData.teachers) return cachedData.teachers;
            if (window.cachedData && window.cachedData.teachers) return window.cachedData.teachers;
        } catch (e) {}
        return [];
    }

    function allBranches() {
        var subs = scheduleSubjects();
        var list = [];
        Object.keys(subs).forEach(function (d) {
            subs[d].forEach(function (s) { if (list.indexOf(s) === -1) list.push(s); });
        });
        cachedTeachers().forEach(function (t) {
            var b = String(t.branch || "").trim();
            if (b && b.length <= 40 && list.indexOf(b) === -1) list.push(b);
        });
        if (list.length < 4) {
            ["Matematik", "Fen Bilimleri", "Türkçe", "İngilizce", "Sosyal Bilgiler", "Din Kültürü"].forEach(function (b) {
                if (list.indexOf(b) === -1) list.push(b);
            });
        }
        return list;
    }

    function soruSayisi(lesson) {
        var n = norm(lesson);
        if (n.indexOf("matematik") !== -1) return 25;
        if (n.indexOf("fen") !== -1) return 20;
        if (n.indexOf("turk") !== -1) return 20;
        if (n.indexOf("ingiliz") !== -1) return 15;
        if (n.indexOf("sosyal") !== -1) return 15;
        if (n.indexOf("din") !== -1) return 12;
        if (n.indexOf("geometri") !== -1) return 10;
        return 20;
    }

    function fallbackPlan() {
        var branches = allBranches();
        var rot = branches.length ? Math.floor(Date.now() / 604800000) % branches.length : 0;
        var ordered = branches.slice(rot).concat(branches.slice(0, rot));
        var days = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];
        var out = {};
        var pick = ordered.slice();
        days.forEach(function (d) {
            var tasks = [];
            for (var k = 0; k < 2; k++) {
                if (!pick.length) pick = ordered.slice();
                var br = pick.shift();
                tasks.push(br.charAt(0).toUpperCase() + br.slice(1) + ": " + soruSayisi(br) + " soru çöz + konu tekrarı");
            }
            if (d === "cuma") tasks.push("Haftanın genel tekrarı");
            if (d === "cumartesi") tasks.push("1 deneme sınavı çöz (" + (65 + Math.floor(Math.random() * 26)) + " soru)");
            if (d === "pazar") tasks.push("Eksik konuların tekrarı + yanlışları gözden geçir");
            out[d] = tasks;
        });
        return out;
    }

    function providerPlanSys() {
        var keys = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];
        var branches = allBranches();
        return "Sen HERO adında öğrenciler için haftalık çalışma programı oluşturan bir AI koç kedisin.\n" +
            "Öğrencinin dersleri: " + (branches.join(", ") || "bilinmiyor") + ".\n" +
            "Kesinlikle bir JSON nesnesi döndür, başka hiçbir metin yazma. JSON anahtarları sıralı olmalı:\n" +
            '{"pazartesi":["...","..."],"sali":["...","..."],"carsamba":["...","..."],"persembe":["...","..."],"cuma":["...","..."],"cumartesi":["...","..."],"pazar":["...","..."]}\n' +
            "Kurallar:\n" +
            "- Anahtar isimleri TAM olarak şöyle olmalı (Türkçe karakter yok): " + keys.join(", ") + ".\n" +
            "- Her güne tam 2-3 görev yaz.\n" +
            "- Görevler öğrencinin derslerinden oluşmalı: " + branches.join(", ") + ".\n" +
            "- Her görevin içinde mutlaka bir sayı olmalı: uygun soru sayısı (Matematik 25, Fen Bilimleri 20, Türkçe 20, İngilizce 15, Sosyal Bilgiler 15, Din Kültürü 12) ve gerekirse 'konu tekrarı' vurgusu.\n" +
            "- Cumartesi gününe '1 deneme sınavı çöz (65-90 soru)' görevi ekleyebilirsin.\n" +
            "Sadece geçerli JSON döndür.";
    }

    function providerAsk(sys, q, temperature, maxTokens, jsonMode) {
        return deepseekAsk(sys, q, temperature, maxTokens, jsonMode).catch(function () {
            return geminiText(sys, q, temperature, maxTokens, jsonMode);
        });
    }

    function deepseekAsk(sys, q, temperature, maxTokens, jsonMode) {
        if (!DEEPSEEK_KEY) return Promise.reject(new Error("no-key"));
        var url = DEEPSEEK_URL;
        var body = {
            model: DEEPSEEK_MODEL,
            messages: [
                { role: "system", content: sys },
                { role: "user", content: q }
            ],
            temperature: temperature,
            max_tokens: maxTokens,
            stream: false
        };
        if (jsonMode) body.response_format = { type: "json_object" };
        return new Promise(function (resolve, reject) {
            var c = new AbortController();
            var t = setTimeout(function () { c.abort(); reject(new Error("timeout")); }, 25000);
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + DEEPSEEK_KEY, "HTTP-Referer": "https://oneregitimkurumlari.github.io/", "X-Title": "ONLINE PIROS" },
                body: JSON.stringify(body),
                signal: c.signal
            }).then(function (res) {
                if (!res.ok) throw new Error("http " + res.status);
                return res.json();
            }).then(function (j) {
                var txt = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content ? j.choices[0].message.content : "";
                txt = String(txt).trim();
                if (!txt) throw new Error("empty");
                resolve(txt);
            }).catch(function (e) { reject(e); }).then(function () { clearTimeout(t); });
        });
    }

    function geminiText(sys, q, temperature, maxTokens, jsonMode) {
        if (!GEMINI_KEY) return Promise.reject(new Error("no-key"));
        var url = "https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(GEMINI_MODEL) + ":generateContent?key=" + encodeURIComponent(GEMINI_KEY);
        var gc = { temperature: temperature, maxOutputTokens: maxTokens };
        if (jsonMode) gc.responseMimeType = "application/json";
        return new Promise(function (resolve, reject) {
            var c = new AbortController();
            var t = setTimeout(function () { c.abort(); reject(new Error("timeout")); }, 25000);
            fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    systemInstruction: { parts: [{ text: sys }] },
                    contents: [{ role: "user", parts: [{ text: q }] }],
                    generationConfig: gc
                }),
                signal: c.signal
            }).then(function (res) {
                if (!res.ok) throw new Error("http " + res.status);
                return res.json();
            }).then(function (j) {
                var txt = j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] ? j.candidates[0].content.parts[0].text : "";
                txt = String(txt).trim();
                if (!txt) throw new Error("empty");
                resolve(txt);
            }).catch(function (e) { reject(e); }).then(function () { clearTimeout(t); });
        });
    }

    function providerPlan() {
        var sys = providerPlanSys();
        return providerAsk(sys, "Bu hafta için çalışma programını oluştur.", 0.6, 2048, true).then(function (txt) {
            txt = String(txt).replace(/```[a-z]*/gi, "").trim();
            var ma = txt.match(/\{[\s\S]*\}/);
            var obj = ma ? JSON.parse(ma[0]) : JSON.parse(txt);
            return normalizeDays(obj);
        });
    }

    function tasksWithCounts(list) {
        return (list || []).map(function (t) {
            if (/deneme/.test(norm(t))) {
                return "1 deneme sınavı çöz (" + (65 + Math.floor(Math.random() * 26)) + " soru)";
            }
            if (/\d/.test(t)) return t;
            var n = norm(t);
            var cnt = 20;
            allBranches().forEach(function (b) { if (n.indexOf(norm(b)) !== -1) cnt = soruSayisi(b); });
            return t + " + " + cnt + " soru çöz";
        });
    }

    function mergePlan(base, g) {
        var days = ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"];
        var out = {};
        days.forEach(function (d) {
            var gt = (g[d] || []).filter(Boolean);
            var valid = gt.length >= 2 && gt.some(function (t) { return /\d/.test(t); });
            out[d] = valid ? gt : (base[d] || []).slice();
        });
        var branches = allBranches();
        branches.forEach(function (br) {
            var nb = norm(br);
            var found = false;
            days.forEach(function (d) {
                out[d].forEach(function (t) { if (norm(t).indexOf(nb) !== -1) found = true; });
            });
            if (!found) {
                var minDay = days.slice().sort(function (a, b) { return out[a].length - out[b].length; })[0];
                out[minDay] = (out[minDay] || []).concat([br.charAt(0).toUpperCase() + br.slice(1) + ": " + soruSayisi(br) + " soru çöz + konu tekrarı"]);
            }
        });
        days.forEach(function (d) { out[d] = tasksWithCounts(out[d] || []); });
        return out;
    }

    function writePlan(daysObj) {
        var sid = getStudentId();
        var c = window.planCache || {};
        if (!c[sid]) c[sid] = {};
        var wk = currentWeek();
        var bucket = {};
        ["pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "pazar"].forEach(function (d) {
            var arr = daysObj[d] || [];
            bucket[d] = arr.map(function (t) { return { id: "h-" + Math.floor(Math.random() * 1e9), text: t, done: false }; });
        });
        c[sid][wk] = bucket;
        window.planCache = c;
        return savePlans().then(function () {
            try { if (window.renderPlanList) renderPlanList(); if (window.renderTodayPlan) renderTodayPlan(); } catch (e) {}
            renderPlanPanel(); updateProgressBar();
            return true;
        }).catch(function () { return false; });
    }

    function createPlanFlow() {
        var s = weekSummary();
        if (s.any) {
            pendingReplace = true;
            return "Miyav, haftalık planın şu an dolu (" + s.total + " görev var). Yerine HERO'nun hazırladığı yeni bir program koyayım mı? Onayılıyorsan 'evet' yaz. 🐾";
        }
        return makePlan(false);
    }

    function withBudget(ms, pr) {
        return new Promise(function (resolve) {
            var done = false;
            var t = setTimeout(function () { if (!done) { done = true; resolve(false); } }, ms);
            pr.then(function (v) { if (!done) { done = true; clearTimeout(t); resolve(v); } },
                function () { if (!done) { done = true; clearTimeout(t); resolve(false); } });
        });
    }

    function makePlan(isReplace) {
        var base = fallbackPlan();
        return withBudget(30000, providerPlan()).then(function (g) {
            var days = g ? mergePlan(base, g) : base;
            return writePlan(days).then(function (ok) {
                var cnt = 0;
                Object.keys(days).forEach(function (k) { cnt += (days[k] || []).length; });
                if (!ok) return "Miyav, program hazır ama kaydedilemedi. Bağlantını kontrol edip tekrar dene istersen. 🐾";
                return isReplace
                    ? "Yeni haftalık programın hazır! " + cnt + " görev eklendi. Çalışma Planı sayfasına göz atmayı unutma. Miyav! 🐾"
                    : "HERO haftalık programını oluşturdu! Tüm branşlar haftaya dağıtıldı, her görevde soru sayısı yazıyor. Toplam " + cnt + " görev plana eklendi. Miyav! 🐾";
            });
        });
    }

    function planContext() {
        try {
            var s = weekSummary();
            var lines = ["Haftalık plan ilerlemesi: %" + s.pct + " (" + s.done + "/" + s.total + " tamamlandı)"];
            s.days.forEach(function (d) {
                if (d.tasks.length) lines.push(dayLabelTR(d.day) + ": " + d.tasks.map(function (t) { return (t.done ? "[bitirdi] " : "") + t.text; }).join("; "));
            });
            return lines.join("\n");
        } catch (e) { return "Plan verisi yüklenemedi."; }
    }

    function geminiAsk(q) {
        var sys = "Sen HERO adında, ortaokul/ilkokul öğrencileri için AI koç olan sevimli bir kedisin. Öğrencinin haftalık çalışma planını takip ediyorsun ve rehberlik (koçluk) yapıyorsun. Öğrencinin planı şu anda:\n" + planContext() + "\n\nGörevlerini plan üzerinden değerlendir; motive et, ders çalışma taktiği öner, zorlandığını anla ve yaşına uygun, kısa, sıcak ve Türkçe yanıt ver. Cevap en fazla 250 kelime olsun. Zaman zaman 'miyav' gibi kedi havasında samimi ifadeler kullanabilirsin.";
        return providerAsk(sys, q, 0.6, 500);
    }

    var RULES = [
        { keys: ["merhaba", "selam", "hey", "miyav", "hiii", "sa"], fn: function () { return "Miyav, merhaba " + studentName() + "! 🐱 Ben HERO. Haftalık planını takip edip sana koçluk yapıyorum. Nasıl yardımcı olayım?"; } },
        { keys: ["tesekkur", "sagol", "eyvallah", "teşekkür"], fn: function () { return "Rica ederim! 🐾 İşini bitirince miyavla, başarını kutlayalım!"; } },
        { keys: ["haftal", "plan", "program"], fn: function () { return weekText(); } },
        { keys: ["bugun", "bugün", "yarin", "yarın"], fn: function () { return todayText(); } },
        { keys: ["ilerle", "progres", "yuzde", "yüzde", "devam"], fn: function () { return progressText(); } },
        { keys: ["tavsiye", "oner", "öner", "ipucu", "nasil calis", "nasıl çalış", "takti", "koç", "koc", "rehber"], fn: function () { return guidanceText(); } },
        { keys: ["motive", "motiv"], fn: function () { return motivationText(); } }
    ];

    function cebir(q) {
        var n = String(q).toLowerCase().replace(/[!?.;:()"']/g, " ").replace(/\s+/g, " ").trim();
        var m = n.match(/(-?\d+(?:[.,]\d+)?)\s*([+\-*x\u00d7/\u00f7])\s*(-?\d+(?:[.,]\d+)?)/);
        if (!m) return null;
        var a = parseFloat(m[1].replace(",", "."));
        var b = parseFloat(m[3].replace(",", "."));
        if ((m[2] === "/" || m[2] === "\u00f7") && b === 0) return null;
        var r = m[2] === "+" ? a + b : m[2] === "-" ? a - b : m[2] === "*" || m[2] === "x" || m[2] === "\u00d7" ? a * b : a / b;
        if (r === null || isNaN(r) || !isFinite(r)) return null;
        var rStr = Math.abs(r - Math.round(r)) < 1e-9 ? String(Math.round(r)) : String(Math.round(r * 1e6) / 1e6);
        return "Hesapladım: " + m[1] + " " + m[2] + " " + m[3] + " = " + rStr;
    }

    function answer(q) {
        var n = norm(q);
        if (hasBad(q)) return Promise.resolve("Bu konuda sana yardım edemem canım, derslerin ve planın hakkında konuşalım olur mu? 🐾");
        var math = cebir(q);
        if (math) return Promise.resolve(math);

        var isCreate = /(olustur|hazirla|plan yap|program yap|program kur|kendin yaz|kendin kur|yeni plan|program hazirla)/.test(n);
        if (pendingReplace) {
            if (/(hayir|hayır|yok|isteme|gerek yok|dur)/.test(n)) {
                pendingReplace = false;
                return Promise.resolve("Sorun değil, planına dokunmadım. Başka bir konuda yardımcı olayım mı? 🐾");
            }
            pendingReplace = false;
            return makePlan(true);
        }
        if (isCreate) return createPlanFlow();

        for (var i = 0; i < RULES.length; i++) {
            if (RULES[i].keys.some(function (k) { return n.indexOf(k) !== -1; })) {
                var r = RULES[i].fn();
                if (r && typeof r === "string") return Promise.resolve(r);
            }
        }
        return geminiAsk(q).catch(function () {
            return "Miyav, bağlantı kurulamadı. Ama bana planın, görevlerin ya da ilerlemen hakkında sorabilirsin; onları ben burada takip ediyorum. 😺";
        });
    }

    var busy = false;
    function send() {
        var v = (input.value || "").trim();
        if (!v || busy) return;
        userSay(v);
        input.value = "";
        busy = true;
        sendBtn.disabled = true;
        typing(true);
        setTimeout(function () {
            var ans;
            try { ans = answer(v); } catch (e) { ans = Promise.resolve("Bir şeyler ters gitti, lütfen biraz sonra tekrar dene. 🐾"); }
            ans.then(function (txt) {
                typing(false);
                botSay(txt);
            }).catch(function () {
                typing(false);
                botSay("Bir şeyler ters gitti, lütfen biraz sonra tekrar dene. 🐾");
            }).then(function () {
                busy = false;
                sendBtn.disabled = false;
                input.focus();
            });
        }, 300);
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", function () {
            buildFloat();
            renderPlanPanel();
        });
    } else {
        buildFloat();
        renderPlanPanel();
    }
})();