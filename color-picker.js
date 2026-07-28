import { updateThemeColor } from "./settings.js";

const PICKER_WIDTH = 220;
const PICKER_HEIGHT = 160;

let currentVarName = '';
let isSVDragging = false;
let isHueDragging = false;

let currentHsv = { h: 0, s: 0, v: 1 };

function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(c => Math.round(c).toString(16).padStart(2, '0')).join('');
}

function rgbToHsv(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;
    if (d) {
        if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        else if (max === g) h = ((b - r) / d + 2) / 6;
        else h = ((r - g) / d + 4) / 6;
    }
    return { h, s, v };
}

function hsvToRgb(h, s, v) {
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    const [r, g, b] = [[v, t, p], [q, v, p], [p, v, t], [p, q, v], [t, p, v], [v, p, q]][i % 6];
    return { r: r * 255, g: g * 255, b: b * 255 };
}

function renderSVField(canvas, hue) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const imgData = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const s = x / w;
            const v = 1 - y / h;
            const c = hsvToRgb(hue, s, v);
            const i = (y * w + x) * 4;
            imgData.data[i] = c.r;
            imgData.data[i + 1] = c.g;
            imgData.data[i + 2] = c.b;
            imgData.data[i + 3] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}

function renderHueBar(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    for (let x = 0; x < w; x++) {
        const hue = x / w;
        const rgb = hsvToRgb(hue, 1, 1);
        ctx.fillStyle = rgbToHex(Math.round(rgb.r), Math.round(rgb.g), Math.round(rgb.b));
        ctx.fillRect(x, 0, 1, h);
    }
}

function updateModalUI() {
    const hex = rgbToHex(...Object.values(hsvToRgb(currentHsv.h, currentHsv.s, currentHsv.v)).map(Math.round));
    const preview = document.querySelector('.cp-preview');
    const cpHex = document.querySelector('.cp-hex-input');
    const svHandle = document.querySelector('.cp-sv-handle');
    const hueHandle = document.querySelector('.cp-hue-handle');
    if (preview) preview.style.background = hex;
    if (cpHex) cpHex.value = hex.slice(1);
    if (svHandle) {
        svHandle.style.left = `${currentHsv.s * PICKER_WIDTH}px`;
        svHandle.style.top = `${(1 - currentHsv.v) * PICKER_HEIGHT}px`;
    }
    if (hueHandle) hueHandle.style.left = `${currentHsv.h * PICKER_WIDTH}px`;
}

function getCurrentHexFromPicker() {
    return rgbToHex(...Object.values(hsvToRgb(currentHsv.h, currentHsv.s, currentHsv.v)).map(Math.round));
}

export function openColorPicker(varName) {
    const modal = document.getElementById('colorPickerModal');
    if (!modal) return;

    currentVarName = varName;
    const root = getComputedStyle(document.documentElement);
    const currentHex = root.getPropertyValue(varName).trim() || '#000000';
    const rgb = hexToRgb(currentHex);
    currentHsv = rgbToHsv(rgb.r, rgb.g, rgb.b);

    const svCanvas = modal.querySelector('.cp-sv-canvas');
    const hueCanvas = modal.querySelector('.cp-hue-canvas');
    if (svCanvas) {
        renderSVField(svCanvas, currentHsv.h);
        svCanvas.style.background = 'transparent';
    }
    if (hueCanvas) renderHueBar(hueCanvas);

    const cpHex = modal.querySelector('.cp-hex-input');
    if (cpHex) cpHex.value = currentHex.slice(1);

    updateModalUI();

    modal.style.display = 'flex';
}

export function closeColorPicker() {
    const modal = document.getElementById('colorPickerModal');
    if (modal) modal.style.display = 'none';
    isSVDragging = false;
    isHueDragging = false;
}

function applyColorPicker() {
    const hex = getCurrentHexFromPicker();
    if (currentVarName) {
        updateThemeColor(currentVarName, hex);
        const preview = document.querySelector(`.color-preview[data-var="${currentVarName}"]`);
        if (preview) preview.style.background = hex;
    }
    closeColorPicker();
}

function onSVMove(canvas, clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(PICKER_WIDTH, clientX - rect.left));
    const y = Math.max(0, Math.min(PICKER_HEIGHT, clientY - rect.top));
    currentHsv.s = x / PICKER_WIDTH;
    currentHsv.v = 1 - y / PICKER_HEIGHT;
    updateModalUI();
}

function onHueMove(canvas, clientX) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0, Math.min(PICKER_WIDTH, clientX - rect.left));
    currentHsv.h = x / PICKER_WIDTH;
    const svCanvas = document.querySelector('.cp-sv-canvas');
    if (svCanvas) renderSVField(svCanvas, currentHsv.h);
    updateModalUI();
}

export function initColorPickers() {
    document.querySelectorAll('.color-preview').forEach(preview => {
        const varName = preview.dataset.var;
        if (!varName) return;

        const root = getComputedStyle(document.documentElement);
        preview.style.background = root.getPropertyValue(varName).trim();

        preview.addEventListener('click', () => openColorPicker(varName));
    });

    const modal = document.getElementById('colorPickerModal');
    if (!modal) return;

    const svCanvas = modal.querySelector('.cp-sv-canvas');
    const hueCanvas = modal.querySelector('.cp-hue-canvas');
    const cpHex = modal.querySelector('.cp-hex-input');

    if (svCanvas) {
        svCanvas.addEventListener('mousedown', (e) => {
            isSVDragging = true;
            onSVMove(svCanvas, e.clientX, e.clientY);
        });
        svCanvas.addEventListener('touchstart', (e) => {
            isSVDragging = true;
            onSVMove(svCanvas, e.touches[0].clientX, e.touches[0].clientY);
        });
    }

    if (hueCanvas) {
        hueCanvas.addEventListener('mousedown', (e) => {
            isHueDragging = true;
            onHueMove(hueCanvas, e.clientX);
        });
        hueCanvas.addEventListener('touchstart', (e) => {
            isHueDragging = true;
            onHueMove(hueCanvas, e.touches[0].clientX);
        });
    }

    document.addEventListener('mousemove', (e) => {
        if (isSVDragging && svCanvas) onSVMove(svCanvas, e.clientX, e.clientY);
        if (isHueDragging && hueCanvas) onHueMove(hueCanvas, e.clientX);
    });

    document.addEventListener('touchmove', (e) => {
        if (isSVDragging && svCanvas) onSVMove(svCanvas, e.touches[0].clientX, e.touches[0].clientY);
        if (isHueDragging && hueCanvas) onHueMove(hueCanvas, e.touches[0].clientX);
    });

    document.addEventListener('mouseup', () => { isSVDragging = false; isHueDragging = false; });
    document.addEventListener('touchend', () => { isSVDragging = false; isHueDragging = false; });

    if (cpHex) {
        cpHex.addEventListener('input', () => {
            const val = cpHex.value;
            if (/^[0-9a-fA-F]{6}$/.test(val)) {
                const c = hexToRgb('#' + val);
                currentHsv = rgbToHsv(c.r, c.g, c.b);
                if (svCanvas) renderSVField(svCanvas, currentHsv.h);
                updateModalUI();
            }
        });
    }

    document.getElementById('btnApplyColor')?.addEventListener('click', applyColorPicker);
    document.getElementById('btnCancelColor')?.addEventListener('click', closeColorPicker);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeColorPicker();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display !== 'none') closeColorPicker();
    });
}
