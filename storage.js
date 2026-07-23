import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { db } from "./config.js";
import { state } from "./state.js";

export function setSyncStatus(status) {
    const el = document.getElementById('syncStatus');
    if (el) {
        let icon = 'ph-cloud-slash';
        if (status.includes('Синхронізовано')) icon = 'ph-cloud-check';
        else if (status.includes('Збереження') || status.includes('Перевірка')) icon = 'ph-arrows-clockwise';
        else if (status.includes('Помилка')) icon = 'ph-warning';

        el.innerHTML = `<i class="ph ${icon}"></i> ${status}`;
    }
}

export function saveAllData() {
    localStorage.setItem('app_lessons', JSON.stringify(state.lessons));
    localStorage.setItem('app_moved_lessons', JSON.stringify(state.movedLessons));
    localStorage.setItem('app_cancelled_dates', JSON.stringify(state.cancelledDates));
    localStorage.setItem('app_single_events', JSON.stringify(state.singleEvents));
    localStorage.setItem('app_non_working', JSON.stringify(state.nonWorkingSlots));
    localStorage.setItem('app_recurring_non_working', JSON.stringify(state.recurringNonWorkingSlots));
    localStorage.setItem('app_working_exceptions', JSON.stringify(state.workingExceptions || []));
    localStorage.setItem('app_prep_overrides', JSON.stringify(state.prepOverrides));
    localStorage.setItem('app_custom_colors', JSON.stringify(state.customColors));
    localStorage.setItem('app_notif_enabled', JSON.stringify(state.isNotifEnabled));
    localStorage.setItem('app_light_theme', JSON.stringify(state.isLightTheme));
    localStorage.setItem('app_timezone', state.currentTz);
    localStorage.setItem('app_last_updated', Date.now());

    triggerCloudSave();
}

function triggerCloudSave() {
    if (!state.currentUser || state.currentUser.isAnonymous) return;
    setSyncStatus("Збереження...");
    clearTimeout(state.saveTimeout);
    state.saveTimeout = setTimeout(async () => {
        await forceSaveToCloud();
    }, 2500);
}

export async function forceSaveToCloud() {
    if (!state.currentUser || state.currentUser.isAnonymous) return;
    const docRef = doc(db, "users", state.currentUser.uid);

    const payload = {
        lessons: state.lessons,
        movedLessons: state.movedLessons,
        cancelledDates: state.cancelledDates,
        singleEvents: state.singleEvents,
        nonWorkingSlots: state.nonWorkingSlots,
        recurringNonWorkingSlots: state.recurringNonWorkingSlots,
        workingExceptions: state.workingExceptions || [],
        prepOverrides: state.prepOverrides,
        customColors: state.customColors,
        settings: {
            isNotifEnabled: state.isNotifEnabled,
            isLightTheme: state.isLightTheme,
            currentTz: state.currentTz
        }
    };

    const timestamp = Date.now();
    localStorage.setItem('app_last_updated', timestamp);

    const dataToSave = {
        meta: {
            lastUpdated: timestamp,
            totalLessons: state.lessons.length + state.movedLessons.length,
            totalPrepSlots: Object.keys(state.prepOverrides).length + state.singleEvents.length
        },
        payload: payload
    };

    try {
        await setDoc(docRef, dataToSave, { merge: false });
        setSyncStatus("Синхронізовано");
    } catch (error) {
        console.error("Помилка збереження у хмару:", error);
        setSyncStatus("Помилка синхронізації");
    }
}