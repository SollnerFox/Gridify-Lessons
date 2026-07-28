import { REGIONAL_TIMEZONES } from "./config.js";
import { state, formatDate } from "./state.js";
import { saveAllData } from "./storage.js";
import { renderCalendar } from "./calendar.js";
import { notificationManager } from "./notifications.js";

export function toggleSettingsDropdown() {
    const dropdown = document.getElementById('settingsDropdown');
    if (!dropdown) return;
    dropdown.style.display = dropdown.style.display === 'flex' ? 'none' : 'flex';
}

export function applySavedTheme() {
    if (state.isLightTheme) document.body.classList.add('light-theme');
    else document.body.classList.remove('light-theme');
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.checked = state.isLightTheme;
}

export function toggleTheme(checked) {
    state.isLightTheme = checked;
    saveAllData();
    applySavedTheme();
    applySavedColors();
    renderCalendar();
}

export function populateTimezoneSelect() {
    const select = document.getElementById('timezoneSelect');
    if (!select) return;
    select.innerHTML = '';
    REGIONAL_TIMEZONES.forEach(tz => {
        const opt = document.createElement('option');
        opt.value = tz.zone;
        opt.textContent = tz.label;
        if (tz.zone === state.currentTz) opt.selected = true;
        select.appendChild(opt);
    });
}

export function updateTimezone(newZone) {
    state.currentTz = newZone;
    saveAllData();
    updateTimezoneHint();
    renderCalendar();
}

export function updateTimezoneHint() {
    const hintEl = document.getElementById('tzHint');
    if (!hintEl) return;
    const found = REGIONAL_TIMEZONES.find(t => t.zone === state.currentTz);
    hintEl.innerText = `Зона: ${found ? found.label : state.currentTz}`;
}

// settings.js - ПРОБЛЕМА 1: Неправильна обробка customColors при першому завантаженні
// ВИПРАВЛЕНА ФУНКЦІЯ applySavedColors
export function applySavedColors() {
    const isLight = state.isLightTheme;

    // ВИПРАВЛЕННЯ: Правильна ініціалізація customColors
    if (!state.customColors || typeof state.customColors !== 'object') {
        state.customColors = { light: {}, dark: {} };
    }

    // Якщо структура старої версії (без light/dark), мігруємо
    if (!state.customColors.light && !state.customColors.dark) {
        const oldColors = state.customColors;
        state.customColors = {
            light: {},
            dark: oldColors
        };
    }

    const currentThemeColors = state.customColors[isLight ? 'light' : 'dark'] || {};

    const defaults = isLight ? {
        '--lesson-color': '#93c5fd',
        '--prep-color': '#fde047',
        '--prep60-color': '#6ee7b7',
        '--non-working-bg': '#e9ecef',
        '--slot-hover-bg': '#e2e6ea'
    } : {
        '--lesson-color': '#3b82f6',
        '--prep-color': '#f59e0b',
        '--prep60-color': '#10b981',
        '--non-working-bg': '#22252e',
        '--slot-hover-bg': '#2d323e'
    };

    const root = document.documentElement;
    for (let key in defaults) {
        root.style.setProperty(key, currentThemeColors[key] || defaults[key]);
    }
    syncColorPreviews();
}

// settings.js - ПРОБЛЕМА 2: Неправильна обробка updateThemeColor
// ВИПРАВЛЕНА ФУНКЦІЯ updateThemeColor
export function updateThemeColor(variableName, hexValue) {
    document.documentElement.style.setProperty(variableName, hexValue);
    const isLight = state.isLightTheme;

    // ВИПРАВЛЕННЯ: Правильна ініціалізація
    if (!state.customColors || typeof state.customColors !== 'object') {
        state.customColors = { light: {}, dark: {} };
    }

    if (!state.customColors.light) state.customColors.light = {};
    if (!state.customColors.dark) state.customColors.dark = {};

    state.customColors[isLight ? 'light' : 'dark'][variableName] = hexValue;
    saveAllData();
    syncColorPreviews();
}

// settings.js - ПРОБЛЕМА 3: Неправильна обробка syncColorPreviews
// ВИПРАВЛЕНА ФУНКЦІЯ syncColorPreviews
function syncColorPreviews() {
    const isLight = state.isLightTheme;

    // ВИПРАВЛЕННЯ: Правильна ініціалізація
    if (!state.customColors || typeof state.customColors !== 'object') {
        state.customColors = { light: {}, dark: {} };
    }

    if (!state.customColors.light) state.customColors.light = {};
    if (!state.customColors.dark) state.customColors.dark = {};

    const currentThemeColors = state.customColors[isLight ? 'light' : 'dark'] || {};

    const defaults = isLight ? {
        '--lesson-color': '#93c5fd',
        '--prep-color': '#fde047',
        '--prep60-color': '#6ee7b7',
        '--non-working-bg': '#e9ecef'
    } : {
        '--lesson-color': '#3b82f6',
        '--prep-color': '#f59e0b',
        '--prep60-color': '#10b981',
        '--non-working-bg': '#22252e'
    };

    // ВИПРАВЛЕННЯ: Безпечна обробка елементів
    const colorPreviews = [
        { id: 'prevLesson', key: '--lesson-color' },
        { id: 'prevPrep30', key: '--prep-color' },
        { id: 'prevPrep60', key: '--prep60-color' },
        { id: 'prevNonWorking', key: '--non-working-bg' }
    ];

    colorPreviews.forEach(({ id, key }) => {
        const preview = document.getElementById(id);
        if (preview) {
            preview.style.background = currentThemeColors[key] || defaults[key];
        }
    });
}

export function initNotifications() {
    syncNotifToggleState();
    if ('Notification' in window && Notification.permission === 'default' && state.isNotifEnabled) {
        notificationManager.requestPermission().then(() => syncNotifToggleState());
    }
    setInterval(checkUpcomingEvents, 60000);
    checkUpcomingEvents();
}

export function syncNotifToggleState() {
    const toggle = document.getElementById('notifToggle');
    if (!toggle) return;
    if (!('Notification' in window) || Notification.permission === 'denied') {
        toggle.disabled = true;
        toggle.checked = false;
    } else {
        toggle.disabled = false;
        toggle.checked = !!state.isNotifEnabled && Notification.permission === 'granted';
    }
}

export function toggleNotifications(checked) {
    if (!('Notification' in window)) return;
    if (checked && Notification.permission !== 'granted') {
        notificationManager.requestPermission().then(granted => {
            state.isNotifEnabled = granted;
            saveAllData();
            syncNotifToggleState();
        });
    } else {
        state.isNotifEnabled = checked;
        saveAllData();
        syncNotifToggleState();
    }
}

// settings.js - ВИПРАВЛЕНА ФУНКЦІЯ checkUpcomingEvents
export function checkUpcomingEvents() {
    if (!state.isNotifEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;

    const now = new Date();
    const todayStr = formatDate(now);
    const currentDayOfWeek = now.getDay();

    const checkAndNotify = (title, timeStr, eventKey) => {
        const [h, m] = timeStr.split(':').map(Number);
        const eventTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
        const diffMin = (eventTime - now) / 60000;

        if (diffMin > 0 && diffMin <= 10 && !state.notifiedEvents.has(eventKey)) {
            notificationManager.trigger(title, `Починається о ${timeStr}`);
            state.notifiedEvents.add(eventKey);
        }
        // ✅ ДОДАТИ: Видаляємо старі сповіщення (більше 10 хв тому)
        else if (diffMin < -10) {
            state.notifiedEvents.delete(eventKey);
        }
    };

    state.lessons.forEach(l => {
        if (l.dayOfWeek === currentDayOfWeek && todayStr >= l.startDate && todayStr <= l.endDate) {
            if (state.cancelledDates.includes(`${l.id}_${todayStr}`)) return;
            checkAndNotify(`Скоро урок: ${l.title}`, l.startTime, `${l.id}_${todayStr}_${l.startTime}`);
        }
    });

    state.movedLessons.forEach(ml => {
        if (ml.dateStr === todayStr) {
            checkAndNotify(`Скоро урок (перенесено): ${ml.title}`, ml.timeStr, `ml_${ml.id}_${todayStr}_${ml.timeStr}`);
        }
    });

    state.singleEvents.forEach(se => {
        if (se.dateStr === todayStr) {
            const label = se.studentName ? `${se.studentName} (${se.groupName || 'Відпрацювання'})` : 'Відпрацювання (1 год)';
            checkAndNotify(`Скоро відпрацювання: ${label}`, se.timeStr, `se_${se.id}_${todayStr}_${se.timeStr}`);
        }
    });
}