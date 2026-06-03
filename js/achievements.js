/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// achievements.js

class Achievements {
    constructor(audioManager = null) {
        this.audioManager = audioManager;
        this.achievements = {};
        this.unlocked = new Set();
        this.queue = [];
        this.notification = null;
        this.load();
    }

    register(id, name, description) {
        this.achievements[id] = { name, description, unlocked: false };
    }

    unlock(id) {
        if (this.achievements[id] && !this.unlocked.has(id)) {
            this.unlocked.add(id);
            this.achievements[id].unlocked = true;
            this.queue.push(this.achievements[id]);
            if (!this.notification) {
                this.showNextNotification();
            }
            this.save();
            // Analytics: achievement unlock
            try {
                if (typeof Analytics !== 'undefined') {
                    Analytics.trackAchievement({ id, name: this.achievements[id].name });
                }
            } catch (e) { /* */ }
            // Play achievement unlock fanfare
            if (this.audioManager) {
                this.audioManager.playSound('achievement_unlock', { volume: 0.85, rate: 1.0 });
            }
            // Steam: mirror achievement unlock via Electron IPC when running as desktop app.
            // electronAPI.platform === 'steam' is set by electron/preload.js.
            if (window.electronAPI && window.electronAPI.platform === 'steam') {
                window.electronAPI.unlockAchievement(id).catch(() => { /* non-fatal */ });
            }
        }
    }

    showNextNotification() {
        if (this.queue.length === 0) {
            this.notification = null;
            return;
        }

        const achievement = this.queue.shift();
        this.notification = document.createElement('div');
        this.notification.className = 'achievement-notification';
        this.notification.innerHTML = `
            <h3>Achievement Unlocked!</h3>
            <p>${achievement.name}</p>
        `;
        document.body.appendChild(this.notification);

        setTimeout(() => {
            this.notification.remove();
            this.showNextNotification();
        }, 3000);
    }

    save() {
        try {
            localStorage.setItem('achievements', JSON.stringify(Array.from(this.unlocked)));
        } catch (e) { __err('ach', e); }
    }

    load() {
        let unlocked = null;
        try {
            unlocked = JSON.parse(localStorage.getItem('achievements'));
        } catch (e) {
            unlocked = null;
        }
        if (unlocked) {
            this.unlocked = new Set(unlocked);
            for (const id of this.unlocked) {
                if (this.achievements[id]) {
                    this.achievements[id].unlocked = true;
                }
            }
        }
    }
}
