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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.particles = [];
        this.lifetime = 0.3;
        this.age = 0;

        // Create particles
        const particleCount = 8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = Utils.randomFloat(100, 200);
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
