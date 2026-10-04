const SUPABASE_URL = "https://flidmsxgoxsrlesgmyps.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_FGyytcnGGNnDKGJHV_fgoQ_M2YSezLR";

const supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);

console.log("Supabase ühendus loodud!");
const form = document.querySelector("#training-form");
const drillInput = document.querySelector("#drill");
const categoryInput = document.querySelector("#category");
const attemptsInput = document.querySelector("#attempts");
const hitsInput = document.querySelector("#hits");
const message = document.querySelector("#form-message");
const historyContainer = document.querySelector("#history");

let sessions = [];

try {
    const savedSessions = localStorage.getItem("pooltracker-sessions");
    sessions = savedSessions ? JSON.parse(savedSessions) : [];

    if (!Array.isArray(sessions)) {
        sessions = [];
    }
} catch {
    sessions = [];
}

function saveSessions() {
    try {
        localStorage.setItem(
            "pooltracker-sessions",
            JSON.stringify(sessions)
        );
        return true;
    } catch {
        return false;
    }
}

function updateStats() {
    const totalAttempts = sessions.reduce(
        (sum, session) => sum + session.attempts,
        0
    );

    const totalHits = sessions.reduce(
        (sum, session) => sum + session.hits,
        0
    );

    const accuracy = totalAttempts === 0
        ? 0
        : Math.round((totalHits / totalAttempts) * 100);

    document.querySelector("#session-count").textContent =
        sessions.length;

    document.querySelector("#attempt-count").textContent =
        totalAttempts;

    document.querySelector("#accuracy").textContent =
        accuracy + "%";
}

function renderHistory() {
    historyContainer.replaceChildren();

    if (sessions.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.className = "muted";
        emptyMessage.textContent =
            "Sinu esimesed tulemused ilmuvad siia.";

        historyContainer.appendChild(emptyMessage);
        return;
    }

    [...sessions].reverse().forEach((session) => {
        const item = document.createElement("article");
        item.className = "history-item";

        const title = document.createElement("strong");
        title.textContent = session.drill;

        const category = document.createElement("p");
        category.textContent =
            "Kategooria: " + (session.category || "Muu");

        const details = document.createElement("p");
        details.textContent =
            `${session.hits}/${session.attempts} tabamust · ${session.date}`;

        const result = document.createElement("p");
        result.className = "result";
        result.textContent = `Tabavus: ${session.accuracy}%`;

        const actions = document.createElement("div");
        actions.className = "history-actions";

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-button";
        deleteButton.type = "button";
        deleteButton.textContent = "Kustuta";

        deleteButton.addEventListener("click", () => {
            const confirmed = window.confirm(
                `Kas soovid kustutada treeningu "${session.drill}"?`
            );

            if (!confirmed) {
                return;
            }

            const originalIndex = sessions.indexOf(session);

            if (originalIndex !== -1) {
                sessions.splice(originalIndex, 1);

                if (!saveSessions()) {
                    message.textContent =
                        "Muudatust ei saanud brauserisse salvestada.";
                } else {
                    message.textContent = "Treening kustutatud.";
                }

                updateStats();
                renderHistory();
            }
        });

        actions.appendChild(deleteButton);
        item.append(title, category, details, result, actions);
        historyContainer.appendChild(item);
    });
}

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const drill = drillInput.value.trim();
    const category = categoryInput.value;
    const attempts = Number(attemptsInput.value);
    const hits = Number(hitsInput.value);

    if (
        !drill ||
        !Number.isSafeInteger(attempts) ||
        !Number.isSafeInteger(hits) ||
        attempts < 1 ||
        hits < 0 ||
        hits > attempts
    ) {
        message.textContent =
            "Kontrolli andmeid: tabamused peavad jääma 0 ja katsete arvu vahele.";
        return;
    }

    const accuracy = Math.round((hits / attempts) * 100);

    const session = {
        drill,
        category,
        attempts,
        hits,
        accuracy,
        date: new Date().toLocaleString("et-EE")
    };

    sessions.push(session);

    if (!saveSessions()) {
        sessions.pop();
        message.textContent =
            "Salvestamine ebaõnnestus. Kontrolli brauseri salvestusseadeid.";
        return;
    }

    updateStats();
    renderHistory();

    message.textContent =
        `Salvestatud! Sinu tabavus oli ${accuracy}%.`;

    form.reset();
});

updateStats();
renderHistory();

const chartCanvas = document.querySelector("#progress-chart");
const chartFilter = document.querySelector("#chart-category");
const chartEmpty = document.querySelector("#chart-empty");

function renderChart() {
    const ctx = chartCanvas.getContext("2d");
    const width = chartCanvas.clientWidth;
    const height = chartCanvas.clientHeight;

    if (!width || !height) return;

    const pixelRatio = window.devicePixelRatio || 1;

    chartCanvas.width = width * pixelRatio;
    chartCanvas.height = height * pixelRatio;

    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const selectedCategory = chartFilter.value;

    const filteredSessions = sessions.filter((session) => {
        const category = session.category || "Muu";

        return selectedCategory === "all" ||
            category === selectedCategory;
    });

    if (filteredSessions.length === 0) {
        chartEmpty.hidden = false;
        return;
    }

    chartEmpty.hidden = true;

    const padding = {
        top: 15,
        right: 15,
        bottom: 35,
        left: 42
    };

    const graphWidth = width - padding.left - padding.right;
    const graphHeight = height - padding.top - padding.bottom;

    // Joonistame horisontaalsed abijooned ja protsendid.
    ctx.font = "12px Arial";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let percent = 0; percent <= 100; percent += 25) {
        const y = padding.top +
            graphHeight * (1 - percent / 100);

        ctx.beginPath();
        ctx.strokeStyle = "#2a4032";
        ctx.lineWidth = 1;
        ctx.moveTo(padding.left, y);
        ctx.lineTo(width - padding.right, y);
        ctx.stroke();

        ctx.fillStyle = "#aabbb0";
        ctx.fillText(
            percent + "%",
            padding.left - 8,
            y
        );
    }

    // Arvutame iga treeningu asukoha graafikul.
    const points = filteredSessions.map((session, index) => {
        const x = filteredSessions.length === 1
            ? padding.left + graphWidth / 2
            : padding.left +
                (index / (filteredSessions.length - 1)) *
                graphWidth;

        const y = padding.top +
            graphHeight * (1 - session.accuracy / 100);

        return { x, y, session };
    });

    // Ühendame tulemused joonega.
    if (points.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = "#79d99a";
        ctx.lineWidth = 3;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });

        ctx.stroke();
    }

    // Märgime iga treeningu tulemuse ringiga.
    points.forEach((point, index) => {
        ctx.beginPath();
        ctx.fillStyle = "#79d99a";
        ctx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Kuvame esimese, viimase ja üksiku treeningu numbri.
        if (
            index === 0 ||
            index === points.length - 1
        ) {
            ctx.fillStyle = "#f2f6f3";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillText(
                String(index + 1),
                point.x,
                height - padding.bottom + 12
            );
        }
    });

    ctx.fillStyle = "#aabbb0";
    ctx.textAlign = "left";
    ctx.textBaseline = "bottom";
    ctx.fillText("Treening", padding.left, height - 2);
}

chartFilter.addEventListener("change", renderChart);

window.addEventListener("resize", renderChart);

renderChart();