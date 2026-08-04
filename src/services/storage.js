import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { db } from "../config.js";
import { state } from "../state.js";

export function setSyncStatus(status) {
    const el = document.getElementById('syncStatus');
    if (el) {
        let icon = 'ph-cloud-slash';
        if (status.includes('Синхронізовано')) icon = 'ph-cloud-check';
        else if (status.includes('Збереження') || status.includes('Перевірка')) icon = 'ph-arrows-clockwise';
        else if (status.includes('Помилка')) icon = 'ph-warning';
        else if (status.includes('Офлайн')) icon = 'ph-cloud-slash';

        el.innerHTML = `<i class="ph ${icon}"></i> ${status}`;
    }
}

export function saveAllData() {
    // Зберігаємо ВСІ дані в localStorage
    localStorage.setItem('app_lessons', JSON.stringify(state.lessons));
    localStorage.setItem('app_moved_lessons', JSON.stringify(state.movedLessons));
    localStorage.setItem('app_cancelled_dates', JSON.stringify(state.cancelledDates));
    localStorage.setItem('app_single_events', JSON.stringify(state.singleEvents));
    localStorage.setItem('app_non_working', JSON.stringify(state.nonWorkingSlots));
    localStorage.setItem('app_recurring_non_working', JSON.stringify(state.recurringNonWorkingSlots));
    localStorage.setItem('app_working_exceptions', JSON.stringify(state.workingExceptions || []));
    localStorage.setItem('app_full_day_blocked_slots', JSON.stringify(state.fullDayBlockedSlots || []));
    localStorage.setItem('app_full_day_removed_exceptions', JSON.stringify(state.fullDayRemovedExceptions || []));
    localStorage.setItem('app_prep_overrides', JSON.stringify(state.prepOverrides));
    localStorage.setItem('app_completed_preps', JSON.stringify(state.completedPreps)); // ← КРИТИЧНО
    localStorage.setItem('app_custom_colors', JSON.stringify(state.customColors));
    localStorage.setItem('app_notif_enabled', JSON.stringify(state.isNotifEnabled));
    localStorage.setItem('app_light_theme', JSON.stringify(state.isLightTheme));
    localStorage.setItem('app_timezone', state.currentTz);
    localStorage.setItem('app_last_updated', Date.now());

    triggerCloudSave();
}

// storage.js - ПРОБЛЕМА: Неправильна обробка помилок при збереженні
// ВИПРАВЛЕНА ФУНКЦІЯ triggerCloudSave
function triggerCloudSave() {
    if (!state.currentUser || state.currentUser.isAnonymous) {
        return;
    }

    setSyncStatus("Збереження...");
    clearTimeout(state.saveTimeout);

    // ВИПРАВЛЕННЯ: Додаємо перевірку на наявність даних
    const hasData = state.lessons.length > 0 ||
        state.movedLessons.length > 0 ||
        state.cancelledDates.length > 0 ||
        state.singleEvents.length > 0 ||
        state.nonWorkingSlots.length > 0 ||
        state.recurringNonWorkingSlots.length > 0 ||
        state.workingExceptions.length > 0 ||
        state.fullDayBlockedSlots.length > 0 ||
        state.fullDayRemovedExceptions.length > 0 ||
        Object.keys(state.prepOverrides).length > 0 ||
        state.completedPreps.length > 0 ||
        Object.keys(state.customColors || {}).length > 0;

    if (!hasData) {
        setSyncStatus("Синхронізовано");
        return;
    }

    state.saveTimeout = setTimeout(async () => {
        try {
            await forceSaveToCloud();
        } catch (error) {
            console.error("Помилка при синхронізації:", error);
            setSyncStatus("Помилка синхронізації");
        }
    }, 2500);
}

// storage.js - ВИПРАВЛЕНА ФУНКЦІЯ forceSaveToCloud
export async function forceSaveToCloud() {
    if (!state.currentUser || state.currentUser.isAnonymous) {
        setSyncStatus("Локальний режим");
        return;
    }

    const docRef = doc(db, "users", state.currentUser.uid);

    const payload = {
        lessons: state.lessons,
        movedLessons: state.movedLessons,
        cancelledDates: state.cancelledDates,
        singleEvents: state.singleEvents,
        nonWorkingSlots: state.nonWorkingSlots,
        recurringNonWorkingSlots: state.recurringNonWorkingSlots,
        workingExceptions: state.workingExceptions || [],
        fullDayBlockedSlots: state.fullDayBlockedSlots || [],
        fullDayRemovedExceptions: state.fullDayRemovedExceptions || [],
        prepOverrides: state.prepOverrides,
        completedPreps: state.completedPreps, // ← КРИТИЧНО
        customColors: state.customColors,
        settings: {
            isNotifEnabled: state.isNotifEnabled,
            isLightTheme: state.isLightTheme,
            currentTz: state.currentTz
        }
    };

    const timestamp = Date.now();

    const dataToSave = {
        meta: {
            lastUpdated: timestamp,
            totalLessons: state.lessons.length + state.movedLessons.length,
            totalPrepSlots: Object.keys(state.prepOverrides).length + state.singleEvents.length,
            totalCompletedPreps: state.completedPreps.length // ← ДОДАНО
        },
        payload: payload
    };

    try {
        await setDoc(docRef, dataToSave, { merge: true });
        localStorage.setItem('app_last_updated', timestamp);
        setSyncStatus("Синхронізовано");
    } catch (error) {
        console.error("Помилка збереження у хмару:", error);

        if (error.code === 'permission-denied') {
            setSyncStatus("Помилка доступу");
        } else if (error.code === 'unavailable' || error.code === 'network-error') {
            setSyncStatus("Офлайн - дані збережені локально");
        } else {
            setSyncStatus("Помилка синхронізації");
        }
    }
}