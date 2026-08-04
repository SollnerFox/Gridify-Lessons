import {
    GoogleAuthProvider, signInWithPopup, signInAnonymously,
    onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { auth, db } from "../config.js";
import { state } from "../state.js";
import { setSyncStatus, forceSaveToCloud } from "./storage.js";
import { renderCalendar } from "../core/calendar.js";
import { applySavedTheme, applySavedColors } from "../ui/settings.js";

// auth.js - ВИПРАВЛЕНА ФУНКЦІЯ handleGoogleAuth (виділена окремо)
async function handleGoogleAuth() {
    const provider = new GoogleAuthProvider();
    state.suppressAuthModal = true;
    state.wasAnonymous = !!(auth.currentUser && auth.currentUser.isAnonymous);
    try {
        await signInWithPopup(auth, provider);
    } catch (error) {
        console.error("Помилка авторизації:", error);
    } finally {
        state.suppressAuthModal = false;
    }
}

function cleanupSnapshotListener() {
    if (state.unsubscribeSnapshot) {
        state.unsubscribeSnapshot();
        state.unsubscribeSnapshot = null;
    }
}


export function initAuthListeners() {
    document.getElementById('btnGoogleSignIn')?.addEventListener('click', handleGoogleAuth);
    document.getElementById('btnGoogleSignInDropdown')?.addEventListener('click', handleGoogleAuth);

    document.getElementById('btnAnonSignIn')?.addEventListener('click', async () => {
        try {
            await signInAnonymously(auth);
        } catch (error) {
            console.error("Помилка анонімного входу:", error);
        }
    });

    onAuthStateChanged(auth, async (user) => {
        const authModal = document.getElementById('authModal');
        if (user) {
            state.currentUser = user;
            updateSettingsUI();
            if (authModal) authModal.style.display = 'none';

            if (user.isAnonymous) {
                setSyncStatus("Локальний режим");
                cleanupSnapshotListener(); // ← ДОДАНО
            } else {
                await checkSyncConflict(user.uid);
            }
        } else {
            state.currentUser = null;
            cleanupSnapshotListener(); // ← ДОДАНО
            updateSettingsUI();
            if (!state.suppressAuthModal && authModal) authModal.style.display = 'flex';
            if (!state.suppressAuthModal) setSyncStatus("Офлайн");
        }
    });
}

// auth.js - ВИПРАВЛЕНА ФУНКЦІЯ updateSettingsUI
export function updateSettingsUI() {
    const section = document.getElementById('authSettingsSection');
    if (!section) return;

    const isGoogleUser = state.currentUser && !state.currentUser.isAnonymous;

    section.innerHTML = `
        <h4>Обліковий запис</h4>
        ${isGoogleUser ? `
            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                ${state.currentUser.photoURL ? `<img src="${state.currentUser.photoURL}" alt="Avatar" style="width: 32px; height: 32px; border-radius: 50%;">` : ''}
                <div style="font-size: 0.85rem; overflow: hidden; text-overflow: ellipsis;">
                    <div style="font-weight: 600;">${state.currentUser.displayName || 'Користувач Google'}</div>
                    <div style="color: var(--text-muted); font-size: 0.75rem;">${state.currentUser.email || ''}</div>
                </div>
            </div>
            <button class="btn btn-danger" id="btnLogout" style="width: 100%;">Вийти з акаунта</button>
        ` : `
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 5px;">Анонімний режим (дані в LocalStorage)</p>
            <button class="btn btn-primary" id="btnGoogleSignInDropdown" style="width: 100%;">Увійти через Google</button>
        `}
    `;

    document.getElementById('btnLogout')?.addEventListener('click', async () => {
        try {
            // Очищуємо слухач перед логаутом
            if (state.unsubscribeSnapshot) {
                state.unsubscribeSnapshot();
                state.unsubscribeSnapshot = null;
            }

            await signOut(auth);
            state.currentUser = null;
            localStorage.clear();
            location.reload();
        } catch (error) {
            console.error("Помилка при виході з акаунта:", error);
        }
    });

    const dropdownBtn = document.getElementById('btnGoogleSignInDropdown');
    if (dropdownBtn) {
        dropdownBtn.addEventListener('click', handleGoogleAuth);
    }
}

function buildLocalPayload() {
    return {
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
        completedPreps: state.completedPreps,
        customColors: state.customColors,
        settings: {
            isNotifEnabled: state.isNotifEnabled,
            isLightTheme: state.isLightTheme,
            currentTz: state.currentTz
        }
    };
}

function mergePayloads(cloud, local) {
    const merged = {};

    const arrayFields = [
        'lessons', 'movedLessons', 'cancelledDates', 'singleEvents',
        'nonWorkingSlots', 'recurringNonWorkingSlots', 'workingExceptions',
        'fullDayBlockedSlots', 'fullDayRemovedExceptions', 'completedPreps'
    ];
    for (const field of arrayFields) {
        const cArr = cloud[field] || [];
        const lArr = local[field] || [];
        const seen = new Set();
        const result = [];
        for (const item of [...cArr, ...lArr]) {
            const key = JSON.stringify(item);
            if (!seen.has(key)) {
                seen.add(key);
                result.push(item);
            }
        }
        merged[field] = result;
    }

    merged.prepOverrides = { ...(cloud.prepOverrides || {}), ...(local.prepOverrides || {}) };
    merged.customColors = {
        light: { ...((cloud.customColors || {}).light || {}), ...((local.customColors || {}).light || {}) },
        dark: { ...((cloud.customColors || {}).dark || {}), ...((local.customColors || {}).dark || {}) }
    };
    merged.settings = { ...(cloud.settings || {}), ...(local.settings || {}) };

    return merged;
}

async function checkSyncConflict(uid) {
    setSyncStatus("Перевірка даних...");
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        const hasLocalData = state.lessons.length > 0 ||
            state.movedLessons.length > 0 ||
            state.singleEvents.length > 0 ||
            state.nonWorkingSlots.length > 0 ||
            state.recurringNonWorkingSlots.length > 0 ||
            state.workingExceptions.length > 0 ||
            Object.keys(state.prepOverrides).length > 0 ||
            state.completedPreps.length > 0;

        if (!docSnap.exists()) {
            if (hasLocalData) await forceSaveToCloud();
            initSnapshotListener(uid);
            return;
        }

        const cloudData = docSnap.data();
        const cloudTs = cloudData.meta?.lastUpdated || 0;
        const localTs = Number(localStorage.getItem('app_last_updated')) || 0;

        if (state.wasAnonymous) {
            state.wasAnonymous = false;
            const localPayload = buildLocalPayload();
            const merged = mergePayloads(cloudData.payload, localPayload);
            applyCloudData(merged, Date.now());
            await forceSaveToCloud();
        } else if (cloudTs > localTs) {
            applyCloudData(cloudData.payload, cloudTs);
        } else if (hasLocalData) {
            await forceSaveToCloud();
        }

        initSnapshotListener(uid);
    } catch (error) {
        console.error("Помилка синхронізації з Firestore:", error);
        setSyncStatus("Помилка зв'язку / Офлайн");
    }
}

function applyCloudData(payload, timestamp) {
    state.lessons = payload.lessons || [];
    state.movedLessons = payload.movedLessons || [];
    state.cancelledDates = payload.cancelledDates || [];
    state.singleEvents = payload.singleEvents || [];
    state.nonWorkingSlots = payload.nonWorkingSlots || [];
    state.recurringNonWorkingSlots = payload.recurringNonWorkingSlots || [];
    state.workingExceptions = payload.workingExceptions || [];
    state.fullDayBlockedSlots = payload.fullDayBlockedSlots || [];
    state.fullDayRemovedExceptions = payload.fullDayRemovedExceptions || [];
    state.prepOverrides = payload.prepOverrides || {};
    state.completedPreps = payload.completedPreps || []; // ← ДОДАНО
    state.customColors = payload.customColors || {};

    if (payload.settings) {
        state.isNotifEnabled = payload.settings.isNotifEnabled;
        state.isLightTheme = payload.settings.isLightTheme;
        state.currentTz = payload.settings.currentTz;
    }

    localStorage.setItem('app_lessons', JSON.stringify(state.lessons));
    localStorage.setItem('app_moved_lessons', JSON.stringify(state.movedLessons));
    localStorage.setItem('app_cancelled_dates', JSON.stringify(state.cancelledDates));
    localStorage.setItem('app_single_events', JSON.stringify(state.singleEvents));
    localStorage.setItem('app_non_working', JSON.stringify(state.nonWorkingSlots));
    localStorage.setItem('app_recurring_non_working', JSON.stringify(state.recurringNonWorkingSlots));
    localStorage.setItem('app_working_exceptions', JSON.stringify(state.workingExceptions));
    localStorage.setItem('app_full_day_blocked_slots', JSON.stringify(state.fullDayBlockedSlots));
    localStorage.setItem('app_full_day_removed_exceptions', JSON.stringify(state.fullDayRemovedExceptions));
    localStorage.setItem('app_prep_overrides', JSON.stringify(state.prepOverrides));
    localStorage.setItem('app_completed_preps', JSON.stringify(state.completedPreps)); // ← ДОДАНО
    localStorage.setItem('app_custom_colors', JSON.stringify(state.customColors));
    localStorage.setItem('app_notif_enabled', JSON.stringify(state.isNotifEnabled));
    localStorage.setItem('app_light_theme', JSON.stringify(state.isLightTheme));
    localStorage.setItem('app_timezone', state.currentTz);

    if (timestamp) {
        localStorage.setItem('app_last_updated', timestamp);
    }

    applySavedTheme();
    applySavedColors();
    renderCalendar();
}

function initSnapshotListener(uid) {
    if (state.unsubscribeSnapshot) state.unsubscribeSnapshot();
    const docRef = doc(db, "users", uid);
    state.unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            const source = docSnap.metadata.hasPendingWrites ? "Local" : "Server";
            if (source === "Server") {
                const fullData = docSnap.data();
                const cloudPayload = fullData.payload;
                const cloudTs = fullData.meta?.lastUpdated || 0;
                const localTs = Number(localStorage.getItem('app_last_updated')) || 0;

                if (cloudTs > localTs) {
                    applyCloudData(cloudPayload, cloudTs);
                }

                setSyncStatus("Синхронізовано");
            }
        }
    }, (error) => {
        if (error.code === 'permission-denied') setSyncStatus("Помилка доступу");
        else setSyncStatus("Офлайн");
    });
}