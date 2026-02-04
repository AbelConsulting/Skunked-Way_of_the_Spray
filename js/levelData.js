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
            healthMultiplier: 8.0,
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
            { x: 0, y: 680, width: 3000, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 3200, y: 670, width: 3300, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 6750, y: 680, width: 3250, height: 40, type: 'static', tile: 'ground_tile' },
            
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
        idols: [
            { x: 600, y: 420 },
            { x: 3100, y: 470 },
            { x: 8500, y: 490 }
        ],
        speedBoosts: [
            { x: 1800, y: 520 },  // Early speed boost on platform
            { x: 7700, y: 430 }   // Late speed boost before boss
        ],
        damageBoosts: [
            { x: 4500, y: 520 }   // Mid-level damage boost
        ],
        skunkPowerups: [
            { x: 2500, y: 470 },  // Mid-forest skunk ammo
            { x: 6200, y: 490 }   // Deep woods skunk ammo
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
            type: "BOSS2",
            spawnX: 12000 - 520,
            spawnY: 520,
            healthMultiplier: 11.0,
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
            { x: 0, y: 660, width: 2600, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 2850, y: 650, width: 3200, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 6350, y: 670, width: 2600, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 9200, y: 660, width: 2800, height: 40, type: 'static', tile: 'ground_tile' },
            
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
            type: "BOSS3",
            spawnX: 15000 - 520,
            spawnY: 520,
            healthMultiplier: 14.0,
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
            { x: 0, y: 650, width: 3400, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 3700, y: 640, width: 3500, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 7550, y: 660, width: 3500, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 11400, y: 650, width: 3600, height: 40, type: 'static', tile: 'ground_tile' },
            
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
        idols: [
            { x: 1500, y: 370 },
            { x: 5600, y: 320 },
            { x: 11250, y: 330 }
        ],
        speedBoosts: [
            { x: 3000, y: 370 },    // Before gauntlet
            { x: 8750, y: 330 }     // Inner temple
        ],
        damageBoosts: [
            { x: 1600, y: 370 },    // Early training hall
            { x: 12000, y: 330 },   // Upper ridge
            { x: 14400, y: 420 }    // Just before boss
        ],
        skunkPowerups: [
            { x: 3200, y: 490 },   // Temple approach skunk ammo
            { x: 8400, y: 330 }    // Mountain path skunk ammo
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
            type: "BOSS",
            spawnX: 16000 - 520,
            spawnY: 520,
            healthMultiplier: 17.0,
            speedMultiplier: 1.1,
            attackDamageMultiplier: 2.5
        },
        background: 'bg_cave_crystal',
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
            { x: 0, y: 640, width: 3200, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 3550, y: 630, width: 3400, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 7350, y: 650, width: 3600, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 11350, y: 640, width: 4650, height: 40, type: 'static', tile: 'ground_tile' },
            
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
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 5: CRYSTAL CAVERNS DEPTHS ---
    {
        name: "Crystal Caverns Depths",
        id: "level_5",
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
            healthMultiplier: 20.0,
            speedMultiplier: 1.25,
            attackDamageMultiplier: 2.9
        },
        background: 'bg_cave_depths',
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
            { x: 0, y: 630, width: 3000, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 3400, y: 620, width: 3200, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 7000, y: 640, width: 3300, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 10750, y: 630, width: 5250, height: 40, type: 'static', tile: 'ground_tile' },
            // Reuse Level 4 layout for now
            { x: 300, y: 550, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 600, y: 450, width: 160, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 900, y: 350, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1300, y: 450, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 1.8, tile: 'platform_tile' },
            { x: 1650, y: 550, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.2, timeOffset: 1.0, tile: 'platform_tile' },
            { x: 2000, y: 450, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2500, y: 520, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3500, y: 400, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3850, y: 300, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4300, y: 450, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, tile: 'platform_tile' },
            { x: 4700, y: 550, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, timeOffset: 1.5, tile: 'platform_tile' },
            { x: 5100, y: 450, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5600, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5900, y: 280, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6200, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6500, y: 480, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6800, y: 580, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7300, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8400, y: 400, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 500, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 9300, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 9650, y: 350, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.4, timeOffset: 1.2, tile: 'platform_tile' },
            { x: 10000, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, timeOffset: 2.4, tile: 'platform_tile' },
            { x: 10500, y: 360, width: 1200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12000, y: 460, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12450, y: 560, width: 280, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 13000, y: 480, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, tile: 'platform_tile' },
            { x: 13400, y: 380, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, timeOffset: 1.5, tile: 'platform_tile' },
            { x: 14000, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 15000, y: 450, width: 300, height: 24, type: 'static', tile: 'platform_tile' }
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
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 6: NEON CROSSROADS ---
    {
        name: "Neon Crossroads",
        id: "level_6",
        width: 12000,
        // Clear condition: reach the boss trigger, defeat the boss, then reach the exit.
        completion: {
            bossTriggerX: 12000 - 900,
            exitX: 12000 - 100
        },
        boss: {
            type: "BOSS4",
            spawnX: 12000 - 520,
            spawnY: 520,
            healthMultiplier: 22.0,
            speedMultiplier: 1.2,
            attackDamageMultiplier: 2.6
        },
        background: 'bg_neon',
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
            { x: 0, y: 620, width: 2400, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 2750, y: 610, width: 2700, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 5800, y: 630, width: 2700, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 8850, y: 620, width: 3150, height: 40, type: 'static', tile: 'ground_tile' },
            // Reuse Level 2 layout for the city-themed finale
            { x: 300, y: 500, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 500, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 800, y: 400, width: 120, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 1100, y: 500, width: 400, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1800, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2200, y: 300, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2600, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3200, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4200, y: 600, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4500, y: 500, width: 150, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2, tile: 'platform_tile' },
            { x: 4900, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5300, y: 500, width: 500, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6200, y: 520, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6550, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6950, y: 320, width: 260, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7350, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7900, y: 520, width: 200, height: 24, type: 'moving', axis: 'y', range: 140, speed: 2.1, tile: 'platform_tile' },
            { x: 8300, y: 430, width: 300, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 350, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 9500, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 10700, y: 560, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 11100, y: 460, width: 280, height: 24, type: 'static', tile: 'platform_tile' }
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
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 7: CRYSTAL RIDGE ---
    {
        name: "Crystal Ridge",
        id: "level_7",
        width: 16000,
        completion: {
            bossTriggerX: 16000 - 1100,
            exitX: 16000 - 100
        },
        boss: {
            type: "BOSS",
            spawnX: 16000 - 520,
            spawnY: 520,
            healthMultiplier: 24.0,
            speedMultiplier: 1.1,
            attackDamageMultiplier: 2.6
        },
        background: 'bg_cave_crystal',
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
            { x: 0, y: 610, width: 2800, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 3200, y: 600, width: 3100, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 6750, y: 620, width: 3200, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 10400, y: 610, width: 5600, height: 40, type: 'static', tile: 'ground_tile' },
            // Reuse Level 4 layout
            { x: 300, y: 550, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 600, y: 450, width: 160, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 900, y: 350, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1300, y: 450, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 1.8, tile: 'platform_tile' },
            { x: 1650, y: 550, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.2, timeOffset: 1.0, tile: 'platform_tile' },
            { x: 2000, y: 450, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2500, y: 520, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3500, y: 400, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3850, y: 300, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4300, y: 450, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, tile: 'platform_tile' },
            { x: 4700, y: 550, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, timeOffset: 1.5, tile: 'platform_tile' },
            { x: 5100, y: 450, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5600, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5900, y: 280, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6200, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6500, y: 480, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6800, y: 580, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7300, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8400, y: 400, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 500, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 9300, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 9650, y: 350, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.4, timeOffset: 1.2, tile: 'platform_tile' },
            { x: 10000, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, timeOffset: 2.4, tile: 'platform_tile' },
            { x: 10500, y: 360, width: 1200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12000, y: 460, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12450, y: 560, width: 280, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 13000, y: 480, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, tile: 'platform_tile' },
            { x: 13400, y: 380, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, timeOffset: 1.5, tile: 'platform_tile' },
            { x: 14000, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 15000, y: 450, width: 300, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        idols: [
            { x: 3600, y: 370 },
            { x: 7600, y: 470 },
            { x: 13500, y: 350 }
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
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 8: ABYSSAL CAVERNS ---
    {
        name: "Abyssal Caverns",
        id: "level_8",
        width: 16000,
        completion: {
            bossTriggerX: 16000 - 1100,
            exitX: 16000 - 100
        },
        boss: {
            type: "BOSS2",
            spawnX: 16000 - 520,
            spawnY: 520,
            healthMultiplier: 26.0,
            speedMultiplier: 1.3,
            attackDamageMultiplier: 3.1
        },
        background: 'bg_cave_depths',
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
            { x: 0, y: 600, width: 2600, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 3050, y: 590, width: 3000, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 6550, y: 610, width: 3200, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 10250, y: 600, width: 5750, height: 40, type: 'static', tile: 'ground_tile' },
            // Reuse Level 5 layout
            { x: 300, y: 550, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 600, y: 450, width: 160, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 900, y: 350, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1300, y: 450, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 1.8, tile: 'platform_tile' },
            { x: 1650, y: 550, width: 140, height: 24, type: 'moving', axis: 'y', range: 120, speed: 2.2, timeOffset: 1.0, tile: 'platform_tile' },
            { x: 2000, y: 450, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2500, y: 520, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3500, y: 400, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3850, y: 300, width: 180, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4300, y: 450, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, tile: 'platform_tile' },
            { x: 4700, y: 550, width: 120, height: 24, type: 'moving', axis: 'x', range: 100, speed: 1.5, timeOffset: 1.5, tile: 'platform_tile' },
            { x: 5100, y: 450, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5600, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5900, y: 280, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6200, y: 380, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6500, y: 480, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6800, y: 580, width: 140, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7300, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8400, y: 400, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 500, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 9300, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 9650, y: 350, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.4, timeOffset: 1.2, tile: 'platform_tile' },
            { x: 10000, y: 450, width: 130, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, timeOffset: 2.4, tile: 'platform_tile' },
            { x: 10500, y: 360, width: 1200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12000, y: 460, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 12450, y: 560, width: 280, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 13000, y: 480, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, tile: 'platform_tile' },
            { x: 13400, y: 380, width: 150, height: 24, type: 'moving', axis: 'x', range: 120, speed: 2.0, timeOffset: 1.5, tile: 'platform_tile' },
            { x: 14000, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 15000, y: 450, width: 300, height: 24, type: 'static', tile: 'platform_tile' }
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
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 9: NEON NEXUS ---
    {
        name: "Neon Nexus",
        id: "level_9",
        width: 12000,
        completion: {
            bossTriggerX: 12000 - 900,
            exitX: 12000 - 100
        },
        boss: {
            type: "BOSS3",
            spawnX: 12000 - 520,
            spawnY: 520,
            healthMultiplier: 28.0,
            speedMultiplier: 1.25,
            attackDamageMultiplier: 2.9
        },
        background: 'bg_neon',
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
            { x: 0, y: 590, width: 2300, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 2750, y: 580, width: 2600, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 5800, y: 600, width: 2500, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 8750, y: 590, width: 3250, height: 40, type: 'static', tile: 'ground_tile' },
            // Reuse Level 2 layout
            { x: 300, y: 500, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 500, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 800, y: 400, width: 120, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 1100, y: 500, width: 400, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1800, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2200, y: 300, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2600, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3200, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4200, y: 600, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4500, y: 500, width: 150, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2, tile: 'platform_tile' },
            { x: 4900, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5300, y: 500, width: 500, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6200, y: 520, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6550, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6950, y: 320, width: 260, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7350, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7900, y: 520, width: 200, height: 24, type: 'moving', axis: 'y', range: 140, speed: 2.1, tile: 'platform_tile' },
            { x: 8300, y: 430, width: 300, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 350, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 9500, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 10700, y: 560, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 11100, y: 460, width: 280, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        idols: [
            { x: 1900, y: 370 },
            { x: 6650, y: 390 },
            { x: 10750, y: 530 }
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
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    },

    // --- LEVEL 10: FINAL LEVEL ---
    {
        name: "Final Level",
        id: "level_10",
        width: 12000,
        completion: {
            bossTriggerX: 12000 - 900,
            exitX: 12000 - 100
        },
        boss: {
            type: "BOSS4",
            spawnX: 12000 - 520,
            spawnY: 520,
            healthMultiplier: 30.0,
            speedMultiplier: 1.35,
            attackDamageMultiplier: 3.3
        },
        background: 'bg_neon',
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
            { x: 0, y: 580, width: 2100, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 2600, y: 570, width: 2500, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 5600, y: 590, width: 2400, height: 40, type: 'static', tile: 'ground_tile' },
            { x: 8500, y: 580, width: 3500, height: 40, type: 'static', tile: 'ground_tile' },
            // Reuse Level 6 layout
            { x: 300, y: 500, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 500, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 800, y: 400, width: 120, height: 24, type: 'moving', axis: 'y', range: 150, speed: 2.0, tile: 'platform_tile' },
            { x: 1100, y: 500, width: 400, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 1800, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2200, y: 300, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 2600, y: 400, width: 200, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 3200, y: 500, width: 800, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4200, y: 600, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 4500, y: 500, width: 150, height: 24, type: 'moving', axis: 'x', range: 100, speed: 2, tile: 'platform_tile' },
            { x: 4900, y: 400, width: 150, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 5300, y: 500, width: 500, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6200, y: 520, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6550, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 6950, y: 320, width: 260, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7350, y: 420, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 7900, y: 520, width: 200, height: 24, type: 'moving', axis: 'y', range: 140, speed: 2.1, tile: 'platform_tile' },
            { x: 8300, y: 430, width: 300, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 8800, y: 350, width: 220, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 9500, y: 500, width: 900, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 10700, y: 560, width: 240, height: 24, type: 'static', tile: 'platform_tile' },
            { x: 11100, y: 460, width: 280, height: 24, type: 'static', tile: 'platform_tile' }
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
            allowedTypes: ['BASIC', 'FAST_BASIC', 'SECOND_BASIC']
        }
    }
];
