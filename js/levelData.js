/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
/**
 * Level Configurations for Arcade Mode
 * Defines the stage progression: Forest -> City -> Dojo
 */

const LEVEL_CONFIGS = [
    // =========================================================
    // STAGE 1-1: FOREST OUTSKIRTS — THE RUN
    // =========================================================
    {
        name: "Forest Outskirts",
        id: "level_1",
        width: 10000,
        completion: { exitX: 9900 },
        background: 'bg_forest',
        music: ['forest_theme', 'gameplay'],
        spawnPoints: [ 
            { x: 1200, y: 300 }, 
            { x: 2800, y: 300 }, 
            { x: 4500, y: 300 },
            { x: 6200, y: 300 },
            { x: 8000, y: 300 },
            { x: 'right', y: 300 },
            { x: 'left', y: 300 } 
        ],
        platforms: [
            // --- GROUND LAYOUT (Fragmented for dynamic traversal) ---
            { x: 0, y: 680, width: 2200, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 2600, y: 680, width: 2000, height: 40, type: 'static', tile: 'ground_tile' }, // The Gap at 2200-2600
            { x: 5000, y: 650, width: 2500, height: 40, type: 'static', tile: 'ground_tile' }, // Raised ground section
            { x: 8000, y: 680, width: 2000, height: 40, type: 'static', tile: 'ground_tile' },
            
            // --- SECTION 1: THE TALL OAK (Vertical Challenge) ---
            // Stepping stones leading up to a high branch
            { x: 50, y: 150, width: 50, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 50, y: 250, width: 50, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 50, y: 350, width: 50, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 50, y: 450, width: 50, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 400, y: 550, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 700, y: 440, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1000, y: 330, width: 160, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1300, y: 240, width: 400, height: 24, type: 'static', tile: 'platform2_tile' }, // High branch for Idol 1
            { x: 1800, y: 350, width: 200, height: 24, type: 'static', tile: 'platform3_tile' }, // Path back down
            
            // --- SECTION 2: THE HOLLOW LOGS (Precision platforming over the first gap) ---
            { x: 2100, y: 500, width: 120, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2350, y: 400, width: 120, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2600, y: 500, width: 120, height: 24, type: 'static', tile: 'platform_tile' },
            
            // --- SECTION 3: CANOPY RUN (Long chain of platforms) ---
            { x: 3200, y: 550, width: 300, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3600, y: 450, width: 250, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4000, y: 350, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4400, y: 450, width: 250, height: 24, type: 'static', tile: 'platform_tile' }, // Near Idol 2
            
            // --- SECTION 4: THE GREAT RAVINE (Deep traversal) ---
            // Platforms inside a dip in the ground height
            { x: 5200, y: 520, width: 400, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 5800, y: 420, width: 300, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 6300, y: 320, width: 200, height: 24, type: 'static', tile: 'platform4_tile' }, // Peak of Section 4
             { x: 6300, y: 220, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 6700, y: 450, width: 500, height: 24, type: 'static', tile: 'platform5_tile' },
            
            // --- SECTION 5: APPROACHING THE CHIEFTAIN (Zig-Zag) ---
            { x: 7600, y: 550, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8000, y: 450, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8400, y: 350, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 450, width: 600, height: 24, type: 'static', tile: 'platform_tile' } // Final high ledge before boss
        ],
        idols: [
            { x: 50, y: 110 },  // High Ground: Only reachable by the "Tall Oak" vertical path (top-left platform)
            { x: 4500, y: 410 },  // Risky Mid-Air: Requires careful jumping during the Canopy Run
            { x: 6400, y: 180 }   // Peak Traversal: At the very top of the Ravine section
        ],
        speedBoosts: [
            { x: 1000, y: 290 },
            { x: 7000, y: 410 }
        ],
        damageBoosts: [
            { x: 5500, y: 480 }
        ],
        skunkPowerups: [
            { x: 2350, y: 360 }, // On the floating platform over the first gap
            { x: 8500, y: 310 }
        ],
        enemyConfig: {
            spawnInterval: 3.0,
            maxEnemies: 5,
            aggression: 0.5,
            allowedTypes: ['BASIC', 'SECOND_BASIC']
        }
    },

    // =========================================================
    // STAGE 1-2: FOREST SHOWDOWN
    // =========================================================
    {
        name: "Forest Showdown",
        id: "level_1_boss",
        width: 4000,
        completion: { bossTriggerX: 3200, exitX: 3900 },
        boss: {
            type: "BOSS7",
            spawnX: 3480,
            spawnY: 520,
            healthMultiplier: 6.5,
            speedMultiplier: 1.0,
            attackDamageMultiplier: 1.4
        },
        background: 'bg_forest',
        music: ['forest_theme', 'gameplay'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 680, width: 4000, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 300, y: 540, width: 260, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 750, y: 440, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1200, y: 340, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 1750, y: 460, width: 280, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2300, y: 360, width: 240, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 2850, y: 490, width: 260, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3350, y: 390, width: 280, height: 24, type: 'static', tile: 'platform2_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 900, y: 400 }],
        damageBoosts: [{ x: 2600, y: 460 }],
        skunkPowerups: [{ x: 1600, y: 420 }],
        enemyConfig: {
            spawnInterval: 3.5,
            maxEnemies: 3,
            aggression: 0.6,
            allowedTypes: ['BASIC', 'SECOND_BASIC']
        }
    },

    // =========================================================
    // STAGE 2-1: SKUNK CITY — THE RUN
    // =========================================================
    {
        name: "Skunk City",
        id: "level_2",
        width: 12000,
        completion: { exitX: 11900 },
        background: 'bg_city',
        music: ['city_theme', 'action_theme', 'gameplay'],
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 1000, y: 300 },
            { x: 2000, y: 300 },
            { x: 3000, y: 100 },
            { x: 4000, y: 300 },
            { x: 5000, y: 100 },
            { x: 6500, y: 300 },
            { x: 7800, y: 120 },
            { x: 9000, y: 300 },
            { x: 10400, y: 120 }
        ],
        platforms: [
            // Ground
            { x: 0, y: 660, width: 2600, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 2850, y: 650, width: 3200, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 6350, y: 670, width: 2600, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 9200, y: 660, width: 2800, height: 40, type: 'static', tile: 'ground3_tile' },
            
            // Urban District 1
            { x: 300, y: 500, width: 150, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 500, y: 400, width: 150, height: 24, type: 'static', tile: 'platform2_tile' },
            // Elevator
            { x: 800, y: 400, width: 120, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform4_tile' },
            
            { x: 1100, y: 500, width: 400, height: 24, type: 'static', tile: 'platform2_tile' },
            
            // Rooftops
            { x: 1800, y: 400, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 2200, y: 300, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 2600, y: 400, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },

            // Highway Bridge
            { x: 3200, y: 500, width: 800, height: 24, type: 'static', tile: 'platform4_tile' },
            
            // Construction Zone
            { x: 4200, y: 600, width: 150, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 4500, y: 500, width: 150, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2, tile: 'platform2_tile' },
            { x: 4900, y: 400, width: 150, height: 24, type: 'static', tile: 'platform2_tile' },
            
            // Final Stretch
            { x: 5300, y: 500, width: 500, height: 24, type: 'static', tile: 'platform4_tile' },

            // District 2: Alley rooftops
            { x: 6200, y: 520, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 6550, y: 420, width: 240, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 6950, y: 320, width: 260, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 7350, y: 420, width: 240, height: 24, type: 'static', tile: 'platform4_tile' },

            // District 3: Billboard run
            { x: 7900, y: 520, width: 200, height: 24, type: 'moving', axis: 'y', range: 140, speed: 2.1, tile: 'platform5_tile' },
            { x: 8300, y: 430, width: 300, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 8800, y: 350, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },

            // Approach to boss arena
            { x: 9500, y: 500, width: 900, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 10700, y: 560, width: 240, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 11100, y: 460, width: 280, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [
            { x: 560, y: 370 },
            { x: 3500, y: 470 },
            { x: 8300, y: 400 }
        ],
        speedBoosts: [
            { x: 2200, y: 440 },   // Early city speed boost
            { x: 6950, y: 290 }    // Rooftop speed boost
        ],
        damageBoosts: [
            { x: 4800, y: 470 },   // Mid-city damage boost
            { x: 9700, y: 470 }    // Late damage boost before boss
        ],
        skunkPowerups: [
            { x: 1800, y: 410 },   // Early city skunk ammo
            { x: 7200, y: 260 }    // Rooftop skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 2.0,
            maxEnemies: 10,
            aggression: 0.7,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 2-2: CITY SHOWDOWN
    // =========================================================
    {
        name: "City Showdown",
        id: "level_2_boss",
        width: 4000,
        completion: { bossTriggerX: 3200, exitX: 3900 },
        boss: {
            type: "BOSS2",
            spawnX: 3480,
            spawnY: 520,
            healthMultiplier: 8.5,
            speedMultiplier: 1.1,
            attackDamageMultiplier: 1.6
        },
        background: 'bg_city',
        music: ['city_theme', 'action_theme', 'gameplay'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 660, width: 4000, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 250, y: 520, width: 280, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 700, y: 420, width: 220, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 1150, y: 330, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1650, y: 470, width: 300, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 1950, y: 380, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform4_tile' },
            { x: 2200, y: 380, width: 240, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 2700, y: 510, width: 280, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 3200, y: 400, width: 260, height: 24, type: 'static', tile: 'platform4_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 800, y: 380 }],
        damageBoosts: [{ x: 2500, y: 340 }],
        skunkPowerups: [{ x: 1700, y: 430 }],
        enemyConfig: {
            spawnInterval: 2.5,
            maxEnemies: 4,
            aggression: 0.8,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 3-1: MOUNTAIN DOJO — THE RUN
    // =========================================================
    {
        name: "Mountain Dojo",
        id: "level_3",
        width: 15000,
        completion: { exitX: 14900 },
        background: 'bg_dojo',
        music: ['gameplay', 'action_theme'],
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 'left', y: 300 },
            { x: 1500, y: 300 },
            { x: 3000, y: 300 },
            { x: 4500, y: 300 },
            { x: 6000, y: 300 },
            { x: 7800, y: 300 },
            { x: 9300, y: 300 },
            { x: 11000, y: 300 },
            { x: 12600, y: 300 },
            { x: 14000, y: 300 }
        ],
        platforms: [
            { x: 0, y: 650, width: 3400, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 3700, y: 640, width: 3500, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 7550, y: 660, width: 3500, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 11400, y: 650, width: 3600, height: 40, type: 'static', tile: 'ground2_tile' },
            
            // Courtyard
            { x: 400, y: 550, width: 100, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 600, y: 450, width: 150, height: 24, type: 'moving', axis: 'x', range: 80, speed: 1.9, tile: 'platform4_tile' },
            
            // Training Hall
            { x: 1200, y: 400, width: 800, height: 24, type: 'static', tile: 'platform3_tile' }, 
            
            // Moving Pillars
            { x: 2200, y: 550, width: 100, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.4, tile: 'platform4_tile' },
            { x: 2500, y: 550, width: 100, height: 24, type: 'moving', axis: 'y', range: 150, speed: 3.0, timeOffset: 1.5, tile: 'platform4_tile' },
            
            { x: 2900, y: 400, width: 200, height: 24, type: 'static', tile: 'platform3_tile' },
            
            // The Gauntlet
            { x: 3500, y: 500, width: 100, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 3800, y: 400, width: 100, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 4100, y: 300, width: 100, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 4400, y: 400, width: 100, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 4700, y: 500, width: 100, height: 24, type: 'static', tile: 'platform6_tile' },

            // Upper Walkway
            { x: 5300, y: 350, width: 1000, height: 24, type: 'static', tile: 'platform3_tile' },
            
            // Final Steps
            { x: 6600, y: 450, width: 150, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 6900, y: 550, width: 150, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 7200, y: 450, width: 200, height: 24, type: 'static', tile: 'platform3_tile' },

            // Inner temple: staggered ascent
            { x: 8000, y: 560, width: 160, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 8350, y: 460, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 8750, y: 360, width: 220, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 9150, y: 460, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },

            // Hanging lanterns (moving)
            { x: 9800, y: 520, width: 120, height: 24, type: 'moving', axis: 'y', range: 160, speed: 2.8, tile: 'platform6_tile' },
            { x: 10150, y: 420, width: 120, height: 24, type: 'moving', axis: 'y', range: 160, speed: 3.1, timeOffset: 1.2, tile: 'platform6_tile' },
            { x: 10500, y: 320, width: 160, height: 24, type: 'static', tile: 'platform3_tile' },

            // Upper ridge
            { x: 11200, y: 360, width: 1000, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 12550, y: 460, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 12950, y: 560, width: 240, height: 24, type: 'static', tile: 'platform4_tile' },

            // Approach to boss arena
            { x: 13500, y: 500, width: 700, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 14400, y: 450, width: 260, height: 24, type: 'static', tile: 'platform6_tile' }
        ],
        idols: [
            { x: 1500, y: 370 },
            { x: 5600, y: 320 },
            { x: 11250, y: 330 }
        ],
        speedBoosts: [
            { x: 8750, y: 330 }     // Inner temple
        ],
        damageBoosts: [
            { x: 12000, y: 330 },   // Upper ridge
            { x: 14400, y: 420 }    // Just before boss
        ],
        skunkPowerups: [
            { x: 8400, y: 330 }    // Mountain path skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.4,
            maxEnemies: 11,
            aggression: 1.15,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 3-2: DOJO SHOWDOWN
    // =========================================================
    {
        name: "Dojo Showdown",
        id: "level_3_boss",
        width: 4500,
        completion: { bossTriggerX: 3700, exitX: 4400 },
        boss: {
            type: "BOSS3",
            spawnX: 3980,
            spawnY: 520,
            healthMultiplier: 10.5,
            speedMultiplier: 1.15,
            attackDamageMultiplier: 2.0
        },
        background: 'bg_dojo',
        music: ['gameplay', 'action_theme'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 650, width: 4500, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 300, y: 530, width: 240, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 750, y: 430, width: 200, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 1100, y: 480, width: 100, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.5, tile: 'platform4_tile' },
            { x: 1350, y: 330, width: 300, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 2000, y: 490, width: 280, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 2600, y: 380, width: 260, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 3150, y: 510, width: 300, height: 24, type: 'static', tile: 'platform3_tile' },
            { x: 3750, y: 410, width: 240, height: 24, type: 'static', tile: 'platform4_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 1500, y: 290 }],
        damageBoosts: [{ x: 2700, y: 340 }],
        skunkPowerups: [{ x: 2000, y: 450 }],
        enemyConfig: {
            spawnInterval: 2.0,
            maxEnemies: 5,
            aggression: 1.0,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC', 'THIRD_BASIC']
        }
    },

    // =========================================================
    // STAGE 4-1: CRYSTAL CAVERNS — THE RUN
    // =========================================================
    {
        name: "Crystal Caverns",
        id: "level_4",
        width: 16000,
        completion: { exitX: 15900 },
        background: 'bg_caves_crystal',
        music: ['cave_ambient', 'ambient_cave_loop', 'action_theme'],
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 'left', y: 300 },
            { x: 1600, y: 300 },
            { x: 3200, y: 300 },
            { x: 4800, y: 300 },
            { x: 6400, y: 300 },
            { x: 8000, y: 300 },
            { x: 9600, y: 300 },
            { x: 11200, y: 300 },
            { x: 12800, y: 300 },
            { x: 14400, y: 300 }
        ],
        platforms: [
            { x: 0, y: 640, width: 3200, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 3550, y: 630, width: 3400, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 7350, y: 650, width: 3600, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 11350, y: 640, width: 4650, height: 40, type: 'static', tile: 'ground3_tile' },
            
            // Cavern Entrance
            { x: 300, y: 550, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 600, y: 450, width: 160, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 900, y: 350, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            
            // Stalactite Descent
            { x: 1300, y: 450, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 1.8, tile: 'platform6_tile' },
            { x: 1650, y: 550, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.2, timeOffset: 1.0, tile: 'platform6_tile' },
            { x: 2000, y: 450, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },
            
            // Underground River
            { x: 2500, y: 520, width: 800, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 3500, y: 400, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 3850, y: 300, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },
            
            // Crystal Chamber
            { x: 4300, y: 450, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, tile: 'platform6_tile' },
            { x: 4700, y: 550, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, timeOffset: 1.5, tile: 'platform6_tile' },
            { x: 5100, y: 450, width: 240, height: 24, type: 'static', tile: 'platform5_tile' },
            
            // Deep Chasm
            { x: 5600, y: 380, width: 140, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 5900, y: 280, width: 140, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 6200, y: 380, width: 140, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 6500, y: 480, width: 140, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 6800, y: 580, width: 140, height: 24, type: 'static', tile: 'platform5_tile' },
            
            // Glowing Mushroom Grove
            { x: 7300, y: 500, width: 900, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 8400, y: 400, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 8800, y: 500, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },
            
            // Floating Crystals
            { x: 9300, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform6_tile' },
            { x: 9650, y: 350, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.4, timeOffset: 1.2, tile: 'platform6_tile' },
            { x: 10000, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, timeOffset: 2.4, tile: 'platform6_tile' },
            
            // Upper Ledges
            { x: 10500, y: 360, width: 1200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 12000, y: 460, width: 240, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 12450, y: 560, width: 280, height: 24, type: 'static', tile: 'platform5_tile' },
            
            // Precarious Path
            { x: 13000, y: 480, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, tile: 'platform6_tile' },
            { x: 13400, y: 380, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, timeOffset: 1.5, tile: 'platform6_tile' },
            
            // Approach to Boss Arena
            { x: 14000, y: 500, width: 800, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 15000, y: 450, width: 300, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [
            { x: 980, y: 320 },
            { x: 2700, y: 490 },
            { x: 10600, y: 330 }
        ],
        speedBoosts: [
            { x: 2200, y: 420 },    // Underground river
            { x: 8600, y: 370 }     // Mushroom grove
        ],
        damageBoosts: [
            { x: 5300, y: 420 },    // Crystal chamber
            { x: 13200, y: 450 }    // Before boss
        ],
        skunkPowerups: [
            { x: 2400, y: 480 },   // Cave entrance skunk ammo
            { x: 6800, y: 390 }    // Underground skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.5,
            maxEnemies: 10,
            aggression: 1.2,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 4-2: CRYSTAL SHOWDOWN
    // =========================================================
    {
        name: "Crystal Showdown",
        id: "level_4_boss",
        width: 4500,
        completion: { bossTriggerX: 3700, exitX: 4400 },
        boss: {
            type: "BOSS6",
            spawnX: 3980,
            spawnY: 520,
            healthMultiplier: 11.5,
            speedMultiplier: 1.1,
            attackDamageMultiplier: 1.8
        },
        background: 'bg_caves_crystal',
        music: ['cave_ambient', 'ambient_cave_loop', 'action_theme'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 640, width: 4500, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 300, y: 550, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 800, y: 430, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 1300, y: 340, width: 160, height: 24, type: 'moving', axis: 'y', range: 120, speed: 1.8, tile: 'platform6_tile' },
            { x: 1850, y: 490, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 2400, y: 370, width: 180, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, tile: 'platform6_tile' },
            { x: 2950, y: 510, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 3450, y: 400, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 3900, y: 490, width: 240, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 1000, y: 390 }],
        damageBoosts: [{ x: 2700, y: 330 }],
        skunkPowerups: [{ x: 1900, y: 450 }],
        enemyConfig: {
            spawnInterval: 1.8,
            maxEnemies: 5,
            aggression: 1.1,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 5-1: CRYSTAL CAVERNS DEPTHS — THE RUN
    // =========================================================
    {
        name: "Crystal Caverns Depths",
        id: "level_5",
        width: 16000,
        completion: { exitX: 15900 },
        background: 'bg_cave_depths',
        music: ['cave_ambient', 'ambient_cave_loop', 'action_theme'],
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 'left', y: 300 },
            { x: 1600, y: 300 },
            { x: 3200, y: 300 },
            { x: 4800, y: 300 },
            { x: 6400, y: 300 },
            { x: 8000, y: 300 },
            { x: 9600, y: 300 },
            { x: 11200, y: 300 },
            { x: 12800, y: 300 },
            { x: 14400, y: 300 }
        ],
        platforms: [
            { x: 0, y: 630, width: 3000, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 3400, y: 620, width: 3200, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 7000, y: 640, width: 3300, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 10750, y: 630, width: 5250, height: 40, type: 'static', tile: 'ground3_tile' },

            // Depths Entrance: Tight ledges with drop-offs
            { x: 200, y: 530, width: 140, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 480, y: 430, width: 120, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 750, y: 530, width: 160, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 1050, y: 400, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },

            // Sinking Columns: vertical oscillators at different phases
            { x: 1500, y: 500, width: 110, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.0, tile: 'platform6_tile' },
            { x: 1800, y: 420, width: 110, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.4, timeOffset: 0.8, tile: 'platform6_tile' },
            { x: 2100, y: 340, width: 110, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.0, timeOffset: 1.6, tile: 'platform6_tile' },
            { x: 2400, y: 460, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },

            // Chasm Bridge: long narrow crossing
            { x: 2900, y: 500, width: 600, height: 24, type: 'static', tile: 'platform4_tile' },

            // Fungal Shelves: wide stagger pattern
            { x: 3600, y: 540, width: 250, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 4000, y: 440, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 4350, y: 340, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 4700, y: 440, width: 250, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 5100, y: 540, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },

            // Echo Chamber: horizontal movers over a pit
            { x: 5500, y: 460, width: 130, height: 24, type: 'moving', axis: 'x', range: 150, speed: 1.6, tile: 'platform6_tile' },
            { x: 5950, y: 380, width: 130, height: 24, type: 'moving', axis: 'x', range: 150, speed: 1.6, timeOffset: 1.2, tile: 'platform6_tile' },
            { x: 6400, y: 460, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },

            // Waterfall Cliff: ascending staircase
            { x: 7200, y: 560, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 7500, y: 480, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 7800, y: 400, width: 160, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 8100, y: 320, width: 220, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 8500, y: 400, width: 160, height: 24, type: 'static', tile: 'platform5_tile' },

            // Crystal Maze: zigzag with mixed movers
            { x: 9000, y: 500, width: 140, height: 24, type: 'moving', axis: 'y', range: 130, speed: 2.2, tile: 'platform6_tile' },
            { x: 9400, y: 380, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 9800, y: 500, width: 140, height: 24, type: 'moving', axis: 'y', range: 130, speed: 2.2, timeOffset: 1.5, tile: 'platform6_tile' },

            // High Ledge Run
            { x: 10400, y: 350, width: 900, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 11600, y: 450, width: 280, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 12100, y: 350, width: 240, height: 24, type: 'static', tile: 'platform6_tile' },

            // Collapsing Path to Boss
            { x: 12700, y: 480, width: 120, height: 24, type: 'moving', axis: 'x', range: 130, speed: 2.0, tile: 'platform6_tile' },
            { x: 13200, y: 400, width: 120, height: 24, type: 'moving', axis: 'x', range: 130, speed: 2.0, timeOffset: 1.0, tile: 'platform6_tile' },

            // Boss Arena Approach
            { x: 13800, y: 500, width: 700, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 14800, y: 430, width: 350, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [
            { x: 1700, y: 520 },
            { x: 5700, y: 350 },
            { x: 12150, y: 430 }
        ],
        speedBoosts: [
            { x: 900, y: 320 },     // Entrance
            { x: 7800, y: 470 },    // Deep section
            { x: 12600, y: 530 }    // Late game
        ],
        damageBoosts: [
            { x: 3650, y: 370 },    // Mid section
            { x: 10700, y: 330 },   // Upper ledges
            { x: 14500, y: 470 }    // Pre-boss
        ],
        skunkPowerups: [
            { x: 2200, y: 490 },   // Bamboo grove skunk ammo
            { x: 7100, y: 440 }    // Zen garden skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.2,
            maxEnemies: 12,
            aggression: 1.4,
            allowedTypes: ['FAST_BASIC', 'SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 5-2: DEPTHS SHOWDOWN
    // =========================================================
    {
        name: "Depths Showdown",
        id: "level_5_boss",
        width: 4500,
        completion: { bossTriggerX: 3700, exitX: 4400 },
        boss: {
            type: "BOSS5",
            spawnX: 3980,
            spawnY: 520,
            healthMultiplier: 12.5,
            speedMultiplier: 1.15,
            attackDamageMultiplier: 1.9
        },
        background: 'bg_cave_depths',
        music: ['cave_ambient', 'ambient_cave_loop', 'action_theme'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 630, width: 4500, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 250, y: 540, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 700, y: 440, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 1200, y: 340, width: 160, height: 24, type: 'moving', axis: 'y', range: 140, speed: 2.0, tile: 'platform6_tile' },
            { x: 1750, y: 480, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 2300, y: 380, width: 160, height: 24, type: 'moving', axis: 'y', range: 140, speed: 2.0, timeOffset: 1.2, tile: 'platform6_tile' },
            { x: 2850, y: 520, width: 240, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 3400, y: 430, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 3900, y: 500, width: 240, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 950, y: 400 }],
        damageBoosts: [{ x: 2700, y: 340 }],
        skunkPowerups: [{ x: 1900, y: 440 }],
        enemyConfig: {
            spawnInterval: 1.6,
            maxEnemies: 6,
            aggression: 1.2,
            allowedTypes: ['FAST_BASIC', 'SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 6-1: NEON CROSSROADS — THE RUN
    // =========================================================
    {
        name: "Neon Crossroads",
        id: "level_6",
        width: 12000,
        completion: { exitX: 11900 },
        background: 'bg_neon',
        music: ['city_theme', 'action_theme', 'gameplay'],
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 1000, y: 300 },
            { x: 2000, y: 300 },
            { x: 3000, y: 100 },
            { x: 4000, y: 300 },
            { x: 5000, y: 100 },
            { x: 6500, y: 300 },
            { x: 7800, y: 120 },
            { x: 9000, y: 300 },
            { x: 10400, y: 120 }
        ],
        platforms: [
            { x: 0, y: 620, width: 2400, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 2750, y: 610, width: 2700, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 5800, y: 630, width: 2700, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 8850, y: 620, width: 3150, height: 40, type: 'static', tile: 'ground3_tile' },
            // Neon Crossroads: rooftop parkour with neon signs
            // Street-level awnings
            { x: 200, y: 540, width: 300, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 650, y: 460, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1000, y: 380, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },

            // Neon Sign Hop: small platforms at varied heights
            { x: 1400, y: 480, width: 100, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1650, y: 380, width: 100, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 1900, y: 300, width: 120, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 2200, y: 400, width: 280, height: 24, type: 'static', tile: 'platform2_tile' },

            // Crossroads Plaza: wide platform hub
            { x: 2700, y: 500, width: 600, height: 24, type: 'static', tile: 'platform2_tile' },

            // Billboard Elevators: vertical movers
            { x: 3500, y: 450, width: 120, height: 24, type: 'moving', axis: 'y', range: 200, speed: 1.8, tile: 'platform5_tile' },
            { x: 3800, y: 350, width: 120, height: 24, type: 'moving', axis: 'y', range: 200, speed: 1.8, timeOffset: 1.5, tile: 'platform5_tile' },
            { x: 4100, y: 480, width: 250, height: 24, type: 'static', tile: 'platform4_tile' },

            // Fire Escape: ascending zigzag
            { x: 4550, y: 530, width: 140, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 4850, y: 430, width: 140, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 5150, y: 330, width: 160, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 5500, y: 430, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },

            // Rooftop Highway: long run with gaps
            { x: 6000, y: 490, width: 500, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 6700, y: 420, width: 350, height: 24, type: 'static', tile: 'platform4_tile' },

            // Floating Neon Bars: horizontal movers
            { x: 7200, y: 500, width: 110, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, tile: 'platform5_tile' },
            { x: 7600, y: 400, width: 110, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, timeOffset: 1.0, tile: 'platform5_tile' },

            // Antenna Perch
            { x: 8000, y: 350, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 8400, y: 460, width: 300, height: 24, type: 'static', tile: 'platform4_tile' },

            // Final Alley
            { x: 9000, y: 380, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 9400, y: 500, width: 700, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 10400, y: 420, width: 320, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 10900, y: 530, width: 250, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 11200, y: 430, width: 280, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [
            { x: 1200, y: 470 },
            { x: 6400, y: 490 },
            { x: 9800, y: 470 }
        ],
        speedBoosts: [
            { x: 2300, y: 370 },    // Early neon district
            { x: 7100, y: 390 }     // Rooftop section
        ],
        damageBoosts: [
            { x: 3500, y: 470 },    // Mid crossroads
            { x: 10900, y: 430 }    // Before boss
        ],
        skunkPowerups: [
            { x: 2600, y: 450 },   // Early metro skunk ammo
            { x: 7400, y: 380 }    // Neon chase skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.6,
            maxEnemies: 9,
            aggression: 1.15,
            allowedTypes: ['SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 6-2: NEON SHOWDOWN
    // =========================================================
    {
        name: "Neon Showdown",
        id: "level_6_boss",
        width: 4000,
        completion: { bossTriggerX: 3200, exitX: 3900 },
        boss: {
            type: "BOSS4",
            spawnX: 3480,
            spawnY: 520,
            healthMultiplier: 13.5,
            speedMultiplier: 1.15,
            attackDamageMultiplier: 2.0
        },
        background: 'bg_neon',
        music: ['city_theme', 'action_theme', 'gameplay'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 620, width: 4000, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 250, y: 530, width: 220, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 700, y: 430, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1150, y: 330, width: 160, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 1600, y: 400, width: 110, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, tile: 'platform5_tile' },
            { x: 1700, y: 470, width: 260, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 2250, y: 370, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 2800, y: 490, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 3200, y: 380, width: 200, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 850, y: 390 }],
        damageBoosts: [{ x: 2500, y: 330 }],
        skunkPowerups: [{ x: 1800, y: 430 }],
        enemyConfig: {
            spawnInterval: 1.8,
            maxEnemies: 6,
            aggression: 1.2,
            allowedTypes: ['SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 7-1: CRYSTAL RIDGE — THE RUN
    // =========================================================
    {
        name: "Crystal Ridge",
        id: "level_7",
        width: 16000,
        completion: { exitX: 15900 },
        background: 'bg_mountains',
        music: ['cave_ambient', 'ambient_cave_loop', 'action_theme'],
        spawnPoints: [
            { x: 'right', y: 300 },
            { x: 'left', y: 300 },
            { x: 1600, y: 300 },
            { x: 3200, y: 300 },
            { x: 4800, y: 300 },
            { x: 6400, y: 300 },
            { x: 8000, y: 300 },
            { x: 9600, y: 300 },
            { x: 11200, y: 300 },
            { x: 12800, y: 300 },
            { x: 14400, y: 300 }
        ],
        platforms: [
            { x: 0, y: 610, width: 2800, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 3200, y: 600, width: 3100, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 6750, y: 620, width: 3200, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 10400, y: 610, width: 5600, height: 40, type: 'static', tile: 'ground3_tile' },
            // Crystal Ridge: ascending ridge climb with crystal outcrops
            // Foothills: wide ledges to warm up
            { x: 250, y: 530, width: 260, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 700, y: 440, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1100, y: 520, width: 300, height: 24, type: 'static', tile: 'platform5_tile' },

            // First Ridge: stairstep ascent
            { x: 1600, y: 480, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1900, y: 400, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 2200, y: 320, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 2550, y: 400, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },

            // Crystal Outcrop: wide safe zone
            { x: 2950, y: 480, width: 500, height: 24, type: 'static', tile: 'platform5_tile' },

            // Swinging Crystals: pendulum-style movers
            { x: 3700, y: 400, width: 130, height: 24, type: 'moving', axis: 'x', range: 180, speed: 1.6, tile: 'platform6_tile' },
            { x: 4200, y: 340, width: 130, height: 24, type: 'moving', axis: 'x', range: 180, speed: 1.6, timeOffset: 1.3, tile: 'platform6_tile' },
            { x: 4700, y: 450, width: 300, height: 24, type: 'static', tile: 'platform5_tile' },

            // Ridge Spine: thin high walkway
            { x: 5200, y: 360, width: 700, height: 24, type: 'static', tile: 'platform4_tile' },

            // Gem Grotto: descending then ascending
            { x: 6100, y: 450, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 6450, y: 530, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 6800, y: 450, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 7100, y: 370, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },

            // Crystal Elevator Shafts: fast vertical movers
            { x: 7600, y: 500, width: 120, height: 24, type: 'moving', axis: 'y', range: 200, speed: 2.5, tile: 'platform6_tile' },
            { x: 7950, y: 380, width: 120, height: 24, type: 'moving', axis: 'y', range: 200, speed: 2.5, timeOffset: 1.0, tile: 'platform6_tile' },
            { x: 8300, y: 460, width: 250, height: 24, type: 'static', tile: 'platform5_tile' },

            // Summit Approach
            { x: 8800, y: 380, width: 400, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 9500, y: 460, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 9900, y: 360, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },

            // Peak Traverse: long run to boss
            { x: 10500, y: 430, width: 800, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 11600, y: 350, width: 300, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 12100, y: 460, width: 250, height: 24, type: 'static', tile: 'platform5_tile' },

            // Ridge Crest: final platforms before boss
            { x: 12700, y: 380, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.0, tile: 'platform6_tile' },
            { x: 13100, y: 300, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.0, timeOffset: 1.2, tile: 'platform6_tile' },
            { x: 13600, y: 420, width: 600, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 14500, y: 350, width: 400, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 15100, y: 450, width: 300, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [
            { x: 3100, y: 450 },
            { x: 7200, y: 340 },
            { x: 13800, y: 390 }
        ],
        speedBoosts: [
            { x: 2100, y: 420 },    // Early ridge
            { x: 5900, y: 250 },    // High chasm
            { x: 10800, y: 330 }    // Upper ledges
        ],
        damageBoosts: [
            { x: 4500, y: 520 },    // Crystal area
            { x: 8600, y: 470 },    // Mushroom section
            { x: 15100, y: 420 }    // Just before boss
        ],
        skunkPowerups: [
            { x: 2800, y: 470 },   // Temple gate skunk ammo
            { x: 7800, y: 380 }    // Mountain shrine skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.4,
            maxEnemies: 11,
            aggression: 1.25,
            allowedTypes: ['SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 7-2: RIDGE SHOWDOWN
    // =========================================================
    {
        name: "Ridge Showdown",
        id: "level_7_boss",
        width: 5000,
        completion: { bossTriggerX: 4200, exitX: 4900 },
        boss: {
            type: "BOSS",
            spawnX: 4480,
            spawnY: 520,
            healthMultiplier: 14.5,
            speedMultiplier: 1.15,
            attackDamageMultiplier: 2.1
        },
        background: 'bg_mountains',
        music: ['cave_ambient', 'ambient_cave_loop', 'action_theme'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 610, width: 5000, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 300, y: 530, width: 260, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 850, y: 430, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1400, y: 330, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 1800, y: 360, width: 130, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.2, tile: 'platform6_tile' },
            { x: 2000, y: 470, width: 280, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 2600, y: 370, width: 240, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 3200, y: 510, width: 260, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 3800, y: 400, width: 240, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 4300, y: 490, width: 280, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 1050, y: 390 }],
        damageBoosts: [{ x: 2800, y: 330 }],
        skunkPowerups: [{ x: 2100, y: 430 }],
        enemyConfig: {
            spawnInterval: 1.6,
            maxEnemies: 7,
            aggression: 1.3,
            allowedTypes: ['SECOND_BASIC', 'THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 8-1: ABYSSAL CAVERNS — THE RUN
    // =========================================================
    {
        name: "Abyssal Caverns",
        id: "level_8",
        width: 16000,
        completion: { exitX: 15900 },
        background: 'bg_caves_crystal',
        music: ['cave_ambient', 'ambient_cave_loop'],
        spawnPoints: [
            { x: 'right', y: 300 },
            { x: 'left', y: 300 },
            { x: 1600, y: 300 },
            { x: 3200, y: 300 },
            { x: 4800, y: 300 },
            { x: 6400, y: 300 },
            { x: 8000, y: 300 },
            { x: 9600, y: 300 },
            { x: 11200, y: 300 },
            { x: 12800, y: 300 },
            { x: 14400, y: 300 }
        ],
        platforms: [
            { x: 0, y: 600, width: 2600, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 3050, y: 590, width: 3000, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 6550, y: 610, width: 3200, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 10250, y: 600, width: 5750, height: 40, type: 'static', tile: 'ground3_tile' },
            // Abyssal Caverns: perilous gaps, narrow bridges, treacherous drops
            // Threshold: rocky ledges at the abyss entrance
            { x: 200, y: 520, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 600, y: 430, width: 150, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 950, y: 520, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 1300, y: 440, width: 250, height: 24, type: 'static', tile: 'platform4_tile' },

            // Stalactite Drops: fast vertical movers simulating falling rocks
            { x: 1800, y: 380, width: 100, height: 24, type: 'moving', axis: 'y', range: 220, speed: 3.0, tile: 'platform6_tile' },
            { x: 2100, y: 320, width: 100, height: 24, type: 'moving', axis: 'y', range: 220, speed: 3.0, timeOffset: 1.0, tile: 'platform6_tile' },
            { x: 2400, y: 440, width: 280, height: 24, type: 'static', tile: 'platform4_tile' },

            // Bone Bridge: very long narrow crossing over void
            { x: 2900, y: 500, width: 900, height: 24, type: 'static', tile: 'platform4_tile' },

            // Lava Shelf: wide shelf then descending
            { x: 4000, y: 420, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 4400, y: 350, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 4800, y: 440, width: 250, height: 24, type: 'static', tile: 'platform5_tile' },

            // Pendulum Crossing: horizontal movers over gaps
            { x: 5300, y: 480, width: 120, height: 24, type: 'moving', axis: 'x', range: 160, speed: 2.2, tile: 'platform6_tile' },
            { x: 5800, y: 380, width: 120, height: 24, type: 'moving', axis: 'x', range: 160, speed: 2.2, timeOffset: 1.5, tile: 'platform6_tile' },
            { x: 6300, y: 480, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },

            // Mushroom Shelf: alternating heights
            { x: 6800, y: 530, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 7100, y: 430, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 7400, y: 330, width: 160, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 7700, y: 430, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 8050, y: 530, width: 250, height: 24, type: 'static', tile: 'platform5_tile' },

            // Abyss Crossing: triple vertical movers
            { x: 8500, y: 450, width: 110, height: 24, type: 'moving', axis: 'y', range: 170, speed: 2.4, tile: 'platform6_tile' },
            { x: 8850, y: 350, width: 110, height: 24, type: 'moving', axis: 'y', range: 170, speed: 2.4, timeOffset: 0.7, tile: 'platform6_tile' },
            { x: 9200, y: 450, width: 110, height: 24, type: 'moving', axis: 'y', range: 170, speed: 2.4, timeOffset: 1.4, tile: 'platform6_tile' },

            // Deep Shelf: safety platform
            { x: 9600, y: 400, width: 500, height: 24, type: 'static', tile: 'platform4_tile' },

            // Final Descent: steep drops to boss approach
            { x: 10400, y: 350, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 10800, y: 450, width: 300, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 11400, y: 380, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },

            // Boss Gauntlet
            { x: 12000, y: 460, width: 140, height: 24, type: 'moving', axis: 'x', range: 140, speed: 2.2, tile: 'platform6_tile' },
            { x: 12500, y: 380, width: 140, height: 24, type: 'moving', axis: 'x', range: 140, speed: 2.2, timeOffset: 1.0, tile: 'platform6_tile' },
            { x: 13100, y: 470, width: 700, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 14100, y: 400, width: 400, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 14800, y: 500, width: 350, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [
            { x: 2100, y: 420 },
            { x: 7700, y: 470 },
            { x: 14300, y: 470 }
        ],
        speedBoosts: [
            { x: 1500, y: 520 },    // Early depths
            { x: 5300, y: 420 },    // Mid section
            { x: 9500, y: 420 },    // Floating crystals
            { x: 13200, y: 450 }    // Late section
        ],
        damageBoosts: [
            { x: 3700, y: 370 },    // Underground section
            { x: 8600, y: 470 },    // Grove area
            { x: 12200, y: 430 },   // Upper section
            { x: 15200, y: 420 }    // Pre-boss
        ],
        skunkPowerups: [
            { x: 2900, y: 480 },   // Lava cavern skunk ammo
            { x: 7600, y: 410 }    // Volcanic vent skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.2,
            maxEnemies: 12,
            aggression: 1.4,
            allowedTypes: ['THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 8-2: ABYSS SHOWDOWN
    // =========================================================
    {
        name: "Abyss Showdown",
        id: "level_8_boss",
        width: 5000,
        completion: { bossTriggerX: 4200, exitX: 4900 },
        boss: {
            type: "BOSS2",
            spawnX: 4480,
            spawnY: 520,
            healthMultiplier: 15.5,
            speedMultiplier: 1.2,
            attackDamageMultiplier: 2.2
        },
        background: 'bg_caves_crystal',
        music: ['cave_ambient', 'ambient_cave_loop'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 600, width: 5000, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 250, y: 520, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 700, y: 420, width: 170, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 1200, y: 320, width: 160, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.5, tile: 'platform6_tile' },
            { x: 1750, y: 460, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 2300, y: 350, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 2900, y: 480, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 3450, y: 380, width: 160, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.5, timeOffset: 1.0, tile: 'platform6_tile' },
            { x: 4000, y: 500, width: 240, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 4500, y: 420, width: 220, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 900, y: 380 }],
        damageBoosts: [{ x: 2700, y: 310 }],
        skunkPowerups: [{ x: 2000, y: 420 }],
        enemyConfig: {
            spawnInterval: 1.4,
            maxEnemies: 7,
            aggression: 1.4,
            allowedTypes: ['THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 9-1: NEON NEXUS — THE RUN
    // =========================================================
    {
        name: "Neon Nexus",
        id: "level_9",
        width: 12000,
        completion: { exitX: 11900 },
        background: 'bg_neon',
        music: ['city_theme', 'action_theme', 'gameplay'],
        spawnPoints: [
            { x: 'right', y: 300 },
            { x: 1000, y: 300 },
            { x: 2000, y: 300 },
            { x: 3000, y: 100 },
            { x: 4000, y: 300 },
            { x: 5000, y: 100 },
            { x: 6500, y: 300 },
            { x: 7800, y: 120 },
            { x: 9000, y: 300 },
            { x: 10400, y: 120 }
        ],
        platforms: [
            { x: 0, y: 590, width: 2300, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 2750, y: 580, width: 2600, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 5800, y: 600, width: 2500, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 8750, y: 590, width: 3250, height: 40, type: 'static', tile: 'ground3_tile' },
            // Neon Nexus: dense urban obstacle course, lots of moving parts
            // Entrance Scaffolding
            { x: 180, y: 510, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 520, y: 420, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 850, y: 330, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 1200, y: 430, width: 250, height: 24, type: 'static', tile: 'platform2_tile' },

            // Data Stream: fast horizontal movers in sequence
            { x: 1650, y: 480, width: 110, height: 24, type: 'moving', axis: 'x', range: 140, speed: 2.5, tile: 'platform5_tile' },
            { x: 2000, y: 380, width: 110, height: 24, type: 'moving', axis: 'x', range: 140, speed: 2.5, timeOffset: 0.7, tile: 'platform5_tile' },
            { x: 2350, y: 480, width: 110, height: 24, type: 'moving', axis: 'x', range: 140, speed: 2.5, timeOffset: 1.4, tile: 'platform5_tile' },

            // Server Room: tight alternating heights
            { x: 2700, y: 400, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 3050, y: 510, width: 150, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 3350, y: 400, width: 150, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 3650, y: 300, width: 200, height: 24, type: 'static', tile: 'platform5_tile' },

            // Nexus Core: hub with surrounding platforms
            { x: 4000, y: 460, width: 600, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 4200, y: 340, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },

            // Hologram Bridge: vertical movers across a gap
            { x: 4800, y: 400, width: 100, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.8, tile: 'platform5_tile' },
            { x: 5100, y: 320, width: 100, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.8, timeOffset: 0.9, tile: 'platform5_tile' },
            { x: 5400, y: 400, width: 100, height: 24, type: 'moving', axis: 'y', range: 180, speed: 2.8, timeOffset: 1.8, tile: 'platform5_tile' },

            // Neon Catwalk
            { x: 5700, y: 480, width: 400, height: 24, type: 'static', tile: 'platform2_tile' },

            // Circuit Board: zigzag descent
            { x: 6300, y: 400, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 6650, y: 500, width: 180, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 7000, y: 400, width: 180, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 7350, y: 300, width: 220, height: 24, type: 'static', tile: 'platform5_tile' },

            // Firewall: mixed movers gauntlet
            { x: 7800, y: 460, width: 100, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2.0, tile: 'platform5_tile' },
            { x: 8100, y: 360, width: 100, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.3, tile: 'platform5_tile' },
            { x: 8450, y: 460, width: 250, height: 24, type: 'static', tile: 'platform2_tile' },

            // Terminal Run: boss approach
            { x: 8900, y: 380, width: 350, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 9500, y: 480, width: 500, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 10200, y: 400, width: 300, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 10700, y: 500, width: 350, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 11200, y: 420, width: 280, height: 24, type: 'static', tile: 'platform5_tile' }
        ],
        idols: [
            { x: 2800, y: 370 },
            { x: 5900, y: 450 },
            { x: 9700, y: 450 }
        ],
        speedBoosts: [
            { x: 1300, y: 470 },    // Early nexus
            { x: 4900, y: 370 },    // Mid section
            { x: 8500, y: 400 }     // Late nexus
        ],
        damageBoosts: [
            { x: 2700, y: 370 },    // Early boost
            { x: 5600, y: 470 },    // Mid nexus
            { x: 9700, y: 470 },    // Late section
            { x: 11200, y: 430 }    // Just before boss
        ],
        skunkPowerups: [
            { x: 2700, y: 490 },   // Storm ruins skunk ammo
            { x: 7300, y: 430 }    // Thunder peak skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.5,
            maxEnemies: 10,
            aggression: 1.25,
            allowedTypes: ['THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 9-2: NEXUS SHOWDOWN
    // =========================================================
    {
        name: "Nexus Showdown",
        id: "level_9_boss",
        width: 4000,
        completion: { bossTriggerX: 3200, exitX: 3900 },
        boss: {
            type: "BOSS3",
            spawnX: 3480,
            spawnY: 520,
            healthMultiplier: 16.5,
            speedMultiplier: 1.2,
            attackDamageMultiplier: 2.3
        },
        background: 'bg_neon',
        music: ['city_theme', 'action_theme', 'gameplay'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 590, width: 4000, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 200, y: 510, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 650, y: 410, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1100, y: 310, width: 150, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 1600, y: 450, width: 240, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 2100, y: 350, width: 160, height: 24, type: 'moving', axis: 'x', range: 130, speed: 2.2, tile: 'platform5_tile' },
            { x: 2700, y: 470, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 3100, y: 370, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
            { x: 3500, y: 460, width: 200, height: 24, type: 'static', tile: 'platform4_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 800, y: 370 }],
        damageBoosts: [{ x: 2600, y: 330 }],
        skunkPowerups: [{ x: 1750, y: 410 }],
        enemyConfig: {
            spawnInterval: 1.4,
            maxEnemies: 8,
            aggression: 1.4,
            allowedTypes: ['THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 10-1: FINAL SHOWDOWN — THE RUN
    // =========================================================
    {
        name: "Final Showdown",
        id: "level_10",
        width: 12000,
        completion: { exitX: 11900 },
        background: 'bg_final',
        music: ['boss_theme', 'action_theme', 'city_theme'],
        spawnPoints: [
            { x: 'right', y: 300 },
            { x: 1000, y: 300 },
            { x: 2000, y: 300 },
            { x: 3000, y: 100 },
            { x: 4000, y: 300 },
            { x: 5000, y: 100 },
            { x: 6500, y: 300 },
            { x: 7800, y: 120 },
            { x: 9000, y: 300 },
            { x: 10400, y: 120 }
        ],
        platforms: [
            { x: 0, y: 580, width: 2100, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 2600, y: 570, width: 2500, height: 40, type: 'static', tile: 'ground2_tile' },
            { x: 5600, y: 590, width: 2400, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 8500, y: 580, width: 3500, height: 40, type: 'static', tile: 'ground2_tile' },
            // Final Showdown: the hardest platforming, every trick used
            // War Zone Entry: tight quick hops
            { x: 150, y: 500, width: 160, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 450, y: 400, width: 130, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 750, y: 310, width: 130, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 1050, y: 400, width: 160, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1350, y: 500, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },

            // Gauntlet Run: fast movers in both axes
            { x: 1750, y: 420, width: 100, height: 24, type: 'moving', axis: 'y', range: 200, speed: 3.0, tile: 'platform5_tile' },
            { x: 2050, y: 340, width: 100, height: 24, type: 'moving', axis: 'x', range: 160, speed: 2.8, tile: 'platform5_tile' },
            { x: 2400, y: 450, width: 100, height: 24, type: 'moving', axis: 'y', range: 200, speed: 3.0, timeOffset: 1.0, tile: 'platform5_tile' },
            { x: 2700, y: 380, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },

            // Crumbling Fortress: ascending then descending
            { x: 3100, y: 480, width: 150, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 3400, y: 380, width: 150, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 3700, y: 280, width: 180, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 4050, y: 380, width: 150, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 4350, y: 480, width: 250, height: 24, type: 'static', tile: 'platform2_tile' },

            // Death Bridge: long narrow with movers on each side
            { x: 4800, y: 420, width: 100, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2.4, tile: 'platform5_tile' },
            { x: 5100, y: 350, width: 500, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 5750, y: 420, width: 100, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2.4, timeOffset: 1.2, tile: 'platform5_tile' },

            // Chaos Zone: mixed elevation with fast movers
            { x: 6100, y: 500, width: 180, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 6450, y: 400, width: 100, height: 24, type: 'moving', axis: 'y', range: 160, speed: 2.6, tile: 'platform5_tile' },
            { x: 6750, y: 300, width: 200, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 7100, y: 400, width: 100, height: 24, type: 'moving', axis: 'y', range: 160, speed: 2.6, timeOffset: 0.8, tile: 'platform5_tile' },
            { x: 7400, y: 500, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },

            // Tower Ascent: steep vertical climb
            { x: 7800, y: 460, width: 120, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 8000, y: 360, width: 120, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 8200, y: 260, width: 160, height: 24, type: 'static', tile: 'platform6_tile' },

            // Arena Approach: final stretch to the boss
            { x: 8600, y: 380, width: 400, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 9200, y: 480, width: 300, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 9700, y: 380, width: 250, height: 24, type: 'static', tile: 'platform6_tile' },
            { x: 10150, y: 480, width: 500, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 10800, y: 400, width: 350, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 11300, y: 500, width: 300, height: 24, type: 'static', tile: 'platform4_tile' }
        ],
        idols: [
            { x: 2300, y: 270 },
            { x: 7600, y: 390 },
            { x: 11250, y: 430 }
        ],
        speedBoosts: [
            { x: 1300, y: 470 },    // Early final stretch
            { x: 3600, y: 470 },    // Mid section
            { x: 6950, y: 290 },    // Rooftop
            { x: 9700, y: 470 }     // Late section
        ],
        damageBoosts: [
            { x: 2300, y: 370 },    // Early power
            { x: 5100, y: 470 },    // Mid boost
            { x: 8500, y: 400 },    // Pre-final
            { x: 10900, y: 530 },   // Late boost
            { x: 11300, y: 430 }    // Just before final boss
        ],
        skunkPowerups: [
            { x: 2500, y: 500 },   // Void entrance skunk ammo
            { x: 7500, y: 440 }    // Shadow chamber skunk ammo
        ],
        enemyConfig: {
            spawnInterval: 1.3,
            maxEnemies: 12,
            aggression: 1.35,
            allowedTypes: ['THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    },

    // =========================================================
    // STAGE 10-2: FINAL CONFRONTATION
    // =========================================================
    {
        name: "Final Confrontation",
        id: "level_10_boss",
        width: 5000,
        completion: { bossTriggerX: 4200, exitX: 4900 },
        boss: {
            type: "BOSS4",
            spawnX: 4480,
            spawnY: 520,
            healthMultiplier: 19.0,
            speedMultiplier: 1.25,
            attackDamageMultiplier: 2.5
        },
        background: 'bg_final',
        music: ['boss_theme', 'action_theme', 'city_theme'],
        spawnPoints: [
            { x: 200, y: 300 },
            { x: 'right', y: 300 }
        ],
        platforms: [
            { x: 0, y: 580, width: 5000, height: 40, type: 'static', tile: 'ground3_tile' },
            { x: 200, y: 500, width: 180, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 650, y: 400, width: 150, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 1100, y: 300, width: 140, height: 24, type: 'moving', axis: 'y', range: 200, speed: 3.0, tile: 'platform5_tile' },
            { x: 1700, y: 440, width: 200, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 2250, y: 340, width: 160, height: 24, type: 'moving', axis: 'x', range: 150, speed: 2.8, tile: 'platform5_tile' },
            { x: 2850, y: 470, width: 200, height: 24, type: 'static', tile: 'platform2_tile' },
            { x: 3400, y: 370, width: 160, height: 24, type: 'moving', axis: 'y', range: 200, speed: 3.0, timeOffset: 1.0, tile: 'platform5_tile' },
            { x: 4000, y: 490, width: 260, height: 24, type: 'static', tile: 'platform4_tile' },
            { x: 4500, y: 400, width: 200, height: 24, type: 'static', tile: 'platform2_tile' }
        ],
        idols: [],
        speedBoosts: [{ x: 850, y: 360 }],
        damageBoosts: [{ x: 2700, y: 300 }],
        skunkPowerups: [{ x: 1900, y: 400 }],
        enemyConfig: {
            spawnInterval: 1.2,
            maxEnemies: 8,
            aggression: 1.5,
            allowedTypes: ['THIRD_BASIC', 'FOURTH_BASIC', 'FIFTH_BASIC']
        }
    }
];

// --- SURVIVAL MODE ARENA ---
// Compact fighting arena used exclusively for Survival Mode.
// No boss, no exit — enemies come in escalating waves until the player falls.
const SURVIVAL_ARENA_CONFIG = {
    name: "Survival Arena",
    id: "survival_arena",
    width: 2800,
    height: 780,
    background: 'bg_city',
    music: ['city_theme', 'action_theme', 'gameplay'],
    spawnPoints: [
        { x: 'right', y: 300 },
        { x: 'left',  y: 300 },
        { x: 2800,    y: 300 },
        { x: -50,     y: 300 }
    ],
    platforms: [
        // Ground
        { x: 0,    y: 660, width: 2800, height: 40, type: 'static', tile: 'ground3_tile' },
        // Lower-mid platforms
        { x: 80,   y: 520, width: 280, height: 24, type: 'static', tile: 'platform2_tile' },
        { x: 600,  y: 480, width: 260, height: 24, type: 'static', tile: 'platform2_tile' },
        { x: 1150, y: 520, width: 280, height: 24, type: 'static', tile: 'platform4_tile' },
        { x: 1700, y: 480, width: 260, height: 24, type: 'static', tile: 'platform2_tile' },
        { x: 2300, y: 520, width: 280, height: 24, type: 'static', tile: 'platform2_tile' },
        // Upper platforms
        { x: 380,  y: 360, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
        { x: 900,  y: 320, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
        { x: 1450, y: 360, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
        { x: 2000, y: 320, width: 220, height: 24, type: 'static', tile: 'platform4_tile' },
        // High platforms
        { x: 680,  y: 210, width: 180, height: 24, type: 'static', tile: 'platform5_tile' },
        { x: 1620, y: 210, width: 180, height: 24, type: 'static', tile: 'platform5_tile' }
    ],
    enemyConfig: {
        spawnInterval: 2.5,
        maxEnemies: 5,
        aggression: 1.0,
        allowedTypes: ['BASIC', 'FAST_BASIC']
    }
};
