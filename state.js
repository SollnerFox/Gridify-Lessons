export function getMonday(d) {
    d = new Date(d);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

export function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// state.js - ПРОБЛЕМА 1: Відсутня ініціалізація unsubscribeSnapshot
// ВИПРАВЛЕНА ФУНКЦІЯ state
export const state = {
    currentWeekStart: getMonday(new Date()),
    isNonWorkingEditMode: false,
    isMouseDown: false,
    isSelectingMode: true,
    selectedSlots: new Set(),
    lessons: JSON.parse(localStorage.getItem('app_lessons') || '[]'),
    movedLessons: JSON.parse(localStorage.getItem('app_moved_lessons') || '[]'),
    cancelledDates: JSON.parse(localStorage.getItem('app_cancelled_dates') || '[]'),
    singleEvents: JSON.parse(localStorage.getItem('app_single_events') || '[]'),
    nonWorkingSlots: JSON.parse(localStorage.getItem('app_non_working') || '[]'),
    recurringNonWorkingSlots: JSON.parse(localStorage.getItem('app_recurring_non_working') || '[]'),
    workingExceptions: JSON.parse(localStorage.getItem('app_working_exceptions') || '[]'),
    fullDayBlockedSlots: JSON.parse(localStorage.getItem('app_full_day_blocked_slots') || '[]'),
    fullDayRemovedExceptions: JSON.parse(localStorage.getItem('app_full_day_removed_exceptions') || '[]'),
    prepOverrides: JSON.parse(localStorage.getItem('app_prep_overrides') || '{}'),
    completedPreps: JSON.parse(localStorage.getItem('app_completed_preps') || '[]'),
    customColors: JSON.parse(localStorage.getItem('app_custom_colors') || '{}'),
    isNotifEnabled: JSON.parse(localStorage.getItem('app_notif_enabled') || 'false'),
    isLightTheme: JSON.parse(localStorage.getItem('app_light_theme') || 'false'),
    currentTz: localStorage.getItem('app_timezone') || 'Europe/Kyiv',
    notifiedEvents: new Set(),
    saveTimeout: null,
    syncTimeout: null, // ← ДОДАНО
    unsubscribeSnapshot: null, // ← ДОДАНО
    currentUser: null,
    suppressAuthModal: false,
    wasAnonymous: false
};