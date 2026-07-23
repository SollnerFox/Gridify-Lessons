import { state } from "./state.js";
import { saveAllData } from "./storage.js";

class NotificationManager {
    constructor() {
        this.audioCtx = null;
        this.titleInterval = null;
        this.originalTitle = document.title;
    }

    initAudio() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                this.audioCtx = new AudioContextClass();
            }
        }
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    playAlarm() {
        try {
            this.initAudio();
            if (!this.audioCtx) return;

            const oscillator = this.audioCtx.createOscillator();
            const gainNode = this.audioCtx.createGain();

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(880, this.audioCtx.currentTime);
            gainNode.gain.setValueAtTime(0.15, this.audioCtx.currentTime);

            oscillator.connect(gainNode);
            gainNode.connect(this.audioCtx.destination);

            oscillator.start();
            oscillator.stop(this.audioCtx.currentTime + 1.2);
        } catch (error) {
            console.error('Помилка відтворення аудіо:', error);
        }
    }

    async requestPermission() {
        if (!("Notification" in window)) return false;
        if (Notification.permission === "granted") return true;
        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
        return false;
    }

    trigger(title, body) {
        if (!state.isNotifEnabled) return;

        this.playAlarm();

        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, {
                body: body,
                requireInteraction: true,
                silent: false
            });
        }

        this.startTitleBlinking();
    }

    startTitleBlinking() {
        if (this.titleInterval) return;
        let isAlt = false;

        this.titleInterval = setInterval(() => {
            document.title = isAlt ? "🔔 УРОК ПОЧИНАЄТЬСЯ!" : this.originalTitle;
            isAlt = !isAlt;
        }, 1000);

        const stopBlinking = () => {
            if (this.titleInterval) {
                clearInterval(this.titleInterval);
                this.titleInterval = null;
                document.title = this.originalTitle;
            }
            window.removeEventListener('focus', stopBlinking);
            window.removeEventListener('click', stopBlinking);
        };

        window.addEventListener('focus', stopBlinking, { once: true });
        window.addEventListener('click', stopBlinking, { once: true });
    }

    bindToggle(selector) {
        const toggleElement = document.querySelector(selector);
        if (!toggleElement) return;

        toggleElement.checked = !!state.isNotifEnabled;

        toggleElement.addEventListener('change', async (event) => {
            if (event.target.checked) {
                const granted = await this.requestPermission();
                if (granted) {
                    state.isNotifEnabled = true;
                } else {
                    event.target.checked = false;
                    state.isNotifEnabled = false;
                }
            } else {
                state.isNotifEnabled = false;
            }
            saveAllData();
            this.initAudio();
        });
    }
}

export const notificationManager = new NotificationManager();