/*
 * LevelEditor - simple in-game UI to pick tiles per platform
 * - Displays platform list and tile palette
 * - Allows selecting a platform and assigning a tile (by name)
 * - Persists assignments to localStorage
 */

class LevelEditor {
    constructor(game) {
        this.game = game;
        this.level = game.level;
        this.container = document.getElementById('level-editor-panel');
        this.toggleBtn = document.getElementById('editor-toggle-btn');
        this.platformList = document.getElementById('editor-platform-list');
        this.tilePalette = document.getElementById('editor-tile-palette');
        this.saveBtn = document.getElementById('editor-save-btn');
        this.exportBtn = document.getElementById('editor-export-btn');
        this.importBtn = document.getElementById('editor-import-btn');

        this.storageKey = 'skunkfu_level_tiles_v1';

        this.availableTiles = ['ground_tile', 'platform_tile', 'wall_tile'];

        this.selectedPlatformIndex = null;

        // Show toggle on desktop (hidden by default in index.html)
        this.toggleBtn.style.display = 'block';

        this.toggleBtn.addEventListener('click', () => {
            if (this.container.style.display === 'none') this.show(); else this.hide();
        });

        this.saveBtn.addEventListener('click', () => this.saveAssignments());
        this.exportBtn.addEventListener('click', () => this.exportAssignments());
        this.importBtn.addEventListener('click', () => this.importAssignments());

        // Close editor when game starts playing to avoid accidental changes
        window.addEventListener('gameReady', () => { /* keep available */ });

        this.populatePalette();
        this.refreshPlatformList();
        this.loadAssignments();

        // Keyboard shortcut: E toggles editor
        window.addEventListener('keydown', (e) => {
            if (e.key && e.key.toLowerCase() === 'e') {
                if (this.container.style.display === 'none') this.show(); else this.hide();
            }
        });

        // Pointer-based selection and hover on the game canvas
        try {
            this.canvas = this.game.canvas;
            if (this.canvas && this.canvas.addEventListener) {
                this.canvas.addEventListener('pointerdown', (ev) => this._onPointerDown(ev));
                this.canvas.addEventListener('pointermove', (ev) => this._onPointerMove(ev));
                this.canvas.addEventListener('pointerleave', (ev) => this._onPointerLeave(ev));
            }
        } catch (e) {
            console.warn('LevelEditor canvas integration failed', e);
        }
    }

    _getWorldPosFromEvent(ev) {
        const rect = this.game.canvas.getBoundingClientRect();
        const px = (ev.clientX - rect.left) / rect.width;
        const py = (ev.clientY - rect.top) / rect.height;
        const x = (px * (this.game.viewWidth || this.game.width)) + (this.game.cameraX || 0);
        const y = (py * (this.game.viewHeight || this.game.height)) + (this.game.cameraY || 0);
        return { x, y };
    }

    _onPointerDown(ev) {
        if (this.container.style.display === 'none') return;
        ev.preventDefault();
        const pos = this._getWorldPosFromEvent(ev);
        const platforms = this.level.platforms || [];
        for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            if (pos.x >= p.x && pos.x <= p.x + p.width && pos.y >= p.y && pos.y <= p.y + p.height) {
                this.selectPlatform(i);
                // update overlay
                this._setOverlay({ selectedIndex: i });
                // make sure selected is visible
                const el = document.getElementById(`platform-tile-${i}`);
                if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
                return;
            }
        }
        // Clicked empty space - deselect
        this.selectedPlatformIndex = null;
        this._setOverlay({ selectedIndex: null });
        this.refreshPlatformList();
    }

    _onPointerMove(ev) {
        if (this.container.style.display === 'none') {
            // Clear overlay when editor is hidden
            if (this._hovered !== null) {
                this._hovered = null;
                this._setOverlay({ hoveredIndex: null });
            }
            return;
        }
        const pos = this._getWorldPosFromEvent(ev);
        const platforms = this.level.platforms || [];
        let found = null;
        for (let i = 0; i < platforms.length; i++) {
            const p = platforms[i];
            if (pos.x >= p.x && pos.x <= p.x + p.width && pos.y >= p.y && pos.y <= p.y + p.height) {
                found = i; break;
            }
        }
        if (found !== this._hovered) {
            this._hovered = found;
            this._setOverlay({ hoveredIndex: found });
        }
    }

    _onPointerLeave(ev) {
        this._hovered = null;
        this._setOverlay({ hoveredIndex: null });
    }

    _setOverlay(obj) {
        try {
            if (!this.game) return;
            this.game._editorOverlay = this.game._editorOverlay || {};
            Object.assign(this.game._editorOverlay, obj);
            try { this.game.render(); } catch (e) {}
        } catch (e) {}
    }
    show() {
        this.container.style.display = 'block';
        this.toggleBtn.textContent = '🛠️ Editor (Open)';
    }

    hide() {
        this.container.style.display = 'none';
        this.toggleBtn.textContent = '🛠️ Editor';
        // Clear any editor overlays when hiding
        this._hovered = null;
        this.selectedPlatformIndex = null;
        this._setOverlay({ hoveredIndex: null, selectedIndex: null });
    }

    populatePalette() {
        this.tilePalette.innerHTML = '';
        for (const tileName of this.availableTiles) {
            const el = document.createElement('button');
            el.style.width = '48px';
            el.style.height = '48px';
            el.style.padding = '2px';
            el.style.border = '1px solid rgba(255,255,255,0.06)';
            el.style.background = 'rgba(0,0,0,0.2)';
            el.style.borderRadius = '6px';
            el.title = tileName;

            const img = spriteLoader.getSprite(tileName);
            if (img) {
                const cc = document.createElement('canvas');
                cc.width = 48; cc.height = 48;
                const ctx = cc.getContext('2d');
                // draw the tile scaled to fit
                ctx.imageSmoothingEnabled = false;
                try { ctx.drawImage(img, 0, 0, cc.width, cc.height); } catch (e) { ctx.fillStyle='#333'; ctx.fillRect(0,0,cc.width,cc.height); }
                el.appendChild(cc);
            } else {
                el.textContent = tileName;
            }

            el.addEventListener('click', () => this.assignTileToSelected(tileName));
            this.tilePalette.appendChild(el);
        }
    }

    refreshPlatformList() {
        this.platformList.innerHTML = '';
        const platforms = this.level.platforms || [];
        platforms.forEach((p, idx) => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '6px';
            row.style.borderBottom = '1px solid rgba(255,255,255,0.02)';

            const label = document.createElement('div');
            label.style.fontSize = '12px';
            label.textContent = `#${idx} ${Math.round(p.x)},${Math.round(p.y)} ${p.width}x${p.height}`;

            const right = document.createElement('div');
            right.style.display = 'flex';
            right.style.gap = '6px';

            const tileBadge = document.createElement('div');
            tileBadge.style.fontSize = '11px';
            tileBadge.style.opacity = '0.9';
            tileBadge.textContent = p.tile || '(none)';
            tileBadge.id = `platform-tile-${idx}`;

            const selectBtn = document.createElement('button');
            selectBtn.textContent = 'Select';
            selectBtn.style.padding = '4px 6px';
            selectBtn.style.borderRadius = '6px';
            selectBtn.style.border = 'none';
            selectBtn.addEventListener('click', () => this.selectPlatform(idx));

            right.appendChild(tileBadge);
            right.appendChild(selectBtn);

            row.appendChild(label);
            row.appendChild(right);
            this.platformList.appendChild(row);
        });
    }

    selectPlatform(idx) {
        this.selectedPlatformIndex = idx;
        // highlight selected row
        const rows = this.platformList.children;
        for (let i = 0; i < rows.length; i++) {
            rows[i].style.background = (i === idx) ? 'rgba(255,255,255,0.03)' : 'transparent';
        }
    }

    assignTileToSelected(tileName) {
        if (this.selectedPlatformIndex === null) {
            alert('Select a platform first.');
            return;
        }
        const p = this.level.platforms[this.selectedPlatformIndex];
        if (!p) return;
        p.tile = tileName;
        // update badge
        const badge = document.getElementById(`platform-tile-${this.selectedPlatformIndex}`);
        if (badge) badge.textContent = tileName;
        // trigger a render (game.render may be throttled so call draw directly)
        try { this.game.render(); } catch (e) {}
    }

    saveAssignments() {
        const map = this.level.platforms.map(p => p.tile || null);
        localStorage.setItem(this.storageKey, JSON.stringify(map));
        alert('Saved platform tile assignments locally.');
    }

    loadAssignments() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (!raw) return;
            const map = JSON.parse(raw);
            for (let i = 0; i < (this.level.platforms || []).length; i++) {
                if (map[i]) this.level.platforms[i].tile = map[i];
            }
            this.refreshPlatformList();
        } catch (e) {
            console.warn('Failed to load assignments', e);
        }
    }

    exportAssignments() {
        const map = this.level.platforms.map(p => p.tile || null);
        const text = JSON.stringify(map, null, 2);
        // show prompt to copy
        prompt('Copy platform tile JSON', text);
    }

    importAssignments() {
        const raw = prompt('Paste platform tile JSON (array of tile names or null)');
        if (!raw) return;
        try {
            const map = JSON.parse(raw);
            for (let i = 0; i < (this.level.platforms || []).length; i++) {
                this.level.platforms[i].tile = map[i] || null;
            }
            this.refreshPlatformList();
            this.game.render();
            alert('Imported assignments.');
        } catch (e) {
            alert('Invalid JSON.');
        }
    }
}

// Expose globally for integration
window.LevelEditor = LevelEditor;