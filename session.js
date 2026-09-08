/* Oturum yönetimi: 3 saat süre + tek cihaz girişi (Firebase _sessions) */
var SITE_SESSION_MS = 3 * 60 * 60 * 1000;
var SESSIONS_URL = (typeof FIREBASE_URL !== "undefined" ? FIREBASE_URL : "") + "/_sessions";

function siteSessionGet(k) { return sessionStorage.getItem(k); }

function siteSessionSet(k, v) { sessionStorage.setItem(k, v); }

function siteSessionClear() {
    ["siteLogged", "siteUser", "siteLoginAt", "siteToken", "teacherLogged", "teacherId", "teacherName"].forEach(function (k) {
        sessionStorage.removeItem(k);
    });
}

function siteSessionToken() { return siteSessionGet("siteToken"); }

function siteSessionExpired() {
    var at = parseInt(siteSessionGet("siteLoginAt") || "0", 10);
    if (!at) return true;
    return Date.now() - at > SITE_SESSION_MS;
}

function siteStudentIdResolver(cachedData) {
    var u = sessionStorage.getItem("siteUser");
    if (!u) return "default";
    var st = (cachedData.students || []).find(function (s) { return (s.name + " " + s.surname) === u; });
    return st ? st.id : "default";
}

async function siteSessionIsActive(cachedData) {
    if (sessionStorage.getItem("siteLogged") !== "true") return false;
    if (siteSessionExpired()) return false;
    var id = siteStudentIdResolver(cachedData);
    var tok = siteSessionToken();
    if (!tok) return false;
    try {
        var res = await fetch(SESSIONS_URL + "/" + encodeURIComponent(id) + ".json?t=" + Date.now(), { cache: "no-store" });
        if (!res.ok) return true;
        var data = await res.json();
        return !!(data && data.token && data.token === tok);
    } catch (e) { return true; }
}

async function siteSessionWrite(cachedData) {
    var id = siteStudentIdResolver(cachedData);
    var tok = siteSessionToken();
    if (!tok) return;
    try {
        await fetch(SESSIONS_URL + "/" + encodeURIComponent(id) + ".json", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: tok, at: Date.now(), device: String(navigator.userAgent).slice(0, 80) })
        });
    } catch (e) { /* sessiz */ }
}

async function siteSessionRelease(cachedData) {
    var id = siteStudentIdResolver(cachedData);
    var tok = siteSessionToken();
    if (!tok) return;
    try {
        var res = await fetch(SESSIONS_URL + "/" + encodeURIComponent(id) + ".json", { cache: "no-store" });
        if (res.ok) {
            var data = await res.json();
            if (data && data.token && data.token === tok) {
                await fetch(SESSIONS_URL + "/" + encodeURIComponent(id) + ".json", { method: "DELETE" });
            }
        }
    } catch (e) { /* sessiz */ }
}