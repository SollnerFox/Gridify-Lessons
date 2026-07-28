import { state, formatDate } from "./state.js";
import { WORK_START_HOUR, WORK_END_HOUR, SLOT_HEIGHT } from "./config.js";
import {
    DAYS_SHORT, calcMinutesFromBase, calcTopPx, calcHeightPx,
    calcLessonPosition
} from "./time-utils.js";

let showContextMenu = () => {};
let openPrepModal = () => {};
let openLessonEditModal = () => {};

export function setModalFunctions(fns) {
    showContextMenu = fns.showContextMenu;
    openPrepModal = fns.openPrepModal;
    openLessonEditModal = fns.openLessonEditModal;
}

function resolvePrepData(prepKey, groupName) {
    const prepData = state.prepOverrides[prepKey];
    const isCompleted = state.completedPreps.includes(prepKey);
    let studentName = '';
    let displayGroup = groupName;
    if (typeof prepData === 'string') {
        studentName = prepData;
    } else if (prepData) {
        studentName = prepData.studentName || '';
        displayGroup = prepData.groupName || groupName;
    }
    return { isCompleted, studentName, displayGroup };
}

function createSlotElement(hour, minute, currentDayStr, dayOfWeek) {
    const slotTimeStr = `${String(hour).padStart(2, '0')}:${minute}`;
    const nwKey = `${currentDayStr}_${slotTimeStr}`;
    const recurringKey = `${dayOfWeek}_${slotTimeStr}`;

    const isRecurring = state.recurringNonWorkingSlots.includes(recurringKey);
    const hasException = state.workingExceptions && state.workingExceptions.includes(nwKey);
    const isLocal = state.nonWorkingSlots.includes(nwKey);
    const isNonWorking = (isRecurring && !hasException) || isLocal;

    const el = document.createElement('div');
    el.className = `slot ${minute === '00' ? 'slot-hour' : 'slot-half'}`;
    if (isNonWorking) el.classList.add('non-working');

    el.addEventListener('mouseenter', () => {
        if (!state.isNonWorkingEditMode && el.classList.contains('non-working')) return;
        if (state.isMouseDown && state.isNonWorkingEditMode) {
            state.selectedSlots.add(`${nwKey}|${recurringKey}`);
            el.classList.add('selecting');
        }
    });

    el.addEventListener('mousedown', (e) => {
        if (!state.isNonWorkingEditMode || e.button !== 0) return;
        state.isMouseDown = true;
        state.selectedSlots.clear();
        state.isSelectingMode = !el.classList.contains('non-working');
        state.selectedSlots.add(`${nwKey}|${recurringKey}`);
        el.classList.add('selecting');
    });

    el.addEventListener('contextmenu', (e) => {
        if (!state.isNonWorkingEditMode) {
            showContextMenu(e, { dateStr: currentDayStr, timeStr: slotTimeStr, type: 'slot' });
        }
    });

    return el;
}

function createPrepBlock(id, dateStr, topPx, heightPx, groupName) {
    const prepKey = `${id}_${dateStr}`;
    const { isCompleted, studentName, displayGroup } = resolvePrepData(prepKey, groupName);

    const el = document.createElement('div');
    el.className = `event-block event-prep ${isCompleted ? 'completed' : ''}`;
    el.style.top = `${topPx}px`;
    el.style.height = `${heightPx - 2}px`;
    el.style.minHeight = '34px';

    const studentText = studentName.trim() ? studentName : 'Вільно';
    el.innerHTML = `<div>Відпрацювання (30 хв):</div><div>${studentText}</div>`;

    el.addEventListener('click', () => openPrepModal(prepKey, studentName, displayGroup, true));
    el.addEventListener('contextmenu', (e) => showContextMenu(e, { type: 'prep_override', key: prepKey }));

    return el;
}

function createLessonBlock(lesson, currentDayStr, dayOfWeek) {
    if (lesson.dayOfWeek !== dayOfWeek) return null;
    if (currentDayStr < lesson.startDate || currentDayStr > lesson.endDate) return null;
    if (state.cancelledDates.includes(`${lesson.id}_${currentDayStr}`)) return null;

    const [h, m] = lesson.startTime.split(':').map(Number);
    const { topPx, heightPx } = calcLessonPosition(h, m);

    const el = document.createElement('div');
    el.className = 'event-block event-lesson';
    el.style.top = `${topPx}px`;
    el.style.height = `${heightPx - 2}px`;

    const formattedEndDate = lesson.endDate ? lesson.endDate.split('-').reverse().join('.') : '';
    el.innerHTML = `
        <div class="lesson-title">${lesson.title}</div>
        <div class="lesson-end-date" style="font-size: 0.72rem; font-style: italic; opacity: 0.85; margin-top: 2px;">До: ${formattedEndDate}</div>
    `;

    el.addEventListener('click', () => openLessonEditModal(lesson.id));
    el.addEventListener('contextmenu', (e) => showContextMenu(e, { type: 'lesson', id: lesson.id, dateStr: currentDayStr }));

    return el;
}

function createMovedLessonBlock(ml) {
    const [h, m] = ml.timeStr.split(':').map(Number);
    const { topPx, heightPx } = calcLessonPosition(h, m);

    const el = document.createElement('div');
    el.className = 'event-block event-lesson';
    el.style.top = `${topPx}px`;
    el.style.height = `${heightPx - 2}px`;
    el.innerText = ml.title;

    el.addEventListener('click', () => openLessonEditModal(ml.lessonId));
    el.addEventListener('contextmenu', (e) => showContextMenu(e, {
        type: 'moved_lesson', id: ml.id, lessonId: ml.lessonId, dateStr: ml.dateStr
    }));

    return el;
}

function createSingleEventBlock(event) {
    const [h, m] = event.timeStr.split(':').map(Number);
    const topPx = (calcMinutesFromBase(h, m) / 30) * SLOT_HEIGHT;
    const heightPx = (event.duration / 30) * SLOT_HEIGHT;
    const isCompleted = state.completedPreps.includes(event.id);

    let sText = event.studentName || 'ВІЛЬНО';
    if (event.groupName) sText += ` (${event.groupName})`;

    const el = document.createElement('div');
    el.className = `event-block event-prep60 ${isCompleted ? 'completed' : ''}`;
    el.style.top = `${topPx}px`;
    el.style.height = `${heightPx - 2}px`;
    el.innerText = `Відпрацювання (1 год): ${sText}`;

    el.addEventListener('click', () => openPrepModal(event.id, event.studentName || '', event.groupName || '', false));
    el.addEventListener('contextmenu', (e) => showContextMenu(e, { type: 'single_event', id: event.id }));

    return el;
}

export function renderWeekLabel() {
    const el = document.getElementById('week-label');
    if (!el) return;
    const weekEnd = new Date(state.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    el.innerText = `${state.currentWeekStart.toLocaleDateString('uk')} — ${weekEnd.toLocaleDateString('uk')}`;
}

export function renderGridHeader() {
    const header = document.getElementById('gridHeader');
    if (!header) return;
    header.innerHTML = '<div class="header-cell">Час</div>';
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(state.currentWeekStart);
        dayDate.setDate(dayDate.getDate() + i);
        const dayNum = dayDate.getDate();
        const monthNum = dayDate.getMonth() + 1;
        header.innerHTML += `<div class="header-cell">${DAYS_SHORT[i]}<br><span>${dayNum}.${monthNum}</span></div>`;
    }
}

export function renderTimeColumn(offsetMins) {
    const col = document.createElement('div');
    col.className = 'time-column';
    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
        let total = hour * 60 + offsetMins;
        total = ((total % 1440) + 1440) % 1440;
        const hh = Math.floor(total / 60);
        const mm = total % 60;
        col.innerHTML += `<div class="time-cell">${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}</div>`;
    }
    return col;
}

export function renderDayColumn(dayIndex) {
    const currentDayDate = new Date(state.currentWeekStart);
    currentDayDate.setDate(currentDayDate.getDate() + dayIndex);
    const currentDayStr = formatDate(currentDayDate);
    const dayOfWeek = currentDayDate.getDay();

    const dayCol = document.createElement('div');
    dayCol.className = 'day-col';

    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
        ['00', '30'].forEach(minute => {
            dayCol.appendChild(createSlotElement(hour, minute, currentDayStr, dayOfWeek));
        });
    }

    state.lessons.forEach(l => {
        const lessonEl = createLessonBlock(l, currentDayStr, dayOfWeek);
        if (!lessonEl) return;
        dayCol.appendChild(lessonEl);

        if (l.hasPrep) {
            const [h, m] = l.startTime.split(':').map(Number);
            const base = calcMinutesFromBase(h, m) - 30;
            dayCol.appendChild(createPrepBlock(l.id, currentDayStr, calcTopPx(base), calcHeightPx(30), l.title));
        }
    });

    state.movedLessons.forEach(ml => {
        if (ml.dateStr !== currentDayStr) return;
        dayCol.appendChild(createMovedLessonBlock(ml));

        const baseLesson = state.lessons.find(l => l.id === ml.lessonId);
        if (baseLesson && baseLesson.hasPrep) {
            const [h, m] = ml.timeStr.split(':').map(Number);
            const base = calcMinutesFromBase(h, m) - 30;
            dayCol.appendChild(createPrepBlock(ml.lessonId, ml.dateStr, calcTopPx(base), calcHeightPx(30), ml.title));
        }
    });

    state.singleEvents.forEach(ev => {
        if (ev.dateStr !== currentDayStr) return;
        dayCol.appendChild(createSingleEventBlock(ev));
    });

    return dayCol;
}
