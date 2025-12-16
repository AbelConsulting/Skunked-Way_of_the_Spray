/**
 * Game configuration and constants
 */

const Config = {
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
    BACKGROUND_PARALLAX_MOBILE: 0.3,
    // Visual indicators for moving hazards (show path and timing indicators)
    HAZARD_INDICATORS: true,

    // Enable tile-based platform graphics when assets are present
    USE_TILE_GRAPHICS: true
};
