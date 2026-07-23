import { state } from "./state.js";
import { saveAllData } from "./storage.js";
import { renderCalendar } from "./calendar.js";

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

export function openPrepModal(key, currentStudentName = '', currentGroupName = '', isLocked = false) {
    activePrepKey = key;

    const nameInput = document.getElementById('modalStudentName');
    const groupSelect = document.getElementById('modalGroupName');

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
        if (currentGroupName && !uniqueGroups.includes(currentGroupName)) {
            const opt = document.createElement('option');
            opt.value = currentGroupName;
            opt.innerText = currentGroupName;
            opt.selected = true;
            groupSelect.appendChild(opt);
        }

        groupSelect.disabled = isLocked;
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
    const studentName = nameInput ? nameInput.value.trim() : '';
    const groupName = groupSelect ? groupSelect.value : '';

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

export function saveLessonTitle() {
    if (!activeLessonEditId) return;
    const titleInput = document.getElementById('modalLessonTitle');
    const newTitle = titleInput ? titleInput.value.trim() : '';
    if (!newTitle) return;

    const lesson = state.lessons.find(l => l.id === activeLessonEditId);
    if (lesson) {
        lesson.title = newTitle;
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

export function handleContextMenuAction(action) {
    const menu = document.getElementById('contextMenu');
    if (menu) menu.style.display = 'none';
    if (!contextMenuData) return;

    const { type, id, dateStr, timeStr, key } = contextMenuData;

    if (action === 'prep60') {
        const newEvent = {
            id: 'single_' + Date.now(),
            dateStr,
            timeStr,
            duration: 60,
            studentName: '',
            groupName: ''
        };
        state.singleEvents.push(newEvent);
        saveAllData();
        renderCalendar();
        openPrepModal(newEvent.id, '', '', false);
    } else if (action === 'cancel_single_date') {
        const cancelKey = `${id}_${dateStr}`;
        if (!state.cancelledDates.includes(cancelKey)) {
            state.cancelledDates.push(cancelKey);
            saveAllData();
            renderCalendar();
        }
    } else if (action === 'delete_series') {
        state.lessons = state.lessons.filter(l => l.id !== id);
        saveAllData();
        renderCalendar();
    } else if (action === 'delete_single') {
        if (type === 'single_event') {
            state.singleEvents = state.singleEvents.filter(e => e.id !== id);
        } else if (type === 'prep_override') {
            delete state.prepOverrides[key];
        } else if (type === 'moved_lesson') {
            state.movedLessons = state.movedLessons.filter(ml => ml.id !== id);
        }
        saveAllData();
        renderCalendar();
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
    window.html2canvas(calendarEl, { scale: 2 }).then(canvas => {
        const link = document.createElement('a');
        link.download = 'schedule.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}