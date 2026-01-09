/**
 * Visual effects - damage numbers, hit sparks, etc.
 */

class DamageNumber {
    constructor(x, y, damage, critical = false) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.critical = critical;
        this.lifetime = 1.0; // seconds
        this.age = 0;
        this.velocity_y = -100; // Float upward
        this.alpha = 1.0;
    }

    update(dt) {
        this.age += dt;
        this.y += this.velocity_y * dt;
        this.alpha = 1.0 - (this.age / this.lifetime);
    }

    isAlive() {
        return this.age < this.lifetime;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.font = this.critical ? 'bold 32px Arial' : 'bold 24px Arial';
        ctx.fillStyle = this.critical ? '#FFD700' : '#FF4444';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        
        const text = this.damage.toString();
        const metrics = ctx.measureText(text);
        const textX = this.x - metrics.width / 2;
        
        ctx.strokeText(text, textX, this.y);
        ctx.fillText(text, textX, this.y);
        ctx.restore();
    }
}

class HitSpark {
    constructor(x, y, opts = null) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.lifetime = 0.3;
        this.age = 0;

        // Create particles
        let particleCount = 8;
        let speedMin = 100;
        let speedMax = 200;
        if (opts && typeof opts === 'object') {
            if (typeof opts.particleCount === 'number') particleCount = opts.particleCount;
            if (typeof opts.speedMin === 'number') speedMin = opts.speedMin;
            if (typeof opts.speedMax === 'number') speedMax = opts.speedMax;
        }
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Utils.randomFloat(speedMin, speedMax);
            this.particles.push({
                x: 0,
                y: 0,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: Utils.randomFloat(2, 4)
            });
        }
    }

    update(dt) {
        this.age += dt;
        for (const particle of this.particles) {
            particle.x += particle.vx * dt;
            particle.y += particle.vy * dt;
            particle.vx *= 0.95; // Friction
            particle.vy *= 0.95;
        }
    }

    isAlive() {
        return this.age < this.lifetime;
    }

    draw(ctx) {
        ctx.save();
        const alpha = 1.0 - (this.age / this.lifetime);
        ctx.globalAlpha = alpha;

        for (const particle of this.particles) {
            const gradient = ctx.createRadialGradient(
                this.x + particle.x, this.y + particle.y, 0,
                this.x + particle.x, this.y + particle.y, particle.size
            );
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.5, '#FFAA00');
            gradient.addColorStop(1, '#FF4444');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x + particle.x, this.y + particle.y, particle.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}

class ScreenShake {
    constructor(duration, intensity) {
        this.duration = duration;
        this.intensity = intensity;
        this.timer = duration;
        this.offsetX = 0;
        this.offsetY = 0;
    }

    update(dt) {
        if (this.timer > 0) {
            this.timer -= dt;
            this.offsetX = (Math.random() - 0.5) * this.intensity;
            this.offsetY = (Math.random() - 0.5) * this.intensity;
        } else {
            this.offsetX = 0;
            this.offsetY = 0;
        }
    }

    isActive() {
        return this.timer > 0;
    }
}

/**
 * Game over animation: overlay fade, centered "GAME OVER" text, shake and falling particles.
 * Usage: const go = new GameOverAnimation(canvas.width, canvas.height); go.start();
 * Call go.update(dt) and go.draw(ctx) each frame while go.isActive() is true.
 */
class GameOverAnimation {
    constructor(width, height, opts = {}) {
        this.width = width || 800;
        this.height = height || 600;
        this.duration = opts.duration || 3.5; // total life in seconds
        this.fadeDuration = opts.fadeDuration || 1.2; // seconds to reach full overlay
        this.particleCount = opts.particleCount || 60;
        this.gravity = opts.gravity || 900;
        this.elapsed = 0;
        this.particles = [];
        this.shake = null;
        this.active = false;
        this.finished = false;
        this.colors = opts.colors || ['#FF2D55', '#FFAA00', '#FFFFFF'];
    }

    start() {
        this.elapsed = 0;
        this.active = true;
        this.finished = false;
        this.particles.length = 0;

        const cx = this.width / 2;
        const cy = this.height / 2 - 40;

        const rand = (a, b) => (typeof Utils !== 'undefined' && Utils.randomFloat) ? Utils.randomFloat(a, b) : (Math.random() * (b - a) + a);

        for (let i = 0; i < this.particleCount; i++) {
            const angle = rand(-Math.PI, 0);
            const speed = rand(120, 520);
            this.particles.push({
                x: cx + rand(-40, 40),
                y: cy + rand(-20, 20),
                vx: Math.cos(angle) * speed + rand(-60, 60),
                vy: Math.sin(angle) * speed + rand(-300, -120),
                size: rand(2, 6),
                color: this.colors[Math.floor(rand(0, this.colors.length))],
                alpha: 1
            });
        }

        // Initial screen shake
        this.shake = new ScreenShake(this.duration * 0.6, 18);
    }

    update(dt) {
        if (!this.active) return;
        this.elapsed += dt;

        // Update particles
        for (const p of this.particles) {
            p.vy += this.gravity * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.995;
            p.vy *= 0.995;
            p.alpha = Math.max(0, 1 - (this.elapsed / this.duration));
        }

        // Update shake
        if (this.shake) this.shake.update(dt);

        if (this.elapsed >= this.duration) {
            this.active = false;
            this.finished = true;
            this.shake = null;
        }
    }

    draw(ctx) {
        if (!this.active && !this.finished) return;

        ctx.save();

        // Apply screen shake offset while active
        if (this.shake && this.shake.isActive()) {
            ctx.translate(this.shake.offsetX, this.shake.offsetY);
        }

        // Overlay fade (0 -> 1)
        const overlayAlpha = Math.min(1, Math.max(0, this.elapsed / this.fadeDuration));
        ctx.fillStyle = `rgba(0,0,0,${overlayAlpha})`;
        ctx.fillRect(0, 0, this.width, this.height);

        // Draw particles (above overlay so they feel like foreground debris)
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
            grad.addColorStop(0, '#FFFFFF');
            grad.addColorStop(0.5, p.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Centered GAME OVER text with neon glow
        const text = 'GAME OVER';
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const centerX = this.width / 2;
        const centerY = this.height / 2 - 40;

        // Glow
        ctx.font = 'bold 64px Arial';
        ctx.fillStyle = '#FF2D55';
        ctx.shadowColor = '#FF2D55';
        ctx.shadowBlur = 30 * overlayAlpha;
        ctx.globalAlpha = Math.min(1, 0.85 + overlayAlpha * 0.15);
        ctx.fillText(text, centerX, centerY);

        // White core
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 48px Arial';
        ctx.fillText(text, centerX, centerY + 6);
        ctx.restore();

        ctx.restore();
    }

    isActive() {
        return this.active;
    }

    isFinished() {
        return this.finished;
    }
}
