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
};
