// achievements.js

class Achievements {
    constructor() {
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
        localStorage.setItem('achievements', JSON.stringify(Array.from(this.unlocked)));
    }

    load() {
        const unlocked = JSON.parse(localStorage.getItem('achievements'));
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
