// Layout перекриттів подій у колонці дня (як у Google Calendar / AOSP week view).
// Чиста функція: {start, end} -> { col, numCols, colSpan }.

export function layoutDay(events) {
    const sorted = [...events].sort((a, b) => a.start - b.start || b.end - a.end);

    const clusters = [];
    let cur = null;
    for (const ev of sorted) {
        if (!cur || ev.start >= cur.endMax) {
            cur = { events: [], endMax: ev.end };
            clusters.push(cur);
        }
        cur.events.push(ev);
        cur.endMax = Math.max(cur.endMax, ev.end);
    }

    const out = new Map();
    for (const cluster of clusters) {
        const cols = [];
        for (const ev of cluster.events) {
            let placed = false;
            for (let i = 0; i < cols.length; i++) {
                const last = cols[i][cols[i].length - 1];
                if (last.end <= ev.start) {
                    cols[i].push(ev);
                    ev.col = i;
                    placed = true;
                    break;
                }
            }
            if (!placed) {
                cols.push([ev]);
                ev.col = cols.length - 1;
            }
        }

        const numCols = cols.length;
        for (const ev of cluster.events) {
            let colSpan = 1;
            for (let i = ev.col + 1; i < cols.length; i++) {
                const collides = cols[i].some((other) => overlap(ev, other));
                if (collides) break;
                colSpan++;
            }
            out.set(ev, { col: ev.col, numCols, colSpan });
        }
    }

    return events.map((ev) => out.get(ev));
}

function overlap(a, b) {
    return a.start < b.end && a.end > b.start;
}
