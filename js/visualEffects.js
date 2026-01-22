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
 * MovementFX: lightweight environmental particles tied to player movement.
 * Emits dust puffs, leaves, or sparks depending on level theme.
 */
class MovementFX {
    constructor(opts = {}) {
        this.particles = [];
        this.stepTimer = 0;
        this.stepInterval = (typeof opts.stepInterval === 'number') ? opts.stepInterval : 0.12;
        this.maxParticles = (typeof opts.maxParticles === 'number') ? opts.maxParticles : 180;
    }

    _themeForLevel(level) {
        const bg = (level && level.backgroundName) ? String(level.backgroundName) : '';
        if (bg.includes('forest')) return { mode: 'leaf', color: '#7fd26b', alt: '#5fb956' };
        if (bg.includes('city')) return { mode: 'spark', color: '#ffd65c', alt: '#ff9a2b' };
        if (bg.includes('mountain')) return { mode: 'dust', color: '#c9c9c9', alt: '#9a9a9a' };
        if (bg.includes('cave')) return { mode: 'dust', color: '#b09adf', alt: '#7e6ab7' };
        return { mode: 'dust', color: '#cfcfcf', alt: '#a8a8a8' };
    }

    _emitParticle(x, y, opts) {
        if (this.particles.length >= this.maxParticles) this.particles.shift();
        this.particles.push({
            x,
            y,
            vx: opts.vx || 0,
            vy: opts.vy || 0,
            size: opts.size || 3,
            life: opts.life || 0.4,
            age: 0,
            color: opts.color || '#cfcfcf',
            alpha: 1,
            gravity: (typeof opts.gravity === 'number') ? opts.gravity : 120,
            mode: opts.mode || 'dust'
        });
    }

    emitRun(x, y, dir, level, intensity = 1) {
        const theme = this._themeForLevel(level);
        const count = Math.max(2, Math.floor(4 * intensity));
        for (let i = 0; i < count; i++) {
            const spread = Utils.randomFloat(-20, 20);
            const speed = Utils.randomFloat(30, 90) * (dir || 1);
            this._emitParticle(x + spread, y + Utils.randomFloat(-4, 2), {
                vx: speed * 0.35,
                vy: Utils.randomFloat(-40, -10),
                size: Utils.randomFloat(2, 4),
                life: Utils.randomFloat(0.25, 0.5),
                color: Math.random() > 0.5 ? theme.color : theme.alt,
                gravity: 180,
                mode: theme.mode
            });
        }
    }

    emitLand(x, y, level, force = 1) {
        const theme = this._themeForLevel(level);
        const count = Math.max(4, Math.floor(8 * force));
        for (let i = 0; i < count; i++) {
            const angle = Utils.randomFloat(Math.PI, Math.PI * 2);
            const speed = Utils.randomFloat(60, 200) * force;
            this._emitParticle(x, y, {
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed * 0.6,
                size: Utils.randomFloat(2, 5),
                life: Utils.randomFloat(0.35, 0.6),
                color: Math.random() > 0.5 ? theme.color : theme.alt,
                gravity: 260,
                mode: theme.mode
            });
        }
    }

    emitFromPlayer(player, level, dt, meta = {}) {
        if (!player) return;
        const speed = Math.abs(player.velocityX || 0);
        const grounded = !!player.onGround;
        const dir = player.facingRight ? 1 : -1;
        const baseY = player.y + (player.height || 64) - 4;
        const baseX = player.x + (player.width || 64) * 0.5;

        if (grounded && speed > 80) {
            this.stepTimer -= dt;
            if (this.stepTimer <= 0) {
                const intensity = Utils.clamp(speed / 300, 0.6, 1.6);
                this.emitRun(baseX - dir * 12, baseY, dir, level, intensity);
                this.stepTimer = this.stepInterval;
            }
        }

        // Landing burst
        if (meta && meta.prevOnGround === false && grounded) {
            const fallSpeed = Math.abs(meta.prevVY || 0);
            if (fallSpeed > 220) {
                const force = Utils.clamp(fallSpeed / 700, 0.6, 1.8);
                this.emitLand(baseX, baseY, level, force);
            }
        }
    }

    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.age += dt;
            p.vy += (p.gravity || 0) * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.alpha = Math.max(0, 1 - (p.age / p.life));
            if (p.age >= p.life) this.particles.splice(i, 1);
        }
    }

    draw(ctx) {
        for (const p of this.particles) {
            ctx.save();
            ctx.globalAlpha = p.alpha;
            if (p.mode === 'spark') {
                ctx.strokeStyle = p.color;
                ctx.lineWidth = Math.max(1, p.size * 0.5);
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
                ctx.stroke();
            } else {
                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }
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
