import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { db } from "./config.js";
import { state } from "./state.js";
import { initAuthListeners } from "./auth.js";
import { applySavedTheme, populateTimezoneSelect, updateTimezoneHint, updateTimezone, applySavedColors, toggleSettingsDropdown, toggleTheme, toggleNotifications, updateThemeColor, initNotifications } from "./settings.js";
import { renderCalendar, changeWeek, toggleEditMode, applyDragSelection, updateCurrentTimeLine } from "./calendar.js";
import {
    resetLessonForm,
    addLesson,
    openPrepModal,
    closeModal,
    savePrepStudent,
    openLessonEditModal,
    closeLessonEditModal,
    saveLessonTitle,
    handleContextMenuAction,
    clearData,
    exportScheduleImage,
    openMoveLessonModal,
    closeMoveLessonModal,
    confirmMoveLesson
} from "./modals.js";
import { SLOT_HEIGHT } from './config.js';

// Встановлюємо значення з config у CSS-змінну
document.documentElement.style.setProperty('--slot-height', `${SLOT_HEIGHT}px`);

enableIndexedDbPersistence(db).catch((err) => {
    console.error("Офлайн-режим недоступний:", err.code);
});

// main.js - ВИПРАВЛЕНА ФУНКЦІЯ DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
    applySavedTheme();
    populateTimezoneSelect();
    updateTimezoneHint();
    applySavedColors();
    resetLessonForm();
    renderCalendar();
    initNotifications();
    initAuthListeners();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').catch((err) => {
            console.error('ServiceWorker registration failed: ', err);
        });
    }

    setInterval(updateCurrentTimeLine, 60000);

    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    if (toggleSidebarBtn) {
        toggleSidebarBtn.addEventListener('click', () => {
            const sidebar = document.getElementById('appSidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });
    }

    // ✅ ТВІЙ ІСНУЮЧИЙ КОД - ЗАЛИШИТИ
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('settingsDropdown');
        const container = document.querySelector('.settings-dropdown-container');
        if (dropdown && container && !container.contains(e.target)) {
            dropdown.style.display = 'none';
        }
        const contextMenu = document.getElementById('contextMenu');
        if (contextMenu) contextMenu.style.display = 'none';
    });

    // ✅ ДОДАТИ НОВИЙ КОД (мій) - для очищення вибору при редагуванні неробочих годин
    document.addEventListener('mouseup', () => {
        if (state.isMouseDown && state.isNonWorkingEditMode) {
            state.isMouseDown = false;
            applyDragSelection();
        }
    });
});

window.changeWeek = changeWeek;
window.toggleSettingsDropdown = toggleSettingsDropdown;
window.updateTimezone = updateTimezone;
window.toggleTheme = toggleTheme;
window.toggleNotifications = toggleNotifications;
window.updateThemeColor = updateThemeColor;
window.clearData = clearData;
window.toggleEditMode = toggleEditMode;
window.addLesson = addLesson;
window.openPrepModal = openPrepModal;
window.closeModal = closeModal;
window.savePrepStudent = savePrepStudent;
window.openLessonEditModal = openLessonEditModal;
window.closeLessonEditModal = closeLessonEditModal;
window.saveLessonTitle = saveLessonTitle;
window.handleContextMenuAction = handleContextMenuAction;
window.exportScheduleImage = exportScheduleImage;
window.openMoveLessonModal = openMoveLessonModal;
window.closeMoveLessonModal = closeMoveLessonModal;
window.confirmMoveLesson = confirmMoveLesson;