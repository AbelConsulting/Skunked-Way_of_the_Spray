/*
 * TouchControls - on-screen touch buttons and sensitivity slider
 * Emits `touchcontrol` CustomEvent with detail { action: 'left'|'right'|'jump'|'attack'|'pause', down: boolean }
 */
(function(){
    class TouchControls {
        constructor(options = {}){
            this.enabled = options.enabled !== undefined ? options.enabled : (typeof Config !== 'undefined' ? Config.TOUCH_UI.enabled : true);
            this.sensitivity = options.sensitivity || (typeof Config !== 'undefined' ? Config.TOUCH_UI.sensitivity : 1.0);
            this.container = null;
            this._createUI();
        }

        _createUI(){
            if (!this.enabled) return;
            // Only show on touch-capable devices
            if (!('ontouchstart' in window)) return;

            const container = document.createElement('div');
            container.id = 'touch-controls';
            container.style.position = 'fixed';
            container.style.left = '0';
            container.style.right = '0';
            container.style.bottom = '0';
            container.style.height = '220px';
            container.style.pointerEvents = 'none';
            container.style.zIndex = '2000';

            // Left/Right/JUMP area
            const leftBtn = this._createButton('◀', 'left-btn');
            const rightBtn = this._createButton('▶', 'right-btn');
            const jumpBtn = this._createButton('▲', 'jump-btn');
            const attackBtn = this._createButton('A', 'attack-btn');

            const leftGroup = document.createElement('div');
            leftGroup.style.position = 'absolute';
            leftGroup.style.left = '12px';
            leftGroup.style.bottom = '12px';
            leftGroup.style.pointerEvents = 'auto';
            leftGroup.appendChild(leftBtn);
            leftGroup.appendChild(rightBtn);

            const rightGroup = document.createElement('div');
            rightGroup.style.position = 'absolute';
            rightGroup.style.right = '12px';
            rightGroup.style.bottom = '12px';
            rightGroup.style.pointerEvents = 'auto';
            rightGroup.appendChild(jumpBtn);
            rightGroup.appendChild(attackBtn);

            // Restart button (hidden by default, shown on game over)
            const restartBtn = this._createButton('Restart', 'restart-btn');
            restartBtn.style.position = 'absolute';
            restartBtn.style.left = '50%';
            restartBtn.style.bottom = '12px';
            restartBtn.style.transform = 'translateX(-50%)';
            restartBtn.style.display = 'none';
            restartBtn.style.width = '160px';
            restartBtn.style.height = '56px';
            restartBtn.style.fontSize = '18px';
            restartBtn.style.borderRadius = '8px';
            restartBtn.style.background = 'rgba(255,80,80,0.9)';
            restartBtn.style.pointerEvents = 'auto';

            container.appendChild(restartBtn);

            // Small settings control
            const settings = document.createElement('div');
            settings.style.position = 'absolute';
            settings.style.left = '50%';
            settings.style.bottom = '12px';
            settings.style.transform = 'translateX(-50%)';
            settings.style.pointerEvents = 'auto';

            const sensitivityLabel = document.createElement('label');
            sensitivityLabel.style.color = '#fff';
            sensitivityLabel.style.fontSize = '12px';
            sensitivityLabel.style.display = 'block';
            sensitivityLabel.style.textAlign = 'center';
            sensitivityLabel.textContent = 'Sensitivity';

            const sensitivityInput = document.createElement('input');
            sensitivityInput.type = 'range';
            sensitivityInput.min = '0.5';
            sensitivityInput.max = '1.5';
            sensitivityInput.step = '0.05';
            sensitivityInput.value = String(this.sensitivity);
            sensitivityInput.style.width = '160px';

            sensitivityInput.addEventListener('input', (e) => {
                this.sensitivity = parseFloat(e.target.value);
                window.dispatchEvent(new CustomEvent('touchSensitivityChanged', { detail: { sensitivity: this.sensitivity } }));
            });

            settings.appendChild(sensitivityLabel);
            settings.appendChild(sensitivityInput);

            container.appendChild(leftGroup);
            container.appendChild(rightGroup);
            container.appendChild(settings);

            document.body.appendChild(container);
            this.container = container;

            // Bind buttons
            this._bindButton(leftBtn, 'left');
            this._bindButton(rightBtn, 'right');
            this._bindButton(jumpBtn, 'jump');
            this._bindButton(attackBtn, 'attack');
            this._bindButton(restartBtn, 'restart');

            // Log creation
            try { window && window.logTouchControlEvent && window.logTouchControlEvent('touchControls_created', { touchControls: true }); } catch (e) {}

            // Show/hide restart button on game state changes
            window.addEventListener('gameStateChange', (e) => {
                try { window && window.logTouchControlEvent && window.logTouchControlEvent('gameStateChange', { state: e && e.detail && e.detail.state }); } catch (e) {}
                if (!e || !e.detail) return;
                const st = e.detail.state;
                if (st === 'GAME_OVER') {
                    restartBtn.style.display = 'block';
                } else {
                    restartBtn.style.display = 'none';
                }
            });
        }

        _createButton(text, cls){
            const btn = document.createElement('button');
            btn.className = 'touch-btn ' + cls;
            btn.textContent = text;
            btn.style.width = '84px';
            btn.style.height = '84px';
            btn.style.margin = '6px';
            btn.style.borderRadius = '12px';
            btn.style.border = '2px solid rgba(255,255,255,0.2)';
            btn.style.background = 'rgba(0,0,0,0.35)';
            btn.style.color = '#ffffff';
            btn.style.fontSize = '28px';
            btn.style.backdropFilter = 'blur(4px)';
            btn.style.outline = 'none';
            btn.style.touchAction = 'none';
            return btn;
        }

        _bindButton(el, action){
            const dispatch = (down) => {
                const ev = new CustomEvent('touchcontrol', { detail: { action, down } });
                window.dispatchEvent(ev);
            };
            // Touch
            el.addEventListener('touchstart', (e) => { e.preventDefault(); dispatch(true); }, { passive: false });
            el.addEventListener('touchend', (e) => { e.preventDefault(); dispatch(false); }, { passive: false });
            el.addEventListener('touchcancel', (e) => { e.preventDefault(); dispatch(false); }, { passive: false });
            // Mouse fallback
            el.addEventListener('mousedown', (e) => { e.preventDefault(); dispatch(true); }, { passive: false });
            window.addEventListener('mouseup', (e) => { dispatch(false); });
        }

        destroy(){
            if (this.container) this.container.remove();
            this.container = null;
        }
    }

    window.TouchControls = TouchControls;
})();
