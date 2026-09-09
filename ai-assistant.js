(function () {
    if (window.__aiAssistantInit) return;
    window.__aiAssistantInit = true;

    var PROFANITY = ["amk", "aq", "oc", "piç", "pic", "sik", "kahpe", "orospu", "gavat", "salak", "aptal", "gerizekali", "manyak", "yavsak", "pust", "surtuk", "fahise", "ibne", "serefsiz", "mal"];

    function norm(s) {
        var r = { "ğ": "g", "Ğ": "g", "ş": "s", "Ş": "s", "ı": "i", "İ": "i", "ö": "o", "Ö": "o", "ü": "u", "Ü": "u", "ç": "c", "Ç": "c", "â": "a", "î": "i", "ê": "e" };
        return String(s).toLowerCase().split("").map(function (ch) { return r[ch] || ch; }).join("")
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

    /* ---------- DOM ---------- */
    var fab, panel, body, input, sendBtn, typingEl, settingsRow, keyInput, modelInput, greeted = false;

    function build() {
        if (document.getElementById("aiWidgetRoot")) return;
        var root = document.createElement("div");
        root.id = "aiWidgetRoot";

        fab = document.createElement("button");
        fab.className = "ai-fab";
        fab.type = "button";
        fab.title = "Yapay Zekâ Asistanı";
        fab.innerHTML = '<i class="fas fa-robot"></i><span class="ai-fab-dot"></span>';

        panel = document.createElement("div");
        panel.className = "ai-panel";

        var hdr = document.createElement("div");
        hdr.className = "ai-header";
        hdr.innerHTML = '<div class="ai-header-avatar"><i class="fas fa-robot"></i></div>' +
            '<div class="ai-header-info"><strong>Yapay Zekâ Asistanı</strong><span>Dersler ve site hakkında yardım eder</span></div>' +
            '<button class="ai-gear" title="Ayarlar"><i class="fas fa-gear"></i></button>' +
            '<button class="ai-close" title="Kapat"><i class="fas fa-times"></i></button>';
        hdr.querySelector(".ai-close").addEventListener("click", function () { toggleOpen(false); });
        hdr.querySelector(".ai-gear").addEventListener("click", function () {
            var show = settingsRow.style.display !== "block";
            settingsRow.style.display = show ? "block" : "none";
        });
        fab.addEventListener("click", function () { toggleOpen(); });

        settingsRow = document.createElement("div");
        settingsRow.className = "ai-settings";
        settingsRow.style.display = "none";
        keyInput = document.createElement("input");
        keyInput.className = "ai-input";
        keyInput.type = "text";
        keyInput.maxLength = 200;
        keyInput.placeholder = "API anahtarı (opsiyonel)";
        modelInput = document.createElement("input");
        modelInput.className = "ai-input";
        modelInput.type = "text";
        modelInput.maxLength = 60;
        modelInput.placeholder = "Model (örn. gpt-4o-mini)";
        var sRow = document.createElement("div");
        sRow.className = "ai-settings-buttons";
        var saveB = document.createElement("button");
        saveB.type = "button";
        saveB.textContent = "Kaydet";
        saveB.className = "ai-chip";
        saveB.addEventListener("click", function () {
            localStorage.setItem("ai_api_key", (keyInput.value || "").trim());
            localStorage.setItem("ai_model", (modelInput.value || "").trim() || "gpt-4o-mini");
            settingsNote("Kaydedildi ✓");
        });
        var clearB = document.createElement("button");
        clearB.type = "button";
        clearB.textContent = "Temizle";
        clearB.className = "ai-chip";
        clearB.addEventListener("click", function () {
            localStorage.removeItem("ai_api_key");
            localStorage.removeItem("ai_model");
            keyInput.value = "";
            modelInput.value = "";
            settingsNote("Temizlendi, yalnız site verileriyle yanıtlanır.");
        });
        var note = document.createElement("span");
        note.className = "ai-settings-note";
        note.textContent = "Anahtar olmadan ders programı, ödevler ve site hakkında yerleşik bilgilerle yanıtlanır.";
        sRow.appendChild(saveB);
        sRow.appendChild(clearB);
        sRow.appendChild(note);
        settingsRow.appendChild(keyInput);
        settingsRow.appendChild(modelInput);
        settingsRow.appendChild(sRow);
        if (localStorage.getItem("ai_api_key")) keyInput.value = localStorage.getItem("ai_api_key");
        if (localStorage.getItem("ai_model")) modelInput.value = localStorage.getItem("ai_model");

        body = document.createElement("div");
        body.className = "ai-body";

        typingEl = document.createElement("div");
        typingEl.className = "ai-typing";
        typingEl.style.display = "none";
        typingEl.innerHTML = "<span></span><span></span><span></span>";
        body.appendChild(typingEl);

        var chips = document.createElement("div");
        chips.className = "ai-chips";
        var quick = ["Bu hafta ders programım", "Ödevlerim", "Canlı derse nasıl girerim?", "Site nasıl kullanılır?", "Bugün hangi derslerim var?"];
        quick.forEach(function (q) {
            var c = document.createElement("button");
            c.className = "ai-chip";
            c.type = "button";
            c.setAttribute("data-q", q);
            c.textContent = q;
            c.addEventListener("click", function () {
                input.value = c.getAttribute("data-q");
                send();
            });
            chips.appendChild(c);
        });

        var row = document.createElement("div");
        row.className = "ai-input-row";
        input = document.createElement("input");
        input.className = "ai-input";
        input.type = "text";
        input.maxLength = 500;
        input.placeholder = "Bir soru sor (örn. matematik dersi ne zaman?)";
        input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });

        sendBtn = document.createElement("button");
        sendBtn.className = "ai-send";
        sendBtn.type = "button";
        sendBtn.title = "Gönder";
        sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        sendBtn.addEventListener("click", send);

        row.appendChild(input);
        row.appendChild(sendBtn);

        panel.appendChild(hdr);
        panel.appendChild(settingsRow);
        panel.appendChild(body);
        panel.appendChild(chips);
        panel.appendChild(row);
        root.appendChild(fab);
        root.appendChild(panel);
        document.body.appendChild(root);

        watchLogin();
    }

    function settingsNote(msg) {
        var b = settingsRow.querySelector(".ai-settings-buttons");
        var old = b.querySelector(".ai-settings-msg");
        if (old) old.remove();
        var m = document.createElement("span");
        m.className = "ai-settings-msg";
        m.textContent = msg;
        b.appendChild(m);
        setTimeout(function () { if (m.parentNode) m.remove(); }, 3500);
    }

    function watchLogin() {
        setInterval(function () {
            var logged = sessionStorage.getItem("siteLogged") === "1";
            fab.classList.toggle("ai-visible", !!logged);
            if (!logged && panel.classList.contains("ai-show")) toggleOpen(false);
        }, 800);
    }

    function toggleOpen(force) {
        var show = typeof force === "boolean" ? force : !panel.classList.contains("ai-show");
        panel.classList.toggle("ai-show", show);
        fab.classList.toggle("ai-open", show);
        if (show) {
            if (!greeted) {
                greeted = true;
                botSay("Merhaba 👋 Ben senin yapay zekâ asistanınım. Ders programın, ödevlerin ve siteyi kullanmak hakkında sorularını cevaplayabilirim.");
            }
            setTimeout(function () { input.focus(); }, 120);
        }
    }

    function say(role, text) {
        var m = document.createElement("div");
        m.className = "ai-msg " + role;
        m.textContent = text;
        body.insertBefore(m, typingEl);
        body.scrollTop = body.scrollHeight;
        return m;
    }
    function botSay(t) { say("bot", t); }
    function userSay(t) { say("user", t); }

    function typing(on) {
        typingEl.style.display = on ? "flex" : "none";
        if (on) body.scrollTop = body.scrollHeight;
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
            answer(v).then(function (txt) {
                typing(false);
                botSay(txt);
            }).catch(function () {
                typing(false);
                botSay("Bağlantıda bir sorun oldu. Lütfen biraz sonra tekrar deneyin.");
            }).then(function () {
                busy = false;
                sendBtn.disabled = false;
                input.focus();
            });
        }, 300);
    }

    /* ---------- Bilgi motoru ---------- */
    function dayLabelTR(d) {
        return { "pazartesi": "Pazartesi", "sali": "Salı", "carsamba": "Çarşamba", "persembe": "Perşembe", "cuma": "Cuma", "cumartesi": "Cumartesi", "pazar": "Pazar" }[String(d).toLowerCase()] || d;
    }

    function sched() {
        try {
            return (window.getScheduleData && window.getScheduleData()) || (window.cachedData && window.cachedData.classes) || [];
        } catch (e) { return []; }
    }

    function weeklyText() {
        try {
            var s = sched();
            if (!s.length) return null;
            var order = ["Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi", "Pazar"];
            var groups = {};
            s.forEach(function (x) {
                var k = dayLabelTR(x.dayLabel || x.day || "?");
                (groups[k] = groups[k] || []).push(x);
            });
            var lines = [];
            order.forEach(function (d) {
                if (groups[d]) {
                    lines.push(d + ":");
                    groups[d].slice().sort(function (a, b) { return String(a.time || "").localeCompare(String(b.time || "")); }).forEach(function (x) {
                        lines.push(" • " + x.title + " | " + x.time + " | " + x.instructor);
                    });
                }
            });
            return lines.length ? lines.join("\n") : null;
        } catch (e) { return null; }
    }

    function todayText() {
        var todayKey = (window.getTodayDOM && window.getTodayDOM()) || "";
        var list = sched().filter(function (x) { return String(x.day || "").toLowerCase() === String(todayKey).toLowerCase(); });
        if (!list.length) return "Bugün dersin yok. 🎈 Bu arada planına çalışma görevi ekleyebilirsin.";
        return "Bugün " + dayLabelTR(todayKey) + " derslerin:\n" + list.map(function (x) { return " • " + x.title + " | " + x.time + " | " + x.instructor; }).join("\n");
    }

    function findClassByQuery(q) {
        var n = norm(q);
        var skip = ["hangi", "hangı", "ders", "saat", "var", "mi", "mı", "bugun", "yarin", "ne", "zaman", "kac", "kaç", "olan", "oldugunu", "soru"];
        var words = n.split(" ").filter(function (w) { return w.length > 2 && skip.indexOf(w) === -1; });
        if (!words.length) return null;
        var hits = sched().filter(function (x) {
            var t = norm(x.title + " " + x.instructor + " " + x.classroom + " " + (x.description || ""));
            return words.some(function (w) { return t.indexOf(w) !== -1; });
        });
        if (!hits.length) return null;
        return hits.slice(0, 4).map(function (x) {
            return "• " + x.title + " (" + dayLabelTR(x.day) + ", " + x.time + ") — " + x.instructor + (x.liveState === "live" ? " — ŞU AN CANLI 🔴" : "");
        }).join("\n");
    }

    function homeworkText() {
        var hw = (window.cachedData && window.cachedData.homeworks) || [];
        if (!hw.length) return "Şu an eklenmiş ödev yok.";
        var sorted = hw.slice().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }).slice(0, 5);
        return "Son ödevlerin:\n" + sorted.map(function (h) {
            var t = (window.cachedData.teachers || []).find(function (x) { return x.id === h.teacherId; });
            var who = t ? " (" + t.name + " " + t.surname + ")" : "";
            return "• " + h.title + (h.subject ? " — " + h.subject : "") + (h.fileUrl ? " 📎" : "") + who;
        }).join("\n");
    }

    function recordingsText() {
        var recs = [];
        try { recs = (window.getRecordings && window.getRecordings()) || []; } catch (e) { recs = []; }
        if (!recs.length) return null;
        return "Ders kayıtların:\n" + recs.slice(0, 5).map(function (r) { return "• " + r.title + " (" + r.date + ")"; }).join("\n") + "\n\nHepsini ana sayfadaki 'Kayıtlar' bölümünden izleyebilirsin.";
    }

    function teacherText() {
        var ts = (window.cachedData && window.cachedData.teachers) || [];
        if (!ts.length) return null;
        return "Öğretmenlerin:\n" + ts.map(function (t) { return "• " + t.name + " " + t.surname + (t.branch ? " (" + t.branch + ")" : ""); }).join("\n");
    }

    /* ---------- Cevaplama ---------- */
    var RULES = [
        { keys: ["merhaba", "selam", "hey", "gunaydin", "iyi gunler", "iyi aksamlar", "mrb", "sa"], fn: function () { return "Merhaba! 👋 Derslerin, ödevlerin ya da siteyi kullanmak hakkında neyi merak ediyorsun?"; } },
        { keys: ["tesekkur", "sagol", "eyvallah"], fn: function () { return "Rica ederim! 🎈 Başka sorun olursa buradayım."; } },
        { keys: ["gorusuruz", "bay", "hoscakal", "kapat"], fn: function () { return "Görüşürüz! 📚 İyi dersler."; } },
        { keys: ["hafta", "program", "takvim", "derslerim", "ders program"], fn: function () { var t = weeklyText(); return t ? "Bu haftaki ders programın:\n" + t : "Veri henüz yüklenmedi. Birazdan tekrar sorabilirsin. 😊"; } },
        { keys: ["bugun", "bugunku"], fn: todayText },
        { keys: ["yarin", "yarinki"], fn: function () { return "Yarınki derslerin 'Ders Programı' sekmesinde görünür. Sağ üstteki gün filtrelerinden 'Yarın'a bakabilirsin 📅"; } },
        { keys: ["odev"], fn: homeworkText },
        { keys: ["kayit", "video", "izle", "kayd"], fn: function () { return recordingsText() || "Henüz senin için ders kaydı yok. Dersler bitince otomatik burada görünür."; } },
        { keys: ["ogretmen", "hoca"], fn: function () { return teacherText() || "Öğretmen listesi yükleniyor, birazdan sorabilirsin."; } },
        { keys: ["canli", "live", "gir", "katil", "derse", "odasi", "odas"], fn: function () { return "Canlı derse katılmak için:\n1) 'Ders Programı' sekmesine git.\n2) Dersin 'CANLI' etiketliyse 'Derse Katıl' butonuna bas.\n3) Katıl butonu ders başlamadan 10 dakika önce açılır.\n4) Giriş yaptıysan seni doğrudan ders odasına alır. 🎥"; } },
        { keys: ["site", "panel", "kullan", "nasil", "nası", "rehber", "yardim", "nerede", "nerden", "nere", "buton", "sayfa"], fn: function () { return "Sana özel panel şöyle:\n📅 Takvim → Ders günleri ve özel günler\n📖 Ders Programı → Haftanın dersleri + canlı giriş\n📝 Ödevler → Verilen ödevler ve dosyaları\n🎯 Kişisel Plan → Kendi çalışma planını ekle\n🎬 Kayıtlar → Bitmiş derslerin videoları\nSağ alttaki bu sohbet de hep yanında!"; } }
    ];

    function answer(q) {
        var n = norm(q);
        if (hasBad(q)) return Promise.resolve("Bu konuda sana yardım edemem. Derslerin ve site hakkında soru sorabilirsin! 🙂");

        var lessonWords = ["matemat", "fizik", "kimya", "biyolo", "turkce", "türkçe", "edebiyat", "ingiliz", "tarih", "cograf", "coğraf", "geometri", "bilgisayar", "fen", "muzik", "müzik", "din", "sosyal", "resim", "beden", "rehber"];
        var asksLesson = lessonWords.some(function (w) { return n.indexOf(w) !== -1; });
        if (asksLesson) {
            var found = findClassByQuery(n);
            if (found) return Promise.resolve("Buldum! 💡\n" + found + "\n\nDetay için ders kartındaki 'Detay' butonuna basabilirsin.");
        }

        for (var i = 0; i < RULES.length; i++) {
            if (RULES[i].keys.some(function (k) { return n.indexOf(k) !== -1; })) {
                var r = RULES[i].fn();
                if (r && typeof r === "string") return Promise.resolve(r);
            }
        }

        return apiAsk(q).catch(function () {
            return "Bu soruyu henüz öğrenmedim. Ders programın, ödevlerin ve site kullanımı hakkında bana sorabilirsin 😊\n\n(Opsiyonel: panelin ⚙ ayarlarından bir API anahtarı eklersen daha güçlü yapay zekâ da yanıtlayabilir.)";
        });
    }

    function apiAsk(q) {
        var key = localStorage.getItem("ai_api_key");
        if (!key) return Promise.reject(new Error("no-api-key"));
        var base = "https://api.openai.com/v1/chat/completions";
        var model = localStorage.getItem("ai_model") || "gpt-4o-mini";
        var sys = "Sen ONLİNE PİHOS okul sitesinin öğrenci asistanısın. Sadece öğrencinin dersleri, ödevleri, ders programı ve site kullanımı hakkında yardım et. Kısa, sade, dostça Türkçe cevap ver. Konu dışı veya zararlı konular için kibarca reddet.";
        return new Promise(function (resolve, reject) {
            var c = new AbortController();
            var t = setTimeout(function () { c.abort(); reject(new Error("timeout")); }, 30000);
            fetch(base, {
                method: "POST",
                headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
                body: JSON.stringify({ model: model, messages: [{ role: "system", content: sys }, { role: "user", content: q }], max_tokens: 500 }),
                signal: c.signal
            }).then(function (res) {
                if (!res.ok) throw new Error("http " + res.status);
                return res.json();
            }).then(function (j) {
                var txt = j && j.choices && j.choices[0] && j.choices[0].message ? j.choices[0].message.content : null;
                txt = (txt || "").trim();
                if (!txt || txt.length < 2) reject(new Error("empty"));
                else resolve(txt.length > 900 ? txt.slice(0, 900) : txt);
            }).catch(function (e) { reject(e); }).then(function () { clearTimeout(t); });
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", build);
    } else {
        build();
    }
})();