/*
 * TouchControls - on-screen touch buttons and sensitivity slider
 * Emits `touchcontrol` CustomEvent with detail { action: 'left'|'right'|'jump'|'attack'|'special'|'pause'|'restart', down: boolean }
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
            // Only show on touch-capable devices - check both touch API and actual touch points
            const hasTouch = ('ontouchstart' in window) && (navigator.maxTouchPoints > 0 || navigator.msMaxTouchPoints > 0);
            if (!hasTouch) return;

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
            const leftBtn = this._createButton('⟸', 'left-btn touch-btn--move', 'Move left');
            const rightBtn = this._createButton('⟹', 'right-btn touch-btn--move', 'Move right');
            const jumpBtn = this._createButton('⤒', 'jump-btn touch-btn--jump', 'Jump');
            const attackBtn = this._createButton('🗡', 'attack-btn touch-btn--attack', 'Attack');
            const specialBtn = this._createButton('💥', 'special-btn touch-btn--special', 'Special');

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
            rightGroup.appendChild(specialBtn);

            // Pause button for quick mobile pause/resume - DISABLED: using overlay pause instead
            // const pauseBtn = this._createButton('⏸', 'pause-btn');
            // pauseBtn.style.width = '64px';
            // pauseBtn.style.height = '64px';
            // pauseBtn.style.fontSize = '22px';
            // pauseBtn.style.marginLeft = '6px';
            // pauseBtn.setAttribute('aria-label', 'Pause');
            // rightGroup.appendChild(pauseBtn);
            // // keep reference for state updates
            // this._pauseBtn = pauseBtn;

            // Restart button (hidden by default, shown on game over)
            const restartBtn = this._createButton('⟲', 'restart-btn touch-btn--restart', 'Restart');
            restartBtn.style.position = 'absolute';
            restartBtn.style.left = '50%';
            restartBtn.style.bottom = '12px';
            restartBtn.style.transform = 'translateX(-50%)';
            restartBtn.style.display = 'none';
            restartBtn.style.width = '160px';
            restartBtn.style.height = '56px';
            restartBtn.style.fontSize = '18px';
            restartBtn.style.borderRadius = '10px';
            restartBtn.style.background = 'linear-gradient(90deg, rgba(255,40,85,0.95), rgba(255,120,60,0.95))';
            restartBtn.style.border = '2px solid rgba(255,200,150,0.25)';
            restartBtn.style.color = '#fff';
            restartBtn.style.fontWeight = '700';
            restartBtn.style.boxShadow = '0 6px 18px rgba(255,40,85,0.35), 0 0 28px rgba(255,120,60,0.12)';
            restartBtn.style.pointerEvents = 'auto';
            restartBtn.style.backdropFilter = 'saturate(140%) blur(6px)';

            container.appendChild(restartBtn);

            // Mobile score panel (top-center)
            const scorePanel = document.createElement('div');
            scorePanel.id = 'mobile-score-panel';
            scorePanel.style.position = 'absolute';
            scorePanel.style.top = '12px';
            scorePanel.style.left = '50%';
            scorePanel.style.transform = 'translateX(-50%)';
            scorePanel.style.pointerEvents = 'none';
            scorePanel.style.padding = '8px 14px';
            scorePanel.style.background = 'linear-gradient(180deg, rgba(10,10,30,0.7), rgba(20,8,40,0.5))';
            scorePanel.style.border = '1px solid rgba(0,255,247,0.12)';
            scorePanel.style.boxShadow = '0 6px 18px rgba(0,255,247,0.06), inset 0 1px 0 rgba(255,255,255,0.03)';
            scorePanel.style.color = '#00fff7';
            scorePanel.style.fontSize = '16px';
            scorePanel.style.borderRadius = '12px';
            scorePanel.style.fontWeight = '700';
            scorePanel.textContent = 'Score: 0';
            container.appendChild(scorePanel);

            // Update score panel when game fires scoreChange events
            window.addEventListener('scoreChange', (e) => {
                try {
                    if (e && e.detail && typeof e.detail.score !== 'undefined') {
                        scorePanel.textContent = 'Score: ' + e.detail.score;
                    }
                } catch (err) { __err('touch', err); }
            });

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

            // Bind buttons (restart has a custom confirm/animation)
            this._bindButton(leftBtn, 'left');
            this._bindButton(rightBtn, 'right');
            this._bindButton(jumpBtn, 'jump');
            this._bindButton(attackBtn, 'attack');
            this._bindButton(specialBtn, 'special');
            if (typeof pauseBtn !== 'undefined' && pauseBtn) this._bindButton(pauseBtn, 'pause');

            // Create restart confirmation overlay (hidden)
            const restartConfirm = document.createElement('div');
            restartConfirm.id = 'restart-confirm';
            restartConfirm.style.position = 'absolute';
            restartConfirm.style.bottom = '80px';
            restartConfirm.style.left = '50%';
            restartConfirm.style.transform = 'translateX(-50%) scale(0.95)';
            restartConfirm.style.padding = '10px 14px';
            restartConfirm.style.display = 'none';
            restartConfirm.style.pointerEvents = 'auto';
            restartConfirm.style.background = 'linear-gradient(180deg, rgba(10,0,30,0.92), rgba(30,8,60,0.72))';
            restartConfirm.style.border = '1px solid rgba(0,255,247,0.12)';
            restartConfirm.style.borderRadius = '10px';
            restartConfirm.style.color = '#fff';
            restartConfirm.style.fontSize = '15px';
            restartConfirm.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6), 0 0 20px rgba(0,255,247,0.06)';

            const confirmText = document.createElement('div');
            confirmText.textContent = 'Restart game?';
            confirmText.style.textAlign = 'center';
            confirmText.style.marginBottom = '8px';
            confirmText.style.color = '#00fff7';
            confirmText.style.fontWeight = '700';

            const btnRow = document.createElement('div');
            btnRow.style.display = 'flex';
            btnRow.style.justifyContent = 'center';
            btnRow.style.gap = '8px';

            const yesBtn = document.createElement('button');
            yesBtn.textContent = 'Yes';
            yesBtn.style.padding = '8px 14px';
            yesBtn.style.borderRadius = '8px';
            yesBtn.style.border = 'none';
            yesBtn.style.background = 'linear-gradient(90deg, rgba(255,40,85,0.98), rgba(255,120,60,0.98))';
            yesBtn.style.color = '#fff';
            yesBtn.style.fontWeight = '700';

            const noBtn = document.createElement('button');
            noBtn.textContent = 'Cancel';
            noBtn.style.padding = '8px 14px';
            noBtn.style.borderRadius = '8px';
            noBtn.style.border = '1px solid rgba(255,255,255,0.06)';
            noBtn.style.background = 'rgba(0,0,0,0.35)';
            noBtn.style.color = '#fff';

            btnRow.appendChild(yesBtn);
            btnRow.appendChild(noBtn);
            restartConfirm.appendChild(confirmText);
            restartConfirm.appendChild(btnRow);
            container.appendChild(restartConfirm);

            // Anim helpers
            const pulse = (el) => {
                try {
                    el.animate([
                        { transform: 'translateX(-50%) scale(1)' },
                        { transform: 'translateX(-50%) scale(1.06)' },
                        { transform: 'translateX(-50%) scale(1)' }
                    ], { duration: 360, easing: 'ease-out' });
                } catch (e) { __err('touch', e); }
            };

            // Restart button: show confirm overlay on touch/click
            const showConfirm = (e) => {
                try { e && e.preventDefault(); } catch (err) { __err('touch', err); }
                restartConfirm.style.display = 'block';
                restartConfirm.style.opacity = '1';
                pulse(restartConfirm);
                pulse(restartBtn);
            };

            const hideConfirm = () => { restartConfirm.style.display = 'none'; };

            // Yes -> dispatch restart touchcontrol (simulate down/up)
            const dispatchRestart = () => {
                try {
                    window.dispatchEvent(new CustomEvent('touchcontrol', { detail: { action: 'restart', down: true } }));
                    setTimeout(() => { window.dispatchEvent(new CustomEvent('touchcontrol', { detail: { action: 'restart', down: false } })); }, 60);
                } catch (err) { __err('touch', err); }
            };

            yesBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); pulse(yesBtn); dispatchRestart(); hideConfirm(); }, { passive: false });
            yesBtn.addEventListener('click', (e)=>{ e.preventDefault(); pulse(yesBtn); dispatchRestart(); hideConfirm(); });
            noBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); hideConfirm(); }, { passive: false });
            noBtn.addEventListener('click', (e)=>{ e.preventDefault(); hideConfirm(); });

            restartBtn.addEventListener('touchstart', (e)=>{ e.preventDefault(); showConfirm(e); }, { passive: false });
            restartBtn.addEventListener('click', (e)=>{ e.preventDefault(); showConfirm(e); });

            // Log creation
            try { window && window.logTouchControlEvent && window.logTouchControlEvent('touchControls_created', { touchControls: true }); } catch (e) { __err('touch', e); }

            // Show/hide restart button on game state changes
            window.addEventListener('gameStateChange', (e) => {
                try { window && window.logTouchControlEvent && window.logTouchControlEvent('gameStateChange', { state: e && e.detail && e.detail.state }); } catch (e) { __err('touch', e); }
                if (!e || !e.detail) return;
                const st = e.detail.state;
                // Update pause button icon/label when paused or resumed
                try {
                    if (this._pauseBtn) {
                        if (st === 'PAUSED') {
                            this._pauseBtn.textContent = '▶';
                            this._pauseBtn.setAttribute('aria-label', 'Resume');
                        } else {
                            this._pauseBtn.textContent = '⏸';
                            this._pauseBtn.setAttribute('aria-label', 'Pause');
                        }
                    }
                } catch (err) { __err('touch', err); }
                if (st === 'GAME_OVER') {
                    // Delay showing restart button until lockout expires
                    restartBtn.style.display = 'none';
                    const lockoutMs = (typeof Config !== 'undefined' && typeof Config.GAME_OVER_LOCKOUT === 'number')
                        ? Config.GAME_OVER_LOCKOUT * 1000 : 3000;
                    setTimeout(() => {
                        try {
                            if (window.game && window.game.state === 'GAME_OVER') {
                                restartBtn.style.display = 'block';
                            }
                        } catch (ex) { __err('touch', ex); }
                    }, lockoutMs);
                } else {
                    restartBtn.style.display = 'none';
                }
            });
        }

        _createButton(text, cls, ariaLabel){
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'touch-btn ' + cls;
            btn.textContent = text;
            btn.style.outline = 'none';
            btn.style.touchAction = 'none';
            if (ariaLabel) btn.setAttribute('aria-label', String(ariaLabel));
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
