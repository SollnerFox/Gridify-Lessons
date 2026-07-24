import { state, getMonday, formatDate } from "./state.js";
import { saveAllData } from "./storage.js";
import { showContextMenu, openPrepModal, openLessonEditModal } from "./modals.js";
import { WORK_START_HOUR, WORK_END_HOUR, LESSON_DURATION, SLOT_HEIGHT } from "./config.js";

export function getTzOffsetMinutes() {
    let tz = state.currentTz || 'Europe/Kyiv';

    if (tz === 'GMT' || tz === 'UTC') {
        tz = 'Etc/UTC';
    }

    const now = new Date();

    const kyivFormatter = new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Europe/Kyiv'
    });

    const targetFormatter = new Intl.DateTimeFormat('en', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: tz
    });

    const [kh, km] = kyivFormatter.format(now).split(':').map(Number);
    const [th, tm] = targetFormatter.format(now).split(':').map(Number);

    let diff = (th * 60 + tm) - (kh * 60 + km);

    if (diff > 720) diff -= 1440;
    if (diff < -720) diff += 1440;

    return diff;
}

export function changeWeek(offset) {
    if (offset === 0) state.currentWeekStart = getMonday(new Date());
    else state.currentWeekStart.setDate(state.currentWeekStart.getDate() + (offset * 7));
    renderCalendar();
}

export function toggleEditMode() {
    state.isNonWorkingEditMode = !state.isNonWorkingEditMode;
    const btn = document.getElementById('modeBtn');
    const calendarView = document.getElementById('calendarView');
    const globalWrapper = document.getElementById('globalNonWorkingWrapper');

    if (state.isNonWorkingEditMode) {
        if (btn) { btn.innerHTML = '<i class="ph ph-pencil-slash"></i> Режим: Неробочі години (активний)'; btn.classList.add('active'); }
        if (calendarView) calendarView.classList.add('edit-non-working');
        if (globalWrapper) globalWrapper.style.display = 'flex';
    } else {
        if (btn) { btn.innerHTML = '<i class="ph ph-pencil-simple"></i> Режим: Звичайний'; btn.classList.remove('active'); }
        if (calendarView) calendarView.classList.remove('edit-non-working');
        if (globalWrapper) globalWrapper.style.display = 'none';
    }
}

function toggleSlotSelection(el, nwKey, recurringKey) {
    state.selectedSlots.add(`${nwKey}|${recurringKey}`);
    el.classList.add('selecting');
}

export function applyDragSelection() {
    const globalToggle = document.getElementById('globalNonWorking');
    const isGlobal = globalToggle ? globalToggle.checked : false;

    if (!state.workingExceptions) {
        state.workingExceptions = [];
    }

    state.selectedSlots.forEach(comboKey => {
        const [nwKey, recurringKey] = comboKey.split('|');

        if (isGlobal) {
            if (state.isSelectingMode) {
                if (!state.recurringNonWorkingSlots.includes(recurringKey)) {
                    state.recurringNonWorkingSlots.push(recurringKey);
                }
                state.workingExceptions = state.workingExceptions.filter(k => k !== nwKey);
            } else {
                state.recurringNonWorkingSlots = state.recurringNonWorkingSlots.filter(k => k !== recurringKey);
            }
        } else {
            const isRecurring = state.recurringNonWorkingSlots.includes(recurringKey);

            if (state.isSelectingMode) {
                if (isRecurring) {
                    state.workingExceptions = state.workingExceptions.filter(k => k !== nwKey);
                } else {
                    if (!state.nonWorkingSlots.includes(nwKey)) {
                        state.nonWorkingSlots.push(nwKey);
                    }
                }
            } else {
                if (isRecurring) {
                    if (!state.workingExceptions.includes(nwKey)) {
                        state.workingExceptions.push(nwKey);
                    }
                }
                state.nonWorkingSlots = state.nonWorkingSlots.filter(k => k !== nwKey);
            }
        }
    });

    saveAllData();
    state.selectedSlots.clear();
    renderCalendar();
}

export function renderCalendar() {
    const weekLabel = document.getElementById('week-label');
    if (!weekLabel) return;
    const weekEnd = new Date(state.currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekLabel.innerText = `${state.currentWeekStart.toLocaleDateString('uk')} — ${weekEnd.toLocaleDateString('uk')}`;

    const offsetMins = getTzOffsetMinutes();

    const header = document.getElementById('gridHeader');
    if (!header) return;
    header.innerHTML = '<div class="header-cell">Час</div>';
    const daysShort = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'];

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(state.currentWeekStart);
        dayDate.setDate(dayDate.getDate() + i);
        // ВИПРАВЛЕННЯ: Правильне форматування дати
        const dayNum = dayDate.getDate();
        const monthNum = dayDate.getMonth() + 1;
        header.innerHTML += `<div class="header-cell">${daysShort[i]}<br><span>${dayNum}.${monthNum}</span></div>`;
    }

    const body = document.getElementById('gridBody');
    if (!body) return;
    body.innerHTML = '';

    const timeCol = document.createElement('div');
    timeCol.className = 'time-column';

    for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
        let total = hour * 60 + offsetMins;
        total = ((total % 1440) + 1440) % 1440;

        const hh = Math.floor(total / 60);
        const mm = total % 60;

        timeCol.innerHTML += `
        <div class="time-cell">
            ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}
        </div>
    `;
    }
    body.appendChild(timeCol);

    for (let i = 0; i < 7; i++) {
        const dayCol = document.createElement('div');
        dayCol.className = 'day-col';

        const currentDayDate = new Date(state.currentWeekStart);
        currentDayDate.setDate(currentDayDate.getDate() + i);
        const currentDayStr = formatDate(currentDayDate);
        const dayOfWeek = currentDayDate.getDay();

        for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
            ['00', '30'].forEach(minute => {
                const slotTimeStr = `${String(hour).padStart(2, '0')}:${minute}`;
                const nwKey = `${currentDayStr}_${slotTimeStr}`;
                const recurringKey = `${dayOfWeek}_${slotTimeStr}`;

                const isRecurring = state.recurringNonWorkingSlots.includes(recurringKey);
                const hasException = state.workingExceptions && state.workingExceptions.includes(nwKey);
                const isLocal = state.nonWorkingSlots.includes(nwKey);
                const isNonWorking = (isRecurring && !hasException) || isLocal;

                const slotEl = document.createElement('div');
                slotEl.className = `slot ${minute === '00' ? 'slot-hour' : 'slot-half'}`;

                if (isNonWorking) {
                    slotEl.classList.add('non-working');
                }

                slotEl.onmouseenter = () => {
                    if (!state.isNonWorkingEditMode && slotEl.classList.contains('non-working')) return;
                    if (state.isMouseDown && state.isNonWorkingEditMode) toggleSlotSelection(slotEl, nwKey, recurringKey);
                };

                slotEl.onmousedown = (e) => {
                    if (!state.isNonWorkingEditMode || e.button !== 0) return;
                    state.isMouseDown = true;
                    state.selectedSlots.clear();
                    state.isSelectingMode = !slotEl.classList.contains('non-working');
                    toggleSlotSelection(slotEl, nwKey, recurringKey);
                };

                slotEl.oncontextmenu = (e) => {
                    if (!state.isNonWorkingEditMode) showContextMenu(e, { dateStr: currentDayStr, timeStr: slotTimeStr, type: 'slot' });
                };

                dayCol.appendChild(slotEl);
            });
        }

        state.lessons.forEach(l => {
            const [h, m] = l.startTime.split(':').map(Number);

            if (l.dayOfWeek === dayOfWeek) {
                if (currentDayStr >= l.startDate && currentDayStr <= l.endDate) {
                    if (state.cancelledDates.includes(`${l.id}_${currentDayStr}`)) return;

                    const startMinutesFromBase = (h * 60 + m) - (WORK_START_HOUR * 60);
                    const topPx = (startMinutesFromBase / 30) * SLOT_HEIGHT;
                    const heightPx = (LESSON_DURATION / 30) * SLOT_HEIGHT;

                    const lessonEl = document.createElement('div');
                    lessonEl.className = 'event-block event-lesson';
                    lessonEl.style.top = `${topPx}px`;
                    lessonEl.style.height = `${heightPx - 2}px`;

                    const formattedEndDate = l.endDate ? l.endDate.split('-').reverse().join('.') : '';

                    lessonEl.innerHTML = `
                        <div class="lesson-title">${l.title}</div>
                        <div class="lesson-end-date" style="font-size: 0.72rem; font-style: italic; opacity: 0.85; margin-top: 2px;">До: ${formattedEndDate}</div>
                    `;

                    lessonEl.onclick = () => openLessonEditModal(l.id);
                    lessonEl.oncontextmenu = (e) => showContextMenu(e, { type: 'lesson', id: l.id, dateStr: currentDayStr });
                    dayCol.appendChild(lessonEl);

                    if (l.hasPrep) {
                        const prepStartMinutes = startMinutesFromBase - 30;
                        const prepTopPx = (prepStartMinutes / 30) * SLOT_HEIGHT;
                        const prepHeightPx = (30 / 30) * SLOT_HEIGHT;

                        const prepKey = `${l.id}_${currentDayStr}`;
                        const prepData = state.prepOverrides[prepKey];
                        const isCompleted = state.completedPreps.includes(prepKey);

                        let sName = '';
                        let gName = l.title;
                        if (typeof prepData === 'string') {
                            sName = prepData;
                        } else if (prepData) {
                            sName = prepData.studentName || '';
                            gName = prepData.groupName || l.title;
                        }

                        const prepEl = document.createElement('div');
                        prepEl.className = `event-block event-prep ${isCompleted ? 'completed' : ''}`;
                        prepEl.style.top = `${prepTopPx}px`;
                        prepEl.style.height = `${prepHeightPx - 2}px`;
                        prepEl.style.minHeight = '34px';

                        const studentText = sName.trim() ? sName : 'Вільно';
                        prepEl.innerHTML = `<div>Відпрацювання (30 хв):</div><div>${studentText}</div>`;

                        prepEl.onclick = () => openPrepModal(prepKey, sName, gName, true);
                        prepEl.oncontextmenu = (e) => showContextMenu(e, { type: 'prep_override', key: prepKey });
                        dayCol.appendChild(prepEl);
                    }
                }
            }
        });

        state.movedLessons.forEach(ml => {
            if (ml.dateStr === currentDayStr) {
                const [h, m] = ml.timeStr.split(':').map(Number);
                const startMinutesFromBase = (h * 60 + m) - (WORK_START_HOUR * 60);
                const topPx = (startMinutesFromBase / 30) * SLOT_HEIGHT;
                const heightPx = (LESSON_DURATION / 30) * SLOT_HEIGHT;

                const lessonEl = document.createElement('div');
                lessonEl.className = 'event-block event-lesson';
                lessonEl.style.top = `${topPx}px`;
                lessonEl.style.height = `${heightPx - 2}px`;

                lessonEl.innerText = ml.title;
                lessonEl.onclick = () => openLessonEditModal(ml.lessonId);
                lessonEl.oncontextmenu = (e) => showContextMenu(e, {
                    type: 'moved_lesson',
                    id: ml.id,
                    lessonId: ml.lessonId,
                    dateStr: ml.dateStr
                });
                dayCol.appendChild(lessonEl);

                // Якщо базовий урок містить відпрацювання, рендеримо його разом із перенесеним уроком
                const baseLesson = state.lessons.find(l => l.id === ml.lessonId);
                if (baseLesson && baseLesson.hasPrep) {
                    const prepStartMinutes = startMinutesFromBase - 30;
                    const prepTopPx = (prepStartMinutes / 30) * SLOT_HEIGHT;
                    const prepHeightPx = (30 / 30) * SLOT_HEIGHT;

                    // ВИПРАВЛЕННЯ: Використовуємо ml.dateStr замість currentDayStr для ключа
                    const prepKey = `${ml.lessonId}_${ml.dateStr}`;
                    const prepData = state.prepOverrides[prepKey];
                    const isCompleted = state.completedPreps.includes(prepKey);

                    let sName = '';
                    let gName = ml.title;
                    if (typeof prepData === 'string') {
                        sName = prepData;
                    } else if (prepData) {
                        sName = prepData.studentName || '';
                        gName = prepData.groupName || ml.title;
                    }

                    const prepEl = document.createElement('div');
                    prepEl.className = `event-block event-prep ${isCompleted ? 'completed' : ''}`;
                    prepEl.style.top = `${prepTopPx}px`;
                    prepEl.style.height = `${prepHeightPx - 2}px`;
                    prepEl.style.minHeight = '34px';

                    const studentText = sName.trim() ? sName : 'Вільно';
                    prepEl.innerHTML = `<div>Відпрацювання (30 хв):</div><div>${studentText}</div>`;

                    prepEl.onclick = () => openPrepModal(prepKey, sName, gName, true);
                    prepEl.oncontextmenu = (e) => showContextMenu(e, { type: 'prep_override', key: prepKey });
                    dayCol.appendChild(prepEl);
                }
            }
        });

        state.singleEvents.forEach(e => {
            if (e.dateStr === currentDayStr) {
                const [h, m] = e.timeStr.split(':').map(Number);
                const startMinutesFromBase = (h * 60 + m) - (WORK_START_HOUR * 60);
                const topPx = (startMinutesFromBase / 30) * SLOT_HEIGHT;
                const heightPx = (e.duration / 30) * SLOT_HEIGHT;
                const isCompleted = state.completedPreps.includes(e.id);

                let sText = e.studentName || 'ВІЛЬНО';
                if (e.groupName) sText += ` (${e.groupName})`;

                const prepEl = document.createElement('div');
                prepEl.className = `event-block event-prep60 ${isCompleted ? 'completed' : ''}`;
                prepEl.style.top = `${topPx}px`;
                prepEl.style.height = `${heightPx - 2}px`;
                prepEl.innerText = `Відпрацювання (1 год): ${sText}`;

                prepEl.onclick = () => openPrepModal(e.id, e.studentName || '', e.groupName || '', false);
                prepEl.oncontextmenu = (ev) => showContextMenu(ev, { type: 'single_event', id: e.id });
                dayCol.appendChild(prepEl);
            }
        });

        body.appendChild(dayCol);
    }

    updateCurrentTimeLine();
}

export function updateCurrentTimeLine() {
    document.querySelectorAll('.current-time-line').forEach(el => el.remove());

    let tz = state.currentTz || 'Europe/Kyiv';
    if (tz === 'GMT' || tz === 'UTC') {
        tz = 'Etc/UTC';
    }

    const now = new Date();
    const tzString = now.toLocaleString('en-US', { timeZone: tz });
    const targetDate = new Date(tzString);

    const offsetMins = getTzOffsetMinutes();
    const targetMins = targetDate.getHours() * 60 + targetDate.getMinutes();
    const kyivMins = targetMins - offsetMins;

    const kyivHour = Math.floor(kyivMins / 60);
    const kyivMin = kyivMins % 60;

    if (kyivHour < WORK_START_HOUR || kyivHour >= WORK_END_HOUR) return;

    const body = document.getElementById('gridBody');
    if (!body) return;

    const currentDayStr = formatDate(targetDate);

    for (let i = 0; i < 7; i++) {
        const dayDate = new Date(state.currentWeekStart);
        dayDate.setDate(dayDate.getDate() + i);
        if (formatDate(dayDate) === currentDayStr) {
            const dayCols = body.querySelectorAll('.day-col');
            if (dayCols[i]) {
                const startMinutesFromBase = (kyivHour - WORK_START_HOUR) * 60 + kyivMin;
                const topPx = (startMinutesFromBase / 30) * SLOT_HEIGHT;

                const lineEl = document.createElement('div');
                lineEl.className = 'current-time-line';
                lineEl.style.top = `${topPx}px`;
                dayCols[i].appendChild(lineEl);
            }
            break;
        }
    }
}