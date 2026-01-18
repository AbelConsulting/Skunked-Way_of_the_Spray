/**
 * Game configuration and constants
 */

const Config = {
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
    PLAYER_MAX_HEALTH: 80,
    PLAYER_ATTACK_DAMAGE: 15,

    // Enemy settings
    ENEMY_SPEED: 150,
    ENEMY_HEALTH: 50,
    ENEMY_ATTACK_DAMAGE: 10,
    ENEMY_POINTS: 100,

    // Enemy AI behavior
    // When true, enemies will avoid walking off ledges in patrol/chase.
    // Default false so enemies can fall off platforms naturally.
    ENEMY_AVOID_LEDGES: false,

    // Items / pickups
    HEALTH_REGEN_ITEM_SIZE: 32,
    HEALTH_REGEN_ITEM_DURATION: 6.0, // seconds
    HEALTH_REGEN_HP_PER_SECOND: 8.0,
    EXTRA_LIFE_ITEM_SIZE: 32,

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
        health: 80,
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
    USE_TILE_GRAPHICS: true
};
