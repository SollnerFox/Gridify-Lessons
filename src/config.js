import { initializeApp } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.10.0/firebase-firestore.js";

export const isDev = location.hostname === 'localhost' || location.hostname === '127.0.0.1' ||
    new URLSearchParams(window.location.search).has('dev') ||
    localStorage.getItem('db_mode') === 'dev';

const firebaseConfig = isDev ? {
    apiKey: "AIzaSyAHv_kFE3Ps2KA7EWPAFwAx9LMqnFnD-xc",
    authDomain: "gridify-lessons-dev.firebaseapp.com",
    projectId: "gridify-lessons-dev",
    storageBucket: "gridify-lessons-dev.firebasestorage.app",
    messagingSenderId: "717272115027",
    appId: "1:717272115027:web:dda000866b22f92b1be3a6"
} : {
    apiKey: "AIzaSyD5DxkDafTgOh_C-PnLbmAC39EJjXrJklU",
    authDomain: "gridify-lesson.firebaseapp.com",
    projectId: "gridify-lesson",
    storageBucket: "gridify-lesson.firebasestorage.app",
    messagingSenderId: "1088201366915",
    appId: "1:1088201366915:web:ff04534795a524d293eab6"
};

const appName = isDev ? 'dev' : 'prod';
export const app = initializeApp(firebaseConfig, appName);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Прапорець «є реальна зміна для користувача».
// ЗМІНЮЙ ЙОГО (на будь-яке унікальне значення) ТІЛЬКИ КОЛИ Є РЕАЛЬНІ ЗМІНИ — тоді покажеться банер «Вийшла нова версія».
// Технічні бампи версії НЕ чіпають цей рядок → банер не показується.
// null = банер вимкнено.
export const UPDATE_NOTICE = '1.0.33';

export const WORK_START_HOUR = 8;
export const WORK_END_HOUR = 22;
export const LESSON_DURATION = 90;
export const SLOT_HEIGHT = 40; // висота 30-хвилинного слота в пікселях

export const REGIONAL_TIMEZONES = [
    { zone: 'Pacific/Midway', label: '(UTC-11:00) Мідуей, Паго-Паго' },
    { zone: 'Pacific/Honolulu', label: '(UTC-10:00) Гонолулу, Гаваї' },
    { zone: 'America/Anchorage', label: '(UTC-09:00) Аляска' },
    { zone: 'America/Los_Angeles', label: '(UTC-08:00) Тихоокеанський час' },
    { zone: 'America/Phoenix', label: '(UTC-07:00) Фенікс, Аризона' },
    { zone: 'America/Denver', label: '(UTC-07:00) Гірський час' },
    { zone: 'America/Chicago', label: '(UTC-06:00) Центральний час' },
    { zone: 'America/New_York', label: '(UTC-05:00) Східний час' },
    { zone: 'America/Caracas', label: '(UTC-04:00) Каракас' },
    { zone: 'America/Santiago', label: '(UTC-04:00) Сантьяго' },
    { zone: 'America/St_Johns', label: '(UTC-03:30) Ньюфаундленд' },
    { zone: 'America/Argentina/Buenos_Aires', label: '(UTC-03:00) Буенос-Айрес' },
    { zone: 'America/Noronha', label: '(UTC-02:00) Фернанду-ді-Норонья' },
    { zone: 'Atlantic/Azores', label: '(UTC-01:00) Азорські острови' },
    { zone: 'Europe/London', label: '(UTC+00:00) Лондон, Дублін' },
    { zone: 'Europe/Warsaw', label: '(UTC+01:00) Варшава, Берлін' },
    { zone: 'Europe/Kyiv', label: '(UTC+02:00) Київ, Кишинів' },
    { zone: 'Asia/Jerusalem', label: '(UTC+02:00) Єрусалим' },
    { zone: 'Europe/Istanbul', label: '(UTC+03:00) Стамбул' },
    { zone: 'Asia/Dubai', label: '(UTC+04:00) Дубай' },
    { zone: 'Asia/Kabul', label: '(UTC+04:30) Кабул' },
    { zone: 'Asia/Tashkent', label: '(UTC+05:00) Ташкент' },
    { zone: 'Asia/Kolkata', label: '(UTC+05:30) Нью-Делі' },
    { zone: 'Asia/Kathmandu', label: '(UTC+05:45) Катманду' },
    { zone: 'Asia/Dhaka', label: '(UTC+06:00) Дакка' },
    { zone: 'Asia/Yangon', label: '(UTC+06:30) Янгон' },
    { zone: 'Asia/Bangkok', label: '(UTC+07:00) Бангкок' },
    { zone: 'Asia/Shanghai', label: '(UTC+08:00) Пекін, Гонконг' },
    { zone: 'Asia/Tokyo', label: '(UTC+09:00) Токіо' },
    { zone: 'Australia/Darwin', label: '(UTC+09:30) Дарвін' },
    { zone: 'Australia/Sydney', label: '(UTC+10:00) Сідней' },
    { zone: 'Pacific/Guadalcanal', label: '(UTC+11:00) Соломонові Острови' },
    { zone: 'Pacific/Auckland', label: '(UTC+12:00) Окленд' },
    { zone: 'Pacific/Tongatapu', label: '(UTC+13:00) Нукуалофа' },
    { zone: 'Pacific/Kiritimati', label: '(UTC+14:00) Острови Лайн' }
];