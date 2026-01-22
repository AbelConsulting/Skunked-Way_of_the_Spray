/**
 * Level Configurations for Arcade Mode
 * Defines the stage progression: Forest -> City -> Dojo
 */

const LEVEL_CONFIGS = [
    // --- LEVEL 1: FOREST OUTSKIRTS ---
    {
        name: "Forest Outskirts",
        id: "level_1",
        width: 10000, 
        // Clear condition: reach the boss trigger, defeat the boss, then reach the exit.
        completion: {
            bossTriggerX: 10000 - 800,
            exitX: 10000 - 100
        },
        boss: {
            type: "BOSS",
            spawnX: 10000 - 520,
            spawnY: 520,
            healthMultiplier: 5.0,
            speedMultiplier: 0.9,
            attackDamageMultiplier: 1.8
        },
        background: 'bg_forest',
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 1200, y: 300 }, 
            { x: 2400, y: 300 },
            { x: 3600, y: 300 },
            { x: 5200, y: 300 },
            { x: 6600, y: 300 },
            { x: 7900, y: 300 },
            { x: 9100, y: 300 },
            { x: 'left', y: 300 } 
        ],
        platforms: [
            // Ground
            { x: 0, y: 700, width: 10000, height: 40, type: 'static', tile: 'ground_tile' },
            
            // Section 1: Intro stepping stones
            { x: 200, y: 550, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 500, y: 450, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 900, y: 550, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Section 2: Height exploration & longer path
            { x: 1300, y: 450, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1700, y: 550, width: 300, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2200, y: 450, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Section 3: Bridge
            { x: 2800, y: 500, width: 600, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Section 4: Final stretch to exit
            { x: 3800, y: 450, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4200, y: 550, width: 300, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4700, y: 500, width: 200, height: 24, type: 'static', tile: 'platform_tile' }

            // Section 5: Deep woods
            ,{ x: 5200, y: 550, width: 220, height: 24, type: 'static', tile: 'platform_tile' }
            ,{ x: 5550, y: 450, width: 240, height: 24, type: 'static', tile: 'platform_tile' }
            ,{ x: 5950, y: 520, width: 320, height: 24, type: 'static', tile: 'platform_tile' }

            // Section 6: Canopy run
            ,{ x: 6600, y: 380, width: 180, height: 24, type: 'static', tile: 'platform_tile' }
            ,{ x: 6900, y: 300, width: 180, height: 24, type: 'static', tile: 'platform_tile' }
            ,{ x: 7250, y: 380, width: 220, height: 24, type: 'static', tile: 'platform_tile' }
            ,{ x: 7600, y: 460, width: 260, height: 24, type: 'static', tile: 'platform_tile' }

            // Section 7: Approach to boss arena
            ,{ x: 8200, y: 520, width: 600, height: 24, type: 'static', tile: 'platform_tile' }
            ,{ x: 9000, y: 450, width: 220, height: 24, type: 'static', tile: 'platform_tile' }
            ,{ x: 9400, y: 550, width: 320, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        enemyConfig: {
            spawnInterval: 3.0,
            maxEnemies: 5,
            aggression: 0.5,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 2: DOWNTOWN SKUNK CITY ---
    {
        name: "Skunk City",
        id: "level_2",
        width: 12000,
        // Clear condition: reach the boss trigger, defeat the boss, then reach the exit.
        completion: {
            bossTriggerX: 12000 - 900,
            exitX: 12000 - 100
        },
        boss: {
            type: "BOSS",
            spawnX: 12000 - 520,
            spawnY: 520,
            healthMultiplier: 6.0,
            speedMultiplier: 1.0,
            attackDamageMultiplier: 2.0
        },
        background: 'bg_city',
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
            { x: 0, y: 700, width: 12000, height: 40, type: 'static', tile: 'ground_tile' },
            
            // Urban District 1
            { x: 300, y: 500, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 500, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            // Elevator
            { x: 800, y: 400, width: 120, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            
            { x: 1100, y: 500, width: 400, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Rooftops
            { x: 1800, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2200, y: 300, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2600, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },

            // Highway Bridge
            { x: 3200, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Construction Zone
            { x: 4200, y: 600, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4500, y: 500, width: 150, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2, tile: 'platform_tile' },
            { x: 4900, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Final Stretch
            { x: 5300, y: 500, width: 500, height: 24, type: 'static', tile: 'platform_tile' },

            // District 2: Alley rooftops
            { x: 6200, y: 520, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6550, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6950, y: 320, width: 260, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7350, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },

            // District 3: Billboard run
            { x: 7900, y: 520, width: 200, height: 24, type: 'moving', axis: 'y', range: 140, speed: 2.1, tile: 'platform_tile' },
            { x: 8300, y: 430, width: 300, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 350, width: 220, height: 24, type: 'static', tile: 'platform_tile' },

            // Approach to boss arena
            { x: 9500, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 10700, y: 560, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 11100, y: 460, width: 280, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        enemyConfig: {
            spawnInterval: 2.2,
            maxEnemies: 7,
            aggression: 0.7,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 3: THE DOJO ---
    {
        name: "Mountain Dojo",
        id: "level_3",
        width: 15000,
        // Clear condition: reach the boss trigger, defeat the boss, then reach the exit.
        completion: {
            bossTriggerX: 15000 - 1000,
            exitX: 15000 - 100
        },
        boss: {
            type: "BOSS",
            spawnX: 15000 - 520,
            spawnY: 520,
            healthMultiplier: 7.0,
            speedMultiplier: 1.05,
            attackDamageMultiplier: 2.2
        },
        background: 'bg_mountains', 
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
            { x: 0, y: 700, width: 15000, height: 40, type: 'static', tile: 'ground_tile' },
            
            // Courtyard
            { x: 400, y: 550, width: 100, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 600, y: 450, width: 150, height: 24, type: 'moving', axis: 'x', range: 80, speed: 1.5, tile: 'platform_tile' },
            
            // Training Hall
            { x: 1200, y: 400, width: 800, height: 24, type: 'static', tile: 'platform_tile' }, 
            
            // Moving Pillars
            { x: 2200, y: 550, width: 100, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 2500, y: 550, width: 100, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.5, timeOffset: 1.5, tile: 'platform_tile' },
            
            { x: 2900, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            
            // The Gauntlet
            { x: 3500, y: 500, width: 100, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3800, y: 400, width: 100, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4100, y: 300, width: 100, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4400, y: 400, width: 100, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4700, y: 500, width: 100, height: 24, type: 'static', tile: 'platform_tile' },

            // Upper Walkway
            { x: 5300, y: 350, width: 1000, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Final Steps
            { x: 6600, y: 450, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6900, y: 550, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7200, y: 450, width: 200, height: 24, type: 'static', tile: 'platform_tile' },

            // Inner temple: staggered ascent
            { x: 8000, y: 560, width: 160, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8350, y: 460, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8750, y: 360, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 9150, y: 460, width: 200, height: 24, type: 'static', tile: 'platform_tile' },

            // Hanging lanterns (moving)
            { x: 9800, y: 520, width: 120, height: 24, type: 'moving', axis: 'y', range: 160, speed: 2.3, tile: 'platform_tile' },
            { x: 10150, y: 420, width: 120, height: 24, type: 'moving', axis: 'y', range: 160, speed: 2.6, timeOffset: 1.2, tile: 'platform_tile' },
            { x: 10500, y: 320, width: 160, height: 24, type: 'static', tile: 'platform_tile' },

            // Upper ridge
            { x: 11200, y: 360, width: 1000, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12550, y: 460, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12950, y: 560, width: 240, height: 24, type: 'static', tile: 'platform_tile' },

            // Approach to boss arena
            { x: 13500, y: 500, width: 700, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 14400, y: 450, width: 260, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        enemyConfig: {
            spawnInterval: 1.8,
            maxEnemies: 8,
            aggression: 1.0,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 4: CRYSTAL CAVERNS ---
    {
        name: "Crystal Caverns",
        id: "level_4",
        width: 16000,
        // Clear condition: reach the boss trigger, defeat the boss, then reach the exit.
        completion: {
            bossTriggerX: 16000 - 1100,
            exitX: 16000 - 100
        },
        boss: {
            type: "BOSS2",
            spawnX: 16000 - 520,
            spawnY: 520,
            healthMultiplier: 8.5,
            speedMultiplier: 1.1,
            attackDamageMultiplier: 2.5
        },
        background: 'bg_cave',
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
            { x: 0, y: 700, width: 16000, height: 40, type: 'static', tile: 'ground_tile' },
            
            // Cavern Entrance
            { x: 300, y: 550, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 600, y: 450, width: 160, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 900, y: 350, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Stalactite Descent
            { x: 1300, y: 450, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 1.8, tile: 'platform_tile' },
            { x: 1650, y: 550, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.2, timeOffset: 1.0, tile: 'platform_tile' },
            { x: 2000, y: 450, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Underground River
            { x: 2500, y: 520, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3500, y: 400, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3850, y: 300, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Crystal Chamber
            { x: 4300, y: 450, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, tile: 'platform_tile' },
            { x: 4700, y: 550, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, timeOffset: 1.5, tile: 'platform_tile' },
            { x: 5100, y: 450, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Deep Chasm
            { x: 5600, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5900, y: 280, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6200, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6500, y: 480, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6800, y: 580, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Glowing Mushroom Grove
            { x: 7300, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8400, y: 400, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 500, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Floating Crystals
            { x: 9300, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 9650, y: 350, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.4, timeOffset: 1.2, tile: 'platform_tile' },
            { x: 10000, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, timeOffset: 2.4, tile: 'platform_tile' },
            
            // Upper Ledges
            { x: 10500, y: 360, width: 1200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12000, y: 460, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12450, y: 560, width: 280, height: 24, type: 'static', tile: 'platform_tile' },
            
            // Precarious Path
            { x: 13000, y: 480, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, tile: 'platform_tile' },
            { x: 13400, y: 380, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, timeOffset: 1.5, tile: 'platform_tile' },
            
            // Approach to Boss Arena
            { x: 14000, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 15000, y: 450, width: 300, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        enemyConfig: {
            spawnInterval: 1.5,
            maxEnemies: 10,
            aggression: 1.2,
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    }
];
