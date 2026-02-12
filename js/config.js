/**
 * Game configuration and constants
 */

const Config = {
    // Asset cache busting
    // If your host sets aggressive caching for /assets (e.g. Netlify immutable),
    // bump this string whenever sprite/audio assets change so clients fetch
    // updated files without manual cache clearing.
    ASSET_VERSION: '2026-02-05',

    // Debugging / diagnostics
    // When true, enables verbose console logs and cache-busting helpers.
    DEBUG: false,

    // When true, draws collision hitboxes (useful for gameplay tuning)
    SHOW_HITBOXES: false,

    // Pixel-art rendering helper: when true, sprite draw calls snap destination
    // coordinates/sizes to whole pixels to reduce seam artifacts.
    PIXEL_SNAP: true,

    // Screen settings
    SCREEN_WIDTH: 1280,
    SCREEN_HEIGHT: 720,
    FPS: 60,

    // Game physics
    GRAVITY: 1500, // pixels per second squared
    MAX_FALL_SPEED: 800,

    // Player settings (Ninja Skunk)
    PLAYER_SPEED: 400,
    PLAYER_JUMP_FORCE: 700,
    PLAYER_MAX_HEALTH: 100,
    PLAYER_ATTACK_DAMAGE: 15,

    // Enemy settings
    ENEMY_SPEED: 150,
    ENEMY_HEALTH: 50,
    ENEMY_ATTACK_DAMAGE: 15,
    ENEMY_POINTS: 100,

    // Exploder / Kamikaze (THIRD_BASIC)
    EXPLODER_RUSH_SPEED_MULT: 3.5,   // Speed multiplier during dash phase (after fuse)
    EXPLODER_FUSE_TIME: 1.6,         // Seconds of flashing before dash begins
    EXPLODER_DASH_DURATION: 1.2,     // Max seconds of dash before auto-detonation
    EXPLODER_FUSE_RANGE: 160,        // How close to player before fuse ignites
    EXPLODER_EXPLOSION_RADIUS: 120,  // AoE radius in pixels
    EXPLODER_EXPLOSION_DAMAGE: 25,   // Damage dealt to player by explosion
    EXPLODER_EXPLOSION_ENEMY_DAMAGE: 30, // Damage dealt to nearby enemies
    EXPLODER_DETONATION_RANGE: 50,   // Contact range during dash for immediate detonation

    // Enemy AI behavior
    // When true, enemies will avoid walking off ledges in patrol/chase.
    // Default false so enemies can fall off platforms naturally.
    ENEMY_AVOID_LEDGES: false,

    // Items / pickups
    HEALTH_REGEN_ITEM_SIZE: 32,
    HEALTH_REGEN_ITEM_DURATION: 6.0, // seconds
    HEALTH_REGEN_HP_PER_SECOND: 10.0,
    EXTRA_LIFE_ITEM_SIZE: 32,
    IDOL_ITEM_SIZE: 30,
    IDOL_SCORE: 250,
    IDOL_SET_BONUS: 2000, // Increased from 1000 for better incentive
    // Idol collection bonuses
    IDOL_HEALTH_RESTORE: 30, // Instant health on pickup
    IDOL_INVULNERABLE_DURATION: 2.0, // Seconds of invulnerability
    // Progressive tiers by collected count (per level)
    // 1 idol: +5% speed / +5% damage
    // 2 idols: +10% speed / +10% damage
    // 3 idols (full set): +25% speed / +30% damage
    IDOL_BONUS_TIERS: [
        { count: 1, speed: 0.05, damage: 0.05 },
        { count: 2, speed: 0.10, damage: 0.10 },
        { count: 3, speed: 0.25, damage: 0.30 }
    ],
    SPEED_BOOST_ITEM_SIZE: 32,
    SPEED_BOOST_DURATION: 8.0, // seconds
    SPEED_BOOST_MULTIPLIER: 1.5, // 150% speed
    DAMAGE_BOOST_ITEM_SIZE: 32,
    DAMAGE_BOOST_DURATION: 10.0, // seconds
    DAMAGE_BOOST_MULTIPLIER: 1.75, // 175% damage (1.75x)

    // Item drop rates (0.0 - 1.0, where 1.0 = 100% chance)
    HEALTH_REGEN_DROP_RATE: 0.20, // 20% chance per enemy
    EXTRA_LIFE_DROP_RATE: 0.03,   // 3% chance per enemy
    SPEED_BOOST_DROP_RATE: 0.0,   // Placed in levels, not dropped
    DAMAGE_BOOST_DROP_RATE: 0.0,  // Placed in levels, not dropped

    // Colors
    WHITE: '#FFFFFF',
    BLACK: '#000000',
    RED: '#FF0000',
    GREEN: '#00FF00',
    BLUE: '#0000FF',
    YELLOW: '#FFFF00',
    GRAY: '#808080',
    DARK_GRAY: '#404040',

    // Ninja Skunk Character
    CHARACTER: {
        name: "Ninja Skunk",
        health: 100,
        speed: 400,
        jump_force: 700,
        attack_damage: 15,
        special_ability: "Shadow Strike",
        color: 'rgb(64, 64, 64)' // Dark gray for ninja
    }
    ,
    // Touch controls defaults
    TOUCH_UI: {
        enabled: true,
        sensitivity: 1.0 // multiplier for movement responsiveness (1.0 = default)
    }
    ,
    // Mobile view adjustments: scale the logical view width on mobile to show
    // more horizontal area without changing the CSS canvas size.
    // 1.0 = same as CSS width, >1.0 expands the logical viewport horizontally.
    MOBILE_VIEW_SCALE: 1.2,
    // Mobile scale clamps to avoid excessively large logical viewports
    MOBILE_VIEW_SCALE_MIN: 1.0,
    MOBILE_VIEW_SCALE_MAX: 1.3,

    // Camera startup options: 'center' or 'bottom-left'
    CAMERA_START: 'bottom-left',

    // Background parallax default (0 = static, 1 = move with camera)
    BACKGROUND_PARALLAX: 0.5,
    // Reduced parallax on mobile for performance and readability
    BACKGROUND_PARALLAX_MOBILE: 0.25,
    // Mobile performance tuning
    MOBILE_FPS: 30, // target FPS cap on mobile devices
    MOBILE_DPR_SCALE_REDUCTION: 0.6, // multiply devicePixelRatio by this on mobile to save pixels
    MOBILE_MAX_PARTICLES: 0, // number of spark particles allowed on mobile (0 = disabled)
    MOBILE_MAX_DAMAGE_NUMBERS: 1, // limit on-screen damage numbers on mobile
    // FPS probe used to select a default preset on first run (ms)
    MOBILE_FPS_PROBE_DURATION: 1000,
    // FPS probe thresholds: <LOW -> low, <MID -> mid, else high
    MOBILE_FPS_PROBE_LOW: 22,
    MOBILE_FPS_PROBE_MID: 36,
    // Enable tile-based platform graphics when assets are present
    USE_TILE_GRAPHICS: true,

    // ── Combo System ──────────────────────────────────────────────────
    COMBO: {
        MAX_COMBO: 99,              // Effectively uncapped
        COMBO_WINDOW: 2.0,          // Seconds before combo resets (generous)
        COMBO_WINDOW_BONUS: 0.3,    // Extra seconds per multi-kill in same attack

        // Score multiplier = base + (comboCount * perStack), capped at max
        SCORE_MULTIPLIER_BASE: 1.0,
        SCORE_MULTIPLIER_PER_STACK: 0.25, // +25% per combo level
        SCORE_MULTIPLIER_MAX: 10.0,       // 10x cap

        // Multi-enemy hit bonus: flat bonus * enemiesHit for hitting 2+ in one attack
        MULTI_HIT_BONUS_POINTS: 150,      // Per extra enemy beyond the first
        MULTI_HIT_COMBO_BOOST: 1,         // Extra combo stacks per additional enemy

        // Tier thresholds for visual/audio escalation
        TIERS: [
            { threshold: 3,  label: 'NICE!',       color: '#FFD93D', shake: 3  },
            { threshold: 5,  label: 'GREAT!',      color: '#FF9500', shake: 4  },
            { threshold: 10, label: 'AWESOME!',     color: '#FF4500', shake: 5  },
            { threshold: 15, label: 'INCREDIBLE!',  color: '#FF00FF', shake: 6  },
            { threshold: 20, label: 'UNSTOPPABLE!', color: '#00FFFF', shake: 7  },
            { threshold: 30, label: 'LEGENDARY!',   color: '#FFD700', shake: 8  },
            { threshold: 50, label: 'GOD MODE!',    color: '#FF0000', shake: 10 }
        ],

        // Screen-shake at combo tier milestones
        SHAKE_DURATION: 0.12
    },

    // Game Over screen lockout: seconds before restart/high-score input is allowed.
    // Gives the player time to see stats and the death animation without
    // accidentally skipping the screen.
    GAME_OVER_LOCKOUT: 3.0,
    // How long (seconds) after game over before the high-score prompt appears
    GAME_OVER_HIGHSCORE_DELAY: 5.0
};
