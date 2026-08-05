import { describe, it, expect } from 'vitest';
import { layoutDay } from '../src/utils/event-layout.js';

function overlaps(a, b) {
    return a.start < b.end && a.end > b.start;
}

function withRect(layout, i) {
    const { col, numCols, colSpan } = layout[i];
    return {
        col,
        numCols,
        colSpan,
        left: col / numCols,
        right: (col + colSpan) / numCols
    };
}

// Інваріанти: жодна подія не виходить за межі колонки;
// події з повністю однаковою колонкою не перетинаються за часом.
function checkInvariants(events, layout) {
    for (let i = 0; i < events.length; i++) {
        const r = withRect(layout, i);
        expect(r.left).toBeGreaterThanOrEqual(0);
        expect(r.right).toBeLessThanOrEqual(1);
        expect(r.right).toBeGreaterThan(r.left);

        for (let j = i + 1; j < events.length; j++) {
            const s = withRect(layout, j);
            const sameColumn = r.left === s.left && r.right === s.right && r.colSpan === 1 && s.colSpan === 1;
            if (sameColumn && r.numCols === s.numCols) {
                expect(overlaps(events[i], events[j])).toBe(false);
            }
        }
    }
}

describe('layoutDay', () => {
    it('послідовні події без перетину — кожна на всю ширину', () => {
        const events = [{ start: 0, end: 30 }, { start: 30, end: 60 }, { start: 90, end: 120 }];
        const res = layoutDay(events);
        res.forEach(r => expect(r).toEqual({ col: 0, numCols: 1, colSpan: 1 }));
    });

    it('дві перехресні події — у дві колонки', () => {
        const events = [{ start: 0, end: 30 }, { start: 15, end: 45 }];
        const res = layoutDay(events);
        expect(res[0].numCols).toBe(2);
        expect(res[1].numCols).toBe(2);
        expect(res[0].col).not.toBe(res[1].col);
        expect(res[0].colSpan).toBe(1);
        expect(res[1].colSpan).toBe(1);
    });

    it('три одночасні події — три колонки', () => {
        const events = [{ start: 0, end: 30 }, { start: 0, end: 30 }, { start: 0, end: 30 }];
        const res = layoutDay(events);
        res.forEach(r => expect(r.numCols).toBe(3));
        expect(new Set(res.map(r => r.col)).size).toBe(3);
    });

    it('група перехресних + пізніша окрема подія — остання на всю ширину', () => {
        const events = [{ start: 0, end: 30 }, { start: 15, end: 45 }, { start: 60, end: 90 }];
        const res = layoutDay(events);
        expect(res[0].numCols).toBe(2);
        expect(res[1].numCols).toBe(2);
        expect(res[2]).toEqual({ col: 0, numCols: 1, colSpan: 1 });
    });

    it('подія може зайняти кілька колонок, якщо сусідні не конфліктують', () => {
        // E1 [0–30], E2 [0–30] — перетин => дві колонки.
        // B [15–45] перетинає обидві => третя колонка (міст у кластері).
        // E3 [30–60] стає у кол.0 (E1 закінчилась) і розтягується на кол.1 (E2 теж закінчилась).
        const events = [
            { start: 0, end: 30 },   // E1
            { start: 0, end: 30 },   // E2
            { start: 15, end: 45 },  // B (міст)
            { start: 30, end: 60 }   // E3
        ];
        const res = layoutDay(events);
        // B (індекс 2) у третій колонці
        expect(res[2].numCols).toBe(3);
        expect(res[2].col).toBe(2);
        // E3 (індекс 3): кол.0, розтягнута на вільну кол.1 => colSpan 2
        expect(res[3].col).toBe(0);
        expect(res[3].numCols).toBe(3);
        expect(res[3].colSpan).toBe(2);
    });

    it('календарні інваріанти на складному наборі', () => {
        const events = [
            { start: 0, end: 90 },
            { start: 30, end: 60 },
            { start: 60, end: 150 },
            { start: 150, end: 180 },
            { start: 160, end: 240 },
            { start: 240, end: 270 },
            { start: 255, end: 300 }
        ];
        checkInvariants(events, layoutDay(events));
    });
});
