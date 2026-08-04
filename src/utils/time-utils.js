import { state } from "../state.js";
import { WORK_START_HOUR, LESSON_DURATION, SLOT_HEIGHT } from "../config.js";

export const DAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

let kyivFormatter = null;
let targetFormatter = null;
let lastTz = '';

function ensureFormatters(tz) {
    const opts = { hour: '2-digit', minute: '2-digit', hour12: false };
    if (!kyivFormatter) {
        kyivFormatter = new Intl.DateTimeFormat('en', { ...opts, timeZone: 'Europe/Kyiv' });
    }
    if (!targetFormatter || lastTz !== tz) {
        targetFormatter = new Intl.DateTimeFormat('en', { ...opts, timeZone: tz });
        lastTz = tz;
    }
}

export function getTzOffsetMinutes() {
    let tz = state.currentTz || 'Europe/Kyiv';
    if (tz === 'GMT' || tz === 'UTC') tz = 'Etc/UTC';
    ensureFormatters(tz);

    const now = new Date();
    const [kh, km] = kyivFormatter.format(now).split(':').map(Number);
    const [th, tm] = targetFormatter.format(now).split(':').map(Number);

    let diff = (th * 60 + tm) - (kh * 60 + km);
    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;
    return diff;
}

export function getTargetDate() {
    let tz = state.currentTz || 'Europe/Kyiv';
    if (tz === 'GMT' || tz === 'UTC') tz = 'Etc/UTC';
    const tzString = new Date().toLocaleString('en-US', { timeZone: tz });
    return new Date(tzString);
}

export function calcMinutesFromBase(h, m) {
    return (h * 60 + m) - (WORK_START_HOUR * 60);
}

export function calcTopPx(minutesFromBase) {
    return (minutesFromBase / 30) * SLOT_HEIGHT;
}

export function calcHeightPx(durationMinutes) {
    return (durationMinutes / 30) * SLOT_HEIGHT;
}

export function calcLessonPosition(h, m) {
    const base = calcMinutesFromBase(h, m);
    return { topPx: calcTopPx(base), heightPx: calcHeightPx(LESSON_DURATION) };
}
