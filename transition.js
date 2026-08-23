(function () {
    const OVERLAY_HTML = `
        <div class="tr-overlay" id="trOverlay">
            <div class="tr-stage">
                <span class="tr-ring"></span>
                <span class="tr-ring"></span>
                <span class="tr-ring"></span>
                <img src="images.png" alt="" class="tr-logo">
            </div>
        </div>`;

    function getOverlay() {
        let o = document.getElementById("trOverlay");
        if (!o) {
            document.body.insertAdjacentHTML("beforeend", OVERLAY_HTML);
            o = document.getElementById("trOverlay");
        }
        return o;
    }

    function show() { getOverlay().classList.add("active"); }
    function hide() {
        const o = document.getElementById("trOverlay");
        if (o) o.classList.remove("active");
    }

    function isInternalPageLink(href) {
        if (!/\.html(\?.*)?$/.test(href)) return false;
        return !/^https?:\/\//i.test(href) || href.indexOf(location.host) !== -1;
    }

    document.addEventListener("click", (e) => {
        const a = e.target.closest("a");
        if (!a || !a.href) return;
        if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button !== 0) return;

        const href = a.getAttribute("href");

        if (!href || href === "#") return;

        if (href.charAt(0) === "#") {
            const target = document.querySelector(href);
            if (!target) return;
            e.preventDefault();
            show();
            setTimeout(() => {
                target.scrollIntoView({ behavior: "smooth" });
                setTimeout(hide, 550);
            }, 650);
            return;
        }

        if (a.target === "_blank") return;

        if (isInternalPageLink(href)) {
            e.preventDefault();
            sessionStorage.setItem("trNav", "1");
            show();
            setTimeout(() => { location.href = a.href; }, 750);
        }
    });

    if (sessionStorage.getItem("trNav") === "1") {
        sessionStorage.removeItem("trNav");
        const start = () => {
            show();
            setTimeout(hide, 1000);
        };
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", start);
        } else {
            start();
        }
    }
})();
