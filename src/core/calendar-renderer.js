import { state } from "../state.js";
import { formatDate } from "../utils/dates.js";
import { WORK_START_HOUR, WORK_END_HOUR, SLOT_HEIGHT, LESSON_DURATION } from "../config.js";
import {
    DAYS_SHORT, calcMinutesFromBase, calcTopPx, calcHeightPx,
    calcLessonPosition
} from "../utils/time-utils.js";

let showContextMenu = () => {};
let openPrepModal = () => {};
let openLessonEditModal = () => {};

export function setModalFunctions(fns) {
    showContextMenu = fns.showContextMenu;
    openPrepModal = fns.openPrepModal;
    openLessonEditModal = fns.openLessonEditModal;
}

// Довге натискання (touch) для елементів без drag — відкриває контекстне меню
function attachLongPress(el, menuDataFn) {
    let timer = null;
    let startX = 0;
    let startY = 0;

    const clear = () => {
        if (timer) { clearTimeout(timer); timer = null; }
    };

    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        startX = e.clientX;
        startY = e.clientY;
        clear();
        timer = setTimeout(() => {
            clear();
            const data = menuDataFn();
            if (!data) return;
            showContextMenu({
                preventDefault() {},
                clientX: startX,
                clientY: startY,
                pageX: startX + (window.scrollX || 0),
                pageY: startY + (window.scrollY || 0)
            }, data);
        }, 500);
    });

    el.addEventListener('pointermove', (e) => {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) > 12) clear();
    });

    el.addEventListener('pointerup', clear);
    el.addEventListener('pointercancel', clear);
    el.addEventListener('pointerleave', clear);
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
    el.dataset.date = currentDayStr;
    el.dataset.time = slotTimeStr;
    if (isNonWorking) el.classList.add('non-working');

    el.addEventListener('pointerenter', (e) => {
        if (!state.isNonWorkingEditMode && el.classList.contains('non-working')) return;
        if (state.isMouseDown && state.isNonWorkingEditMode) {
            state.selectedSlots.add(`${nwKey}|${recurringKey}`);
            el.classList.add('selecting');
        }
    });

    el.addEventListener('pointerdown', (e) => {
        if (!state.isNonWorkingEditMode || e.button !== 0) return;
        e.preventDefault();
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

    attachLongPress(el, () => state.isNonWorkingEditMode ? null : ({ dateStr: currentDayStr, timeStr: slotTimeStr, type: 'slot' }));

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
    attachLongPress(el, () => ({ type: 'prep_override', key: prepKey }));

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

    el.addEventListener('contextmenu', (e) => showContextMenu(e, { type: 'lesson', id: lesson.id, dateStr: currentDayStr }));

    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        initDrag(e, lesson, currentDayStr, () => openLessonEditModal(lesson.id), { sourceType: 'lesson' },
            () => ({ type: 'lesson', id: lesson.id, dateStr: currentDayStr }));
    });

    return el;
}

// --- Drag-and-drop ---

let dropHandler = null;

export function setDropHandler(cb) {
    dropHandler = cb;
}

function initDrag(e, lesson, dateStr, onClick, extra, menuDataFn) {
    const startX = e.clientX;
    const startY = e.clientY;
    const pointerId = e.pointerId;
    let isDragging = false;
    let longPressFired = false;
    const calendar = document.getElementById('calendarView');

    const cleanupHandlers = () => {
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
        document.removeEventListener('pointercancel', onUp);
        clearTimeout(longPressTimer);
    };

    const longPressTimer = setTimeout(() => {
        longPressFired = true;
        cleanupDrag();
        if (calendar) calendar.classList.remove('drag-active');
        if (menuDataFn) {
            showContextMenu({
                preventDefault() {},
                clientX: startX,
                clientY: startY,
                pageX: startX + (window.scrollX || 0),
                pageY: startY + (window.scrollY || 0)
            }, menuDataFn());
        }
    }, 500);

    const onMove = (ev) => {
        if (ev.pointerId !== pointerId && ev.pointerType !== 'mouse') return;
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        if (!isDragging && (dx * dx + dy * dy) > 25) {
            clearTimeout(longPressTimer);
            isDragging = true;
            if (calendar) calendar.classList.add('drag-active');
            createDragGhost(lesson.title, ev);
        }
        if (isDragging) {
            updateDragGhost(ev);
            highlightDropTarget(ev);
        }
    };

    const onUp = (ev) => {
        cleanupHandlers();
        cleanupDrag();
        if (calendar) calendar.classList.remove('drag-active');

        if (longPressFired) return;

        if (isDragging) {
            const target = getDropTarget(ev);
            if (target && dropHandler) {
                dropHandler({
                    lessonId: lesson.id,
                    lessonTitle: lesson.title,
                    lessonTime: lesson.startTime,
                    sourceDateStr: dateStr,
                    targetDateStr: target.dateStr,
                    targetTimeStr: target.timeStr,
                    ...extra
                });
            }
        } else if (ev.pointerType === 'mouse' && ev.button === 0) {
            onClick();
        }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
    document.addEventListener('pointercancel', onUp);
}

let dragGhost = null;

function createDragGhost(text, e) {
    dragGhost = document.createElement('div');
    dragGhost.className = 'drag-ghost';
    dragGhost.textContent = text;
    document.body.appendChild(dragGhost);
    positionDragGhost(e);
}

function positionDragGhost(e) {
    if (!dragGhost) return;
    dragGhost.style.left = (e.clientX + 12) + 'px';
    dragGhost.style.top = (e.clientY + 12) + 'px';
}

function updateDragGhost(e) {
    positionDragGhost(e);
}

function highlightDropTarget(e) {
    document.querySelectorAll('.slot.drop-target').forEach(s => s.classList.remove('drop-target'));
    const slot = getSlotFromPoint(e.clientX, e.clientY);
    if (slot) slot.classList.add('drop-target');
}

function getSlotFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    return el.closest('.slot');
}

function getDropTarget(e) {
    const slot = getSlotFromPoint(e.clientX, e.clientY);
    if (!slot) return null;
    const dateStr = slot.dataset.date;
    const timeStr = slot.dataset.time;
    if (!dateStr || !timeStr) return null;
    return { dateStr, timeStr };
}

function cleanupDrag() {
    if (dragGhost) {
        dragGhost.remove();
        dragGhost = null;
    }
    document.querySelectorAll('.slot.drop-target').forEach(s => s.classList.remove('drop-target'));
}

export function checkConflicts(lessonId, targetDateStr, targetTimeStr, excludeEventId, targetDuration = LESSON_DURATION) {
    const conflicts = [];
    const targetDayOfWeek = new Date(targetDateStr + 'T12:00:00').getDay();
    const [targetH, targetM] = targetTimeStr.split(':').map(Number);
    const targetStart = targetH * 60 + targetM;
    const targetEnd = targetStart + targetDuration;

    const movingLesson = state.lessons.find(l => l.id === lessonId);
    const hasMovingPrep = movingLesson && movingLesson.hasPrep;
    const prepStart = targetStart - 30;
    const prepEnd = targetStart;

    const overlap = (s1, e1, s2, e2) => s1 < e2 && e1 > s2;

    state.lessons.forEach(l => {
        if (l.id === lessonId) return;
        if (l.dayOfWeek !== targetDayOfWeek) return;
        if (state.cancelledDates.includes(`${l.id}_${targetDateStr}`)) return;
        const [lh, lm] = l.startTime.split(':').map(Number);
        const lStart = lh * 60 + lm;
        const lEnd = lStart + 90;

        if (overlap(targetStart, targetEnd, lStart, lEnd)) {
            conflicts.push({ type: 'lesson', msg: `"${l.title}" о ${l.startTime}` });
        }
        if (l.hasPrep && overlap(targetStart, targetEnd, lStart - 30, lStart)) {
            conflicts.push({ type: 'prep', msg: `відпрацювання "${l.title}" перед ${l.startTime}` });
        }
        if (hasMovingPrep && overlap(prepStart, prepEnd, lStart, lEnd)) {
            conflicts.push({ type: 'prep', msg: `урок "${l.title}" о ${l.startTime} — накладається на відпрацювання` });
        }
        if (hasMovingPrep && l.hasPrep && overlap(prepStart, prepEnd, lStart - 30, lStart)) {
            conflicts.push({ type: 'prep', msg: `відпрацювання "${l.title}" перед ${l.startTime}` });
        }
        if (hasMovingPrep && overlap(targetStart, targetEnd, lStart - 30, lStart)) {
            // already covered above, but keep for clarity
        }
    });

    const addTimeConflict = (label) => {
        conflicts.push({ type: 'conflict', msg: label });
    };

    state.movedLessons.forEach(ml => {
        if (ml.dateStr !== targetDateStr) return;
        const [mh, mm] = ml.timeStr.split(':').map(Number);
        const mStart = mh * 60 + mm;
        const mEnd = mStart + 90;
        if (overlap(targetStart, targetEnd, mStart, mEnd)) {
            addTimeConflict(`"${ml.title}" о ${ml.timeStr} (перенесений)`);
        }
        if (hasMovingPrep && overlap(prepStart, prepEnd, mStart, mEnd)) {
            addTimeConflict(`"${ml.title}" о ${ml.timeStr} (перенесений) — накладається на відпрацювання`);
        }
    });

    const isNonWorking = (dateStr, timeStr, dayOfWeek) => {
        const nw = `${dateStr}_${timeStr}`;
        const rec = `${dayOfWeek}_${timeStr}`;
        const recBlocked = state.recurringNonWorkingSlots.includes(rec);
        const exc = state.workingExceptions && state.workingExceptions.includes(nw);
        return state.nonWorkingSlots.includes(nw) || (recBlocked && !exc);
    };

    const timeStrLabel = `${String(targetH).padStart(2, '0')}:${String(targetM).padStart(2, '0')}`;
    if (isNonWorking(targetDateStr, timeStrLabel, targetDayOfWeek)) {
        addTimeConflict('неробочий час');
    }
    if (hasMovingPrep) {
        const prepH = Math.floor(((prepStart % 1440) + 1440) % 1440 / 60);
        const prepM = ((prepStart % 1440) + 1440) % 1440 % 60;
        const prepTimeStr = `${String(prepH).padStart(2, '0')}:${String(prepM).padStart(2, '0')}`;
        if (isNonWorking(targetDateStr, prepTimeStr, targetDayOfWeek)) {
            addTimeConflict('неробочий час на відпрацюванні');
        }
    }

    state.singleEvents.forEach(ev => {
        if (ev.id === excludeEventId) return;
        if (ev.dateStr !== targetDateStr) return;
        const [eh, em] = ev.timeStr.split(':').map(Number);
        const eStart = eh * 60 + em;
        const eEnd = eStart + ev.duration;
        if (overlap(targetStart, targetEnd, eStart, eEnd)) {
            addTimeConflict(`відпрацювання (1 год) о ${ev.timeStr}`);
        }
        if (hasMovingPrep && overlap(prepStart, prepEnd, eStart, eEnd)) {
            addTimeConflict(`відпрацювання (1 год) о ${ev.timeStr} — накладається на відпрацювання`);
        }
    });

    return conflicts;
}

function createMovedLessonBlock(ml) {
    const [h, m] = ml.timeStr.split(':').map(Number);
    const { topPx, heightPx } = calcLessonPosition(h, m);

    const el = document.createElement('div');
    el.className = 'event-block event-lesson';
    el.style.top = `${topPx}px`;
    el.style.height = `${heightPx - 2}px`;
    el.innerText = ml.title;

    el.addEventListener('contextmenu', (e) => showContextMenu(e, {
        type: 'moved_lesson', id: ml.id, lessonId: ml.lessonId, dateStr: ml.dateStr
    }));

    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        initDrag(e, { id: ml.lessonId, title: ml.title, startTime: ml.timeStr }, ml.dateStr,
            () => openLessonEditModal(ml.lessonId),
            { sourceType: 'moved_lesson', movedLessonId: ml.id },
            () => ({ type: 'moved_lesson', id: ml.id, lessonId: ml.lessonId, dateStr: ml.dateStr })
        );
    });

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

    el.addEventListener('pointerdown', (e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        initDrag(e, { id: event.id, title: `Відпр: ${sText}`, startTime: event.timeStr, duration: event.duration }, event.dateStr,
            () => openPrepModal(event.id, event.studentName || '', event.groupName || '', false),
            { sourceType: 'single_event' },
            () => ({ type: 'single_event', id: event.id })
        );
    });

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
    const todayStr = formatDate(new Date());
    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(state.currentWeekStart);
        dayDate.setDate(dayDate.getDate() + i);
        const dayNum = dayDate.getDate();
        const monthNum = dayDate.getMonth() + 1;
        const cell = document.createElement('div');
        cell.className = 'header-cell' + (formatDate(dayDate) === todayStr ? ' today' : '');
        cell.innerHTML = `${DAYS_SHORT[i]}<br><span>${dayNum}.${monthNum}</span>`;
        header.appendChild(cell);
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
