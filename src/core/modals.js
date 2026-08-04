import { state } from "../state.js";

import { saveAllData } from "../services/storage.js";

import { renderCalendar } from "./calendar.js";
import { checkConflicts } from "./calendar-renderer.js";

import { WORK_START_HOUR, WORK_END_HOUR, LESSON_DURATION } from "../config.js";

export function resetLessonForm() {

    const titleInput = document.getElementById('title');

    const daySelect = document.getElementById('dayOfWeek');

    const startTimeInput = document.getElementById('startTime');

    const hasPrepInput = document.getElementById('hasPrep');

    const startDateInput = document.getElementById('startDate');

    const endDateInput = document.getElementById('endDate');

    if (titleInput) titleInput.value = '';

    if (daySelect) daySelect.value = '';

    if (startTimeInput) startTimeInput.value = '10:00';

    if (hasPrepInput) hasPrepInput.checked = false;

    const today = new Date();

    const yyyy = today.getFullYear();

    const mm = String(today.getMonth() + 1).padStart(2, '0');

    const dd = String(today.getDate()).padStart(2, '0');

    if (startDateInput) startDateInput.value = `${yyyy}-${mm}-${dd}`;

    const nextYear = new Date();

    nextYear.setFullYear(today.getFullYear() + 1);

    const nyyyy = nextYear.getFullYear();

    const nmm = String(nextYear.getMonth() + 1).padStart(2, '0');

    const ndd = String(nextYear.getDate()).padStart(2, '0');

    if (endDateInput) endDateInput.value = `${nyyyy}-${nmm}-${ndd}`;

}

export function addLesson() {

    const title = document.getElementById('title').value.trim();

    const dayOfWeek = parseInt(document.getElementById('dayOfWeek').value);

    const startTime = document.getElementById('startTime').value;

    const hasPrep = document.getElementById('hasPrep').checked;

    const startDate = document.getElementById('startDate').value;

    const endDate = document.getElementById('endDate').value;

    if (!title || isNaN(dayOfWeek) || !startTime || !startDate || !endDate) {

        alert('Будь ласка, заповніть усі поля форми створення групи.');

        return;

    }

    const newLesson = {

        id: 'lesson_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),

        title,

        dayOfWeek,

        startTime,

        hasPrep,

        startDate,

        endDate

    };

    state.lessons.push(newLesson);

    saveAllData();

    renderCalendar();

    resetLessonForm();

}

let activePrepKey = null;

// modals.js - ПРОБЛЕМА: Неправильна обробка групи при відкритті prep modal
// ВИПРАВЛЕНА ФУНКЦІЯ openPrepModal
export function openPrepModal(key, currentStudentName = '', currentGroupName = '', isLocked = false) {
    activePrepKey = key;

    const nameInput = document.getElementById('modalStudentName');
    const groupSelect = document.getElementById('modalGroupName');
    const completedCheckbox = document.getElementById('modalPrepCompleted');

    if (nameInput) nameInput.value = currentStudentName || '';

    if (groupSelect) {
        const uniqueGroups = [...new Set(state.lessons.map(l => l.title))];
        groupSelect.innerHTML = '<option value="" disabled selected hidden>Оберіть групу</option>';

        uniqueGroups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g;
            opt.innerText = g;
            if (g === currentGroupName) {
                opt.selected = true;
            }
            groupSelect.appendChild(opt);
        });

        // ВИПРАВЛЕННЯ: Додаємо поточну групу, якщо її немає в списку
        if (currentGroupName && !uniqueGroups.includes(currentGroupName)) {
            const opt = document.createElement('option');
            opt.value = currentGroupName;
            opt.innerText = currentGroupName;
            opt.selected = true;
            groupSelect.appendChild(opt);
        }

        // ДОДАНО: Якщо немає груп, показуємо повідомлення
        if (uniqueGroups.length === 0 && !currentGroupName) {
            groupSelect.innerHTML = '<option value="" disabled selected>Немає груп</option>';
            groupSelect.disabled = true;
        } else {
            groupSelect.disabled = isLocked;
        }
    }

    if (completedCheckbox) {
        completedCheckbox.checked = state.completedPreps.includes(key);
    }

    const modal = document.getElementById('prepModal');
    if (modal) modal.style.display = 'flex';
}

export function closeModal() {

    const modal = document.getElementById('prepModal');

    if (modal) modal.style.display = 'none';

    activePrepKey = null;

}

export function savePrepStudent() {

    if (!activePrepKey) return;

    const nameInput = document.getElementById('modalStudentName');
    const groupSelect = document.getElementById('modalGroupName');
    const completedCheckbox = document.getElementById('modalPrepCompleted');

    const studentName = nameInput ? nameInput.value.trim() : '';
    const groupName = groupSelect ? groupSelect.value : '';
    const isCompleted = completedCheckbox ? completedCheckbox.checked : false;

    if (activePrepKey.startsWith('single_')) {
        const ev = state.singleEvents.find(e => e.id === activePrepKey);
        if (ev) {
            ev.studentName = studentName;
            ev.groupName = groupName;
        }
    } else {
        if (studentName || groupName) {
            state.prepOverrides[activePrepKey] = {
                studentName: studentName,
                groupName: groupName
            };
        } else {
            delete state.prepOverrides[activePrepKey];
        }
    }

    if (isCompleted) {
        if (!state.completedPreps.includes(activePrepKey)) {
            state.completedPreps.push(activePrepKey);
        }
    } else {
        state.completedPreps = state.completedPreps.filter(k => k !== activePrepKey);
    }

    saveAllData();
    renderCalendar();
    closeModal();
}

let activeLessonEditId = null;

export function openLessonEditModal(lessonId) {

    activeLessonEditId = lessonId;

    const lesson = state.lessons.find(l => l.id === lessonId);

    const titleInput = document.getElementById('modalLessonTitle');

    if (lesson && titleInput) {

        titleInput.value = lesson.title;

    }

    const modal = document.getElementById('lessonEditModal');

    if (modal) modal.style.display = 'flex';

}

export function closeLessonEditModal() {

    const modal = document.getElementById('lessonEditModal');

    if (modal) modal.style.display = 'none';

    activeLessonEditId = null;

}

// modals.js - ПРОБЛЕМА: Неправильна обробка видалення prep при редагуванні назви
// ВИПРАВЛЕНА ФУНКЦІЯ saveLessonTitle
export function saveLessonTitle() {
    if (!activeLessonEditId) return;
    const titleInput = document.getElementById('modalLessonTitle');
    const newTitle = titleInput ? titleInput.value.trim() : '';
    if (!newTitle) return;

    const lesson = state.lessons.find(l => l.id === activeLessonEditId);
    if (lesson) {
        const oldTitle = lesson.title;
        lesson.title = newTitle;

        if (oldTitle !== newTitle) {
            // ВИПРАВЛЕННЯ: Правильно оновлюємо prepOverrides
            Object.keys(state.prepOverrides).forEach(key => {
                const prep = state.prepOverrides[key];
                if (prep && typeof prep === 'object' && prep.groupName === oldTitle) {
                    prep.groupName = newTitle;
                }
            });

            // Оновлюємо singleEvents
            if (state.singleEvents) {
                state.singleEvents.forEach(ev => {
                    if (ev.groupName === oldTitle) {
                        ev.groupName = newTitle;
                    }
                });
            }

            // ДОДАНО: Оновлюємо movedLessons
            if (state.movedLessons) {
                state.movedLessons.forEach(ml => {
                    if (ml.lessonId === activeLessonEditId) {
                        ml.title = newTitle;
                    }
                });
            }
        }

        saveAllData();
        renderCalendar();
    }
    closeLessonEditModal();
}

let contextMenuData = null;

export function showContextMenu(e, data) {

    e.preventDefault();

    contextMenuData = data;

    const menu = document.getElementById('contextMenu');

    if (!menu) return;

    const slotActions = document.getElementById('ctx-slot-actions');

    const lessonActions = document.getElementById('ctx-lesson-actions');

    const otherActions = document.getElementById('ctx-other-actions');

    if (slotActions) slotActions.style.display = 'none';

    if (lessonActions) lessonActions.style.display = 'none';

    if (otherActions) otherActions.style.display = 'none';

    if (data.type === 'slot') {

        if (slotActions) slotActions.style.display = 'block';

    } else if (data.type === 'lesson' || data.type === 'moved_lesson') {

        if (lessonActions) lessonActions.style.display = 'block';

    } else {

        if (otherActions) otherActions.style.display = 'block';

    }

    menu.style.display = 'block';

    const menuWidth = menu.offsetWidth;

    const menuHeight = menu.offsetHeight;

    let left = e.pageX;

    let top = e.pageY;

    if (e.clientX + menuWidth > window.innerWidth) {

        left = e.pageX - menuWidth;

    }

    if (e.clientY + menuHeight > window.innerHeight) {

        top = e.pageY - menuHeight;

    }

    left = Math.max(window.scrollX, left);

    top = Math.max(window.scrollY, top);

    menu.style.left = `${left}px`;

    menu.style.top = `${top}px`;

}

// modals.js - ПОВНА ВИПРАВЛЕНА ФУНКЦІЯ
export function handleContextMenuAction(action) {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
    if (!contextMenuData) return;
    const { type, id, lessonId, dateStr, timeStr, key } = contextMenuData;

    if (action === 'prep60') {
        const newEvent = {
            id: 'single_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            dateStr: dateStr,
            timeStr: timeStr,
            duration: 60,
            studentName: '',
            groupName: ''
        };
        state.singleEvents.push(newEvent);
        saveAllData();
        renderCalendar();
    } else if (action === 'toggleFullDayNonWorking') {
        if (!state.workingExceptions) state.workingExceptions = [];
        if (!state.fullDayBlockedSlots) state.fullDayBlockedSlots = [];
        if (!state.fullDayRemovedExceptions) state.fullDayRemovedExceptions = [];

        const slotTimes = [];
        for (let hour = WORK_START_HOUR; hour < WORK_END_HOUR; hour++) {
            ['00', '30'].forEach(minute => {
                slotTimes.push(`${String(hour).padStart(2, '0')}:${minute}`);
            });
        }
        const dayOfWeek = new Date(dateStr + 'T12:00:00').getDay();

        const allNonWorking = slotTimes.every(slotTimeStr => {
            const nwKey = `${dateStr}_${slotTimeStr}`;
            const recurringKey = `${dayOfWeek}_${slotTimeStr}`;
            const isRecurring = state.recurringNonWorkingSlots.includes(recurringKey);
            const hasException = state.workingExceptions.includes(nwKey);
            const isLocal = state.nonWorkingSlots.includes(nwKey);
            return (isRecurring && !hasException) || isLocal;
        });

        if (allNonWorking) {
            slotTimes.forEach(slotTimeStr => {
                const nwKey = `${dateStr}_${slotTimeStr}`;

                if (state.fullDayBlockedSlots.includes(nwKey)) {
                    state.nonWorkingSlots = state.nonWorkingSlots.filter(k => k !== nwKey);
                    state.fullDayBlockedSlots = state.fullDayBlockedSlots.filter(k => k !== nwKey);
                }

                if (state.fullDayRemovedExceptions.includes(nwKey)) {
                    if (!state.workingExceptions.includes(nwKey)) {
                        state.workingExceptions.push(nwKey);
                    }
                    state.fullDayRemovedExceptions = state.fullDayRemovedExceptions.filter(k => k !== nwKey);
                }
            });
        } else {
            slotTimes.forEach(slotTimeStr => {
                const nwKey = `${dateStr}_${slotTimeStr}`;
                const recurringKey = `${dayOfWeek}_${slotTimeStr}`;
                const isRecurring = state.recurringNonWorkingSlots.includes(recurringKey);

                const hadException = state.workingExceptions.includes(nwKey);

                state.workingExceptions = state.workingExceptions.filter(k => k !== nwKey);

                if (!isRecurring && !state.nonWorkingSlots.includes(nwKey)) {
                    state.nonWorkingSlots.push(nwKey);
                    if (!state.fullDayBlockedSlots.includes(nwKey)) {
                        state.fullDayBlockedSlots.push(nwKey);
                    }
                }

                if (hadException) {
                    if (!state.fullDayRemovedExceptions.includes(nwKey)) {
                        state.fullDayRemovedExceptions.push(nwKey);
                    }
                }
            });
        }
        saveAllData();
        renderCalendar();
    } else if (action === 'move_single_lesson') {
        if (type === 'lesson') {
            const l = state.lessons.find(item => item.id === id);
            const lessonTitle = l ? l.title : '';
            const lessonTime = l ? l.startTime : timeStr;
            openMoveLessonModal('lesson', id, dateStr, lessonTitle, dateStr, lessonTime);
        } else if (type === 'moved_lesson') {
            const ml = state.movedLessons.find(item => item.id === id);
            if (ml) {
                openMoveLessonModal('moved_lesson', ml.lessonId, ml.dateStr, ml.title, ml.dateStr, ml.timeStr, ml.id);
            } else {
                const l = state.lessons.find(item => item.id === lessonId);
                const lessonTitle = l ? l.title : '';
                const lessonTime = l ? l.startTime : timeStr;
                openMoveLessonModal('lesson', lessonId, dateStr, lessonTitle, dateStr, lessonTime);
            }
        } else if (type === 'single_event') {
            const ev = state.singleEvents.find(item => item.id === id);
            const evDate = ev ? ev.dateStr : dateStr;
            const evTime = ev ? ev.timeStr : timeStr;
            openMoveLessonModal('single_event', id, evDate, '', evDate, evTime);
        }
    } else if (action === 'cancel_single_date') {
        if (type === 'lesson') {
            const cancelKey = `${id}_${dateStr}`;
            if (!state.cancelledDates.includes(cancelKey)) {
                state.cancelledDates.push(cancelKey);
            }

            const prepKey = `${id}_${dateStr}`;
            if (state.prepOverrides[prepKey]) {
                delete state.prepOverrides[prepKey];
            }
            state.completedPreps = state.completedPreps.filter(k => k !== prepKey);

            saveAllData();
            renderCalendar();
        } else if (type === 'moved_lesson') {
            const movedToDelete = state.movedLessons.find(ml => ml.id === id);
            if (movedToDelete) {
                // ВИПРАВЛЕННЯ: Правильно видаляємо moved_lesson
                state.movedLessons = state.movedLessons.filter(ml => ml.id !== id);

                // Скасовуємо оригінальний урок на оригінальну дату
                const cancelKey = `${movedToDelete.lessonId}_${movedToDelete.originalDateStr || movedToDelete.dateStr}`;
                if (!state.cancelledDates.includes(cancelKey)) {
                    state.cancelledDates.push(cancelKey);
                }

                // Видаляємо prep для перенесеного уроку
                const prepKey = `${movedToDelete.lessonId}_${movedToDelete.dateStr}`;
                if (state.prepOverrides[prepKey]) {
                    delete state.prepOverrides[prepKey];
                }
                state.completedPreps = state.completedPreps.filter(k => k !== prepKey);
            }
            saveAllData();
            renderCalendar();
        }
    } else if (action === 'delete_single') {
        if (type === 'single_event') {
            state.singleEvents = state.singleEvents.filter(e => e.id !== id);
            // ДОДАНО: Видаляємо completedPreps для цього single_event
            state.completedPreps = state.completedPreps.filter(k => k !== id);
        } else if (type === 'prep_override') {
            delete state.prepOverrides[key];
            state.completedPreps = state.completedPreps.filter(k => k !== key);
        } else if (type === 'moved_lesson') {
            const movedToDelete = state.movedLessons.find(ml => ml.id === id);
            if (movedToDelete) {
                state.movedLessons = state.movedLessons.filter(ml => ml.id !== id);

                // ВИПРАВЛЕННЯ: Правильно обробляємо скасування
                const cancelKey = `${movedToDelete.lessonId}_${movedToDelete.originalDateStr || movedToDelete.dateStr}`;
                state.cancelledDates = state.cancelledDates.filter(k => k !== cancelKey);

                // ДОДАНО: Видаляємо prep для перенесеного уроку
                const prepKey = `${movedToDelete.lessonId}_${movedToDelete.dateStr}`;
                if (state.prepOverrides[prepKey]) {
                    delete state.prepOverrides[prepKey];
                }
                state.completedPreps = state.completedPreps.filter(k => k !== prepKey);
            }
        }
        saveAllData();
        renderCalendar();
    } else if (action === 'delete_series') {
        let targetId = null;
        if (type === 'lesson') {
            targetId = id;
        } else if (type === 'moved_lesson') {
            targetId = lessonId;
        }
        if (targetId) {
            state.lessons = state.lessons.filter(l => l.id !== targetId);
            state.movedLessons = state.movedLessons.filter(ml => ml.lessonId !== targetId);
            state.cancelledDates = state.cancelledDates.filter(k => !k.startsWith(`${targetId}_`));
            Object.keys(state.prepOverrides).forEach(k => {
                if (k.startsWith(`${targetId}_`)) {
                    delete state.prepOverrides[k];
                }
            });
            state.completedPreps = state.completedPreps.filter(k => !k.startsWith(`${targetId}_`));
            saveAllData();
            renderCalendar();
        }
    }
    contextMenuData = null;
}

export function clearData() {

    if (confirm('Ви дійсно хочете очистити всі локальні дані?')) {

        localStorage.clear();

        location.reload();

    }

}

export function exportScheduleImage() {
    const calendarEl = document.getElementById('calendarView');
    if (!calendarEl) return;

    // Зберігаємо оригінальні стилі
    const origWidth = calendarEl.style.width;
    const origHeight = calendarEl.style.height;
    const origOverflow = calendarEl.style.overflow;

    // Встановлюємо явні розміри на основі контенту
    calendarEl.style.width = calendarEl.scrollWidth + 'px';
    calendarEl.style.height = calendarEl.scrollHeight + 'px';
    calendarEl.style.overflow = 'visible';

    // Обробляємо неробочі години
    const nonWorkingElements = calendarEl.querySelectorAll('.non-working');
    const savedBackgrounds = [];
    const computedNonWorkingBg = getComputedStyle(document.documentElement).getPropertyValue('--non-working-bg').trim() || '#22252e';

    nonWorkingElements.forEach(el => {
        savedBackgrounds.push({
            el: el,
            background: el.style.background,
            backgroundColor: el.style.backgroundColor
        });
        el.style.background = 'none';
        el.style.backgroundColor = computedNonWorkingBg;
    });

    setTimeout(() => {
        window.html2canvas(calendarEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: null
        }).then(canvas => {
            // Відновлюємо оригінальні стилі
            calendarEl.style.width = origWidth;
            calendarEl.style.height = origHeight;
            calendarEl.style.overflow = origOverflow;

            savedBackgrounds.forEach(item => {
                item.el.style.background = item.background;
                item.el.style.backgroundColor = item.backgroundColor;
            });

            // Зберігаємо як PNG
            const link = document.createElement('a');
            link.download = 'schedule-full-week.png';
            link.href = canvas.toDataURL('image/png');
            link.click();
        }).catch(err => {
            calendarEl.style.width = origWidth;
            calendarEl.style.height = origHeight;
            calendarEl.style.overflow = origOverflow;
            savedBackgrounds.forEach(item => {
                item.el.style.background = item.background;
                item.el.style.backgroundColor = item.backgroundColor;
            });
            console.error('Помилка:', err);
        });
    }, 100);
}

let activeMoveData = null;

export function openMoveLessonModal(type, targetId, originalDateStr, lessonTitle, defaultDate, defaultTime, sourceMovedId) {
    activeMoveData = { type, targetId, originalDateStr, lessonTitle, sourceMovedId };
    const dateInput = document.getElementById('modalMoveDate');
    const timeInput = document.getElementById('modalMoveTime');
    if (dateInput) dateInput.value = defaultDate || '';
    if (timeInput) timeInput.value = defaultTime || '10:00';
    const modal = document.getElementById('moveLessonModal');
    if (modal) modal.style.display = 'flex';
}

export function closeMoveLessonModal() {
    const modal = document.getElementById('moveLessonModal');
    if (modal) modal.style.display = 'none';
    activeMoveData = null;
}

// modals.js - ПРОБЛЕМА: Неправильна обробка переносу single_event
// ВИПРАВЛЕНА ФУНКЦІЯ confirmMoveLesson
export function confirmMoveLesson() {
    if (!activeMoveData) return;
    const dateInput = document.getElementById('modalMoveDate');
    const timeInput = document.getElementById('modalMoveTime');
    const newDateStr = dateInput ? dateInput.value : '';
    const newTimeStr = timeInput ? timeInput.value : '';

    if (!newDateStr || !newTimeStr) {
        alert('Будь ласка, заповніть дату та час.');
        return;
    }

    const { type, targetId, originalDateStr, lessonTitle, sourceMovedId } = activeMoveData;

    if (type === 'lesson' || type === 'moved_lesson') {
        if (sourceMovedId) {
            state.movedLessons = state.movedLessons.filter(ml => ml.id !== sourceMovedId);
        }
        moveLessonInstance(targetId, originalDateStr, newDateStr, newTimeStr, lessonTitle);
    } else if (type === 'single_event') {
        const ev = state.singleEvents.find(item => item.id === targetId);
        if (ev) {
            // ДОДАНО: Переносимо completedPreps для single_event
            const oldKey = ev.id;
            const newKey = ev.id; // ID не змінюється, але дата змінюється

            if (state.completedPreps.includes(oldKey)) {
                // completedPreps залишається тим же, бо ID не змінюється
            }

            ev.dateStr = newDateStr;
            ev.timeStr = newTimeStr;
            saveAllData();
            renderCalendar();
        }
    }

    closeMoveLessonModal();
}

// Drag-and-drop — конфлікти та виконання

let pendingDropData = null;

function executeDrop(data) {
    const { lessonId, lessonTitle, sourceDateStr, targetDateStr, targetTimeStr, sourceType, movedLessonId } = data;

    if (sourceType === 'single_event') {
        const ev = state.singleEvents.find(item => item.id === lessonId);
        if (!ev) return;
        ev.dateStr = targetDateStr;
        ev.timeStr = targetTimeStr;
        saveAllData();
        renderCalendar();
    } else if (sourceType === 'moved_lesson') {
        state.movedLessons = state.movedLessons.filter(ml => ml.id !== movedLessonId);
        const cancelKey = `${lessonId}_${sourceDateStr}`;
        if (!state.cancelledDates.includes(cancelKey)) {
            state.cancelledDates.push(cancelKey);
        }
        const oldPrepKey = `${lessonId}_${sourceDateStr}`;
        const newPrepKey = `${lessonId}_${targetDateStr}`;
        if (state.prepOverrides[oldPrepKey]) {
            state.prepOverrides[newPrepKey] = state.prepOverrides[oldPrepKey];
            delete state.prepOverrides[oldPrepKey];
        }
        if (state.completedPreps.includes(oldPrepKey)) {
            state.completedPreps = state.completedPreps.filter(k => k !== oldPrepKey);
            if (!state.completedPreps.includes(newPrepKey)) {
                state.completedPreps.push(newPrepKey);
            }
        }
        state.movedLessons.push({
            id: 'moved_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
            lessonId,
            originalDateStr: sourceDateStr,
            dateStr: targetDateStr,
            timeStr: targetTimeStr,
            title: lessonTitle
        });
        saveAllData();
        renderCalendar();
    } else {
        moveLessonInstance(lessonId, sourceDateStr, targetDateStr, targetTimeStr, lessonTitle);
    }
}

export function handleLessonDrop(data) {
    const { lessonId, lessonTitle, lessonTime, sourceDateStr, targetDateStr, targetTimeStr, sourceType, movedLessonId } = data;

    if (targetDateStr === sourceDateStr && targetTimeStr === lessonTime) return;

    let moveDuration = LESSON_DURATION;
    if (sourceType === 'single_event') {
        const ev = state.singleEvents.find(e => e.id === lessonId);
        if (ev) moveDuration = ev.duration || LESSON_DURATION;
    }

    const conflicts = checkConflicts(lessonId, targetDateStr, targetTimeStr, sourceType === 'single_event' ? lessonId : null, moveDuration);

    if (conflicts.length > 0) {
        pendingDropData = data;
        const list = document.getElementById('conflictList');
        if (list) {
            list.innerHTML = conflicts.map(c => `<span>• ${c.msg}</span>`).join('');
        }
        const modal = document.getElementById('conflictModal');
        if (modal) modal.style.display = 'flex';
        return;
    }

    executeDrop(data);
}

export function confirmConflictOverride() {
    if (!pendingDropData) return;
    closeConflictModal();
    executeDrop(pendingDropData);
    pendingDropData = null;
}

export function closeConflictModal() {
    const modal = document.getElementById('conflictModal');
    if (modal) modal.style.display = 'none';
    pendingDropData = null;
}

// modals.js - ВИПРАВЛЕННЯ
export function moveLessonInstance(lessonId, originalDateStr, newDateStr, newTimeStr, lessonTitle) {
    const cancelKey = `${lessonId}_${originalDateStr}`;
    if (!state.cancelledDates.includes(cancelKey)) {
        state.cancelledDates.push(cancelKey);
    }

    // Переносимо дані відпрацювання
    const oldPrepKey = `${lessonId}_${originalDateStr}`;
    const newPrepKey = `${lessonId}_${newDateStr}`;

    if (state.prepOverrides[oldPrepKey]) {
        state.prepOverrides[newPrepKey] = state.prepOverrides[oldPrepKey];
        delete state.prepOverrides[oldPrepKey];
    }

    // ДОДАНО: Переносимо completedPreps
    if (state.completedPreps.includes(oldPrepKey)) {
        state.completedPreps = state.completedPreps.filter(k => k !== oldPrepKey);
        if (!state.completedPreps.includes(newPrepKey)) {
            state.completedPreps.push(newPrepKey);
        }
    }

    const movedLesson = {
        id: 'moved_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        lessonId: lessonId,
        originalDateStr: originalDateStr,
        dateStr: newDateStr,
        timeStr: newTimeStr,
        title: lessonTitle
    };

    state.movedLessons.push(movedLesson);
    saveAllData();
    renderCalendar();
}