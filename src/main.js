const CURRENT_VERSION = window.APP_VERSION; // ← єдине джерело версії (задається в index.html)
const STORED_VERSION = localStorage.getItem('gridify_version');

if (STORED_VERSION !== CURRENT_VERSION) {
    console.log(`[VERSION] Зміна: ${STORED_VERSION} → ${CURRENT_VERSION}`);
    sessionStorage.clear();
    localStorage.setItem('gridify_version', CURRENT_VERSION);
    console.log(`[VERSION] Новий ServiceWorker перезавантажить сторінку.`);
}


import { enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { db } from "./config.js";
import { state } from "./state.js";
import { initAuthListeners } from "./services/auth.js";
import { applySavedTheme, populateTimezoneSelect, updateTimezoneHint, updateTimezone, applySavedColors, toggleSettingsDropdown, toggleTheme, toggleNotifications, updateThemeColor, initNotifications } from "./ui/settings.js";
import { initColorPickers } from "./ui/color-picker.js";
import { renderCalendar, changeWeek, toggleEditMode, applyDragSelection, updateCurrentTimeLine } from "./core/calendar.js";
import { setModalFunctions, setDropHandler } from "./core/calendar-renderer.js";
import {
    resetLessonForm,
    addLesson,
    openPrepModal,
    showContextMenu,
    closeModal,
    savePrepStudent,
    openLessonEditModal,
    closeLessonEditModal,
    saveLessonEdit,
    handleContextMenuAction,
    clearData,
    exportScheduleImage,
    openMoveLessonModal,
    closeMoveLessonModal,
    confirmMoveLesson,
    handleLessonDrop,
    confirmConflictOverride,
    closeConflictModal
} from "./core/modals.js";
import { SLOT_HEIGHT, isDev } from './config.js';

setModalFunctions({ showContextMenu, openPrepModal, openLessonEditModal });

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
    initColorPickers();
    resetLessonForm();
    renderCalendar();
    initNotifications();
    initAuthListeners();

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js?v=' + encodeURIComponent(CURRENT_VERSION)).then(reg => {
            if (reg.active && !navigator.serviceWorker.controller) {
                console.log('[SW] SW встановлено, перезавантаження...');
                location.reload();
            }
            reg.addEventListener('updatefound', () => {
                const newSW = reg.installing;
                newSW.addEventListener('statechange', () => {
                    if (newSW.state === 'activated') {
                        console.log('[SW] Нова версія активована.');
                    }
                });
            });
        }).catch((err) => {
            console.error('ServiceWorker registration failed: ', err);
        });
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[SW] Контролер змінено, перезавантаження...');
            location.reload();
        });
    }

    setInterval(updateCurrentTimeLine, 60000);

    const toggleSidebarBtn = document.getElementById('toggleSidebarBtn');
    const sidebarFab = document.getElementById('sidebarFab');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');
    if (isDev) {
        document.getElementById('devBanner').style.display = 'flex';
    }

    const sidebarOpen = () => {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.remove('collapsed');
        if (sidebarBackdrop) sidebarBackdrop.style.display = 'block';
    };
    const sidebarClose = () => {
        const sidebar = document.getElementById('appSidebar');
        if (sidebar) sidebar.classList.add('collapsed');
        if (sidebarBackdrop) sidebarBackdrop.style.display = 'none';
    };

    const toggleSidebar = () => {
        const sidebar = document.getElementById('appSidebar');
        const isOpen = sidebar && !sidebar.classList.contains('collapsed');
        if (isOpen) sidebarClose();
        else sidebarOpen();
    };

    if (toggleSidebarBtn) toggleSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarFab) sidebarFab.addEventListener('click', toggleSidebar);
    if (sidebarBackdrop) sidebarBackdrop.addEventListener('click', sidebarClose);

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
    document.addEventListener('pointerup', () => {
        if (state.isMouseDown && state.isNonWorkingEditMode) {
            state.isMouseDown = false;
            applyDragSelection();
        }
    });

    setDropHandler(handleLessonDrop);

    // Гарячі клавіші
    document.addEventListener('keydown', (e) => {
        if (e.target.matches('input, select, textarea, [contenteditable]')) return;
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                changeWeek(-1);
                break;
            case 'ArrowRight':
                e.preventDefault();
                changeWeek(1);
                break;
        }
        switch (e.code) {
            case 'KeyT':
                changeWeek(0);
                break;
            case 'KeyE':
                toggleEditMode();
                break;
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
window.saveLessonEdit = saveLessonEdit;
window.handleContextMenuAction = handleContextMenuAction;
window.exportScheduleImage = exportScheduleImage;
window.openMoveLessonModal = openMoveLessonModal;
window.closeMoveLessonModal = closeMoveLessonModal;
window.confirmMoveLesson = confirmMoveLesson;
window.confirmConflictOverride = confirmConflictOverride;
window.closeConflictModal = closeConflictModal;