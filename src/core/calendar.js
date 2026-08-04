import { state } from "../state.js";
import { getMonday, formatDate } from "../utils/dates.js";
import { saveAllData } from "../services/storage.js";
import { WORK_START_HOUR, WORK_END_HOUR, SLOT_HEIGHT } from "../config.js";
import { getTzOffsetMinutes, getTargetDate, calcMinutesFromBase, calcTopPx } from "../utils/time-utils.js";
import { renderWeekLabel, renderGridHeader, renderTimeColumn, renderDayColumn } from "./calendar-renderer.js";

export { getTzOffsetMinutes } from "../utils/time-utils.js";

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
        if (btn) { btn.innerHTML = '<i class="ph ph-pencil-slash"></i> <span class="mode-label">Режим: Неробочі години (активний)</span>'; btn.classList.add('active'); }
        if (calendarView) calendarView.classList.add('edit-non-working');
        if (globalWrapper) globalWrapper.style.display = 'flex';
    } else {
        if (btn) { btn.innerHTML = '<i class="ph ph-pencil-simple"></i> <span class="mode-label">Режим: Звичайний</span>'; btn.classList.remove('active'); }
        if (calendarView) calendarView.classList.remove('edit-non-working');
        if (globalWrapper) globalWrapper.style.display = 'none';
    }
}

function applyGlobalSelection(nwKey, recurringKey) {
    if (state.isSelectingMode) {
        if (!state.recurringNonWorkingSlots.includes(recurringKey)) {
            state.recurringNonWorkingSlots.push(recurringKey);
        }
        state.workingExceptions = state.workingExceptions.filter(k => k !== nwKey);
    } else {
        state.recurringNonWorkingSlots = state.recurringNonWorkingSlots.filter(k => k !== recurringKey);
    }
}

function applyLocalSelection(nwKey, recurringKey) {
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

export function applyDragSelection() {
    const globalToggle = document.getElementById('globalNonWorking');
    const isGlobal = globalToggle ? globalToggle.checked : false;

    if (!state.workingExceptions) state.workingExceptions = [];

    state.selectedSlots.forEach(comboKey => {
        const [nwKey, recurringKey] = comboKey.split('|');
        if (isGlobal) {
            applyGlobalSelection(nwKey, recurringKey);
        } else {
            applyLocalSelection(nwKey, recurringKey);
        }
    });

    saveAllData();
    state.selectedSlots.clear();
    renderCalendar();
}

export function renderCalendar() {
    renderWeekLabel();
    renderGridHeader();

    const body = document.getElementById('gridBody');
    if (!body) return;
    body.innerHTML = '';

    const offsetMins = getTzOffsetMinutes();
    body.appendChild(renderTimeColumn(offsetMins));

    for (let i = 0; i < 7; i++) {
        body.appendChild(renderDayColumn(i));
    }

    updateCurrentTimeLine();
}

export function updateCurrentTimeLine() {
    document.querySelectorAll('.current-time-line').forEach(el => el.remove());

    const targetDate = getTargetDate();
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
                const topPx = calcTopPx(calcMinutesFromBase(kyivHour, kyivMin));
                const lineEl = document.createElement('div');
                lineEl.className = 'current-time-line';
                lineEl.style.top = `${topPx}px`;
                dayCols[i].appendChild(lineEl);
            }
            break;
        }
    }
}
