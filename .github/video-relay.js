const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const DB = "https://one-egitim-default-rtdb.firebaseio.com";
const VIDEO_DIR = "videos";
const REPO = "oneregitimkurumlari/oneregitimkurumlari";
const SITE_URL = "https://oneregitimkurumlari.github.io/oneregitimkurumlari";
const IS_CI = process.env.CI === "true";
const GH_TOKEN = process.env.GH_TOKEN || "";

async function getJSON(p) {
    const r = await fetch(DB + "/" + p + ".json");
    if (!r.ok) throw new Error("GET " + p + " → HTTP " + r.status);
    return r.json();
}

async function putJSON(p, obj) {
    const r = await fetch(DB + "/" + p + ".json", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(obj)
    });
    if (!r.ok) throw new Error("PUT " + p + " → HTTP " + r.status);
    return r;
}

async function deleteNode(p) {
    const r = await fetch(DB + "/" + p + ".json", { method: "DELETE" });
    if (!r.ok) throw new Error("DELETE " + p + " → HTTP " + r.status);
}

function gitFile(path) {
    execSync("git config user.email \"oneregitimkurumlari@users.noreply.github.com\"");
    execSync("git config user.name \"Video Relay\"");
    try {
        execSync("git add -A " + path);
    } catch (e) {
        execSync("git add " + JSON.stringify(path));
    }
}

async function main() {
    fs.mkdirSync(VIDEO_DIR, { recursive: true });

    const pending = await getJSON("rec_pending");
    if (!pending) {
        console.log("rec_pending yok — bekleyen kayıt bulunamadı.");
        return;
    }

    const stamps = Object.keys(pending).filter(k => pending[k] && pending[k].meta && pending[k].meta.status === "pending");
    console.log("Bekleyen kayıt sayısı:", stamps.length);

    const processed = [];

    for (const stamp of stamps) {
        const meta = pending[stamp].meta;
        if (typeof meta.totalChunks !== "number" || meta.totalChunks < 1) continue;

        let b64 = "";
        for (let i = 0; i < meta.totalChunks; i++) {
            const ci = String(i).padStart(3, "0");
            const chunk = pending[stamp]["c" + ci];
            if (!chunk || typeof chunk.d !== "string") {
                console.log("Eksik parça:", stamp, "/c" + ci, "— atlanıyor.");
                b64 = "";
                break;
            }
            b64 += chunk.d;
        }
        if (!b64) continue;

        const outPath = path.join(VIDEO_DIR, stamp + ".webm");
        fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
        console.log("İndirildi:", meta.fname || stamp, "→", outPath, "(", fs.statSync(outPath).size, "byte )");
        processed.push(stamp);
    }

    if (processed.length) {
        if (IS_CI) {
            try {
                gitFile(VIDEO_DIR);
                const status = execSync("git status --porcelain").toString();
                if (status.trim()) {
                    execSync("git commit -m \"video-relay: " + processed.length + " yeni kayıt\"");
                    const pushUrl = GH_TOKEN
                        ? "https://x-access-token:" + GH_TOKEN + "@github.com/" + REPO + ".git"
                        : "https://github.com/" + REPO + ".git";
                    execSync("git push " + pushUrl + " HEAD:master", { stdio: "inherit" });
                    console.log("Commit push edildi:", processed.length, "video.");
                } else {
                    console.log("Değişiklik yok — commit atlandı.");
                }
            } catch (e) {
                console.error("Commit/push hatası:", e.message);
            }
        } else {
            console.log("CI değil — commit/push atlandı (yerel test).");
        }
    }

    for (const stamp of processed) {
        try {
            const root = await getJSON("");
            if (root && Array.isArray(root.classes)) {
                for (const c of root.classes) {
                    let changed = false;
                    if (Array.isArray(c.recordings)) {
                        for (const r of c.recordings) {
                            if (r && r.url === "pending:" + stamp) {
                                r.url = SITE_URL + "/videos/" + stamp + ".webm";
                                delete r.pending;
                                changed = true;
                            }
                        }
                    }
                    if (c.recordingUrl === "pending:" + stamp) {
                        c.recordingUrl = SITE_URL + "/videos/" + stamp + ".webm";
                        changed = true;
                    }
                    if (changed) {
                        await putJSON("", root);
                        break;
                    }
                }
            }
            await deleteNode("rec_pending/" + stamp);
            console.log("Kayıt hazır işaretlendi + kuyruk temizlendi:", stamp, "→", SITE_URL + "/videos/" + stamp + ".webm");
        } catch (err) {
            console.error("Hazır işaretleme hatası:", stamp, err.message);
        }
    }
}

main().catch(err => {
    console.error("video-relay hatası:", err);
    process.exit(1);
});