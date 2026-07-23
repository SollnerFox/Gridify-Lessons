import {
    GoogleAuthProvider, signInWithPopup, signInAnonymously,
    onAuthStateChanged, linkWithPopup, signInWithCredential, signOut
} from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { doc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";
import { auth, db } from "./config.js";
import { state } from "./state.js";
import { setSyncStatus, forceSaveToCloud } from "./storage.js";
import { renderCalendar } from "./calendar.js";
import { applySavedTheme, applySavedColors } from "./settings.js";

export function initAuthListeners() {
    const handleGoogleAuth = async () => {
        const provider = new GoogleAuthProvider();
        try {
            if (auth.currentUser && auth.currentUser.isAnonymous) {
                try {
                    await linkWithPopup(auth.currentUser, provider);
                    alert("Акаунт успішно прив'язано до Google!");
                } catch (linkError) {
                    if (linkError.code === 'auth/credential-already-in-use') {
                        const credential = linkError.credential;
                        await signOut(auth);
                        if (credential) {
                            await signInWithCredential(auth, credential);
                        } else {
                            await signInWithPopup(auth, provider);
                        }
                    } else {
                        throw linkError;
                    }
                }
            } else {
                await signInWithPopup(auth, provider);
            }
        } catch (error) {
            console.error("Помилка авторизації:", error);
        }
    };

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
            } else {
                await checkSyncConflict(user.uid);
            }
        } else {
            state.currentUser = null;
            updateSettingsUI();
            if (authModal) authModal.style.display = 'flex';
            setSyncStatus("Офлайн");
        }
    });
}

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
        dropdownBtn.addEventListener('click', async () => {
            const provider = new GoogleAuthProvider();
            try {
                if (auth.currentUser && auth.currentUser.isAnonymous) {
                    try {
                        await linkWithPopup(auth.currentUser, provider);
                    } catch (linkError) {
                        if (linkError.code === 'auth/credential-already-in-use') {
                            const credential = linkError.credential;
                            await signOut(auth);
                            if (credential) {
                                await signInWithCredential(auth, credential);
                            } else {
                                await signInWithPopup(auth, provider);
                            }
                        } else {
                            throw linkError;
                        }
                    }
                } else {
                    await signInWithPopup(auth, provider);
                }
                updateSettingsUI();
            } catch (error) {
                console.error("Помилка авторизації:", error);
            }
        });
    }
}

function deepSortObject(obj) {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(deepSortObject);
    }
    const sortedKeys = Object.keys(obj).sort();
    const result = {};
    for (const key of sortedKeys) {
        result[key] = deepSortObject(obj[key]);
    }
    return result;
}

async function checkSyncConflict(uid) {
    setSyncStatus("Перевірка даних...");
    try {
        const docRef = doc(db, "users", uid);
        const docSnap = await getDoc(docRef);
        const hasLocalData = state.lessons.length > 0 || state.movedLessons.length > 0;

        if (!docSnap.exists()) {
            if (hasLocalData) await forceSaveToCloud();
            initSnapshotListener(uid);
            return;
        }

        const cloudData = docSnap.data();
        const hasCloudData = cloudData.payload && ((cloudData.payload.lessons && cloudData.payload.lessons.length > 0) || (cloudData.payload.movedLessons && cloudData.payload.movedLessons.length > 0));

        if (!hasCloudData) {
            if (hasLocalData) await forceSaveToCloud();
            initSnapshotListener(uid);
            return;
        }

        const localPayload = {
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

        const sortedLocal = JSON.stringify(deepSortObject(localPayload));
        const sortedCloud = JSON.stringify(deepSortObject(cloudData.payload));

        if (sortedLocal === sortedCloud) {
            initSnapshotListener(uid);
            setSyncStatus("Синхронізовано");
            return;
        }

        if (hasLocalData && hasCloudData) {
            showConflictModal(cloudData);
        } else if (!hasLocalData && hasCloudData) {
            applyCloudData(cloudData.payload);
            initSnapshotListener(uid);
        } else {
            initSnapshotListener(uid);
        }
    } catch (error) {
        console.error("Помилка синхронізації з Firestore:", error);
        setSyncStatus("Помилка зв'язку / Офлайн");
    }
}

function showConflictModal(cloudData) {
    const conflictModal = document.getElementById('conflictModal');
    if (conflictModal) conflictModal.style.display = 'flex';

    const cloudDate = new Date(cloudData.meta.lastUpdated).toLocaleString('uk-UA');
    document.getElementById('cloudMetaInfo').innerText = `Оновлено: ${cloudDate}\nЗанять: ${cloudData.meta.totalLessons}`;

    const localTimestamp = localStorage.getItem('app_last_updated') ? Number(localStorage.getItem('app_last_updated')) : Date.now();
    const localDate = new Date(localTimestamp).toLocaleString('uk-UA');
    const totalLocalLessons = state.lessons.length + state.movedLessons.length;
    document.getElementById('localMetaInfo').innerText = `Оновлено: ${localDate}\nЗанять: ${totalLocalLessons}`;

    document.getElementById('btnUseCloud').onclick = () => {
        applyCloudData(cloudData.payload);
        if (conflictModal) conflictModal.style.display = 'none';
        initSnapshotListener(state.currentUser.uid);
    };

    document.getElementById('btnUseLocal').onclick = async () => {
        await forceSaveToCloud();
        if (conflictModal) conflictModal.style.display = 'none';
        initSnapshotListener(state.currentUser.uid);
    };
}

function applyCloudData(payload) {
    state.lessons = payload.lessons || [];
    state.movedLessons = payload.movedLessons || [];
    state.cancelledDates = payload.cancelledDates || [];
    state.singleEvents = payload.singleEvents || [];
    state.nonWorkingSlots = payload.nonWorkingSlots || [];
    state.recurringNonWorkingSlots = payload.recurringNonWorkingSlots || [];
    state.workingExceptions = payload.workingExceptions || [];
    state.prepOverrides = payload.prepOverrides || {};
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
    localStorage.setItem('app_prep_overrides', JSON.stringify(state.prepOverrides));
    localStorage.setItem('app_custom_colors', JSON.stringify(state.customColors));
    localStorage.setItem('app_notif_enabled', JSON.stringify(state.isNotifEnabled));
    localStorage.setItem('app_light_theme', JSON.stringify(state.isLightTheme));
    localStorage.setItem('app_timezone', state.currentTz);

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
                applyCloudData(docSnap.data().payload);
                setSyncStatus("Синхронізовано");
            }
        }
    }, (error) => {
        if (error.code === 'permission-denied') setSyncStatus("Помилка доступу");
        else setSyncStatus("Офлайн");
    });
}