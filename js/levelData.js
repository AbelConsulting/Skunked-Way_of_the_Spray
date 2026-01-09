/**
 * Level Configurations for Arcade Mode
 * Defines the stage progression: Forest -> City -> Dojo
 */

const LEVEL_CONFIGS = [
    // --- LEVEL 1: FOREST OUTSKIRTS ---
    {
        name: "Forest Outskirts",
        id: "level_1",
        width: 5000, 
        background: 'bg_forest',
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 1200, y: 300 }, 
            { x: 2400, y: 300 },
            { x: 3600, y: 300 },
            { x: 'left', y: 300 } 
        ],
        platforms: [
            // Ground
            { x: 0, y: 700, width: 5000, height: 40, type: 'static', tile: 'ground_tile' },
            
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
        ],
        enemyConfig: {
            spawnInterval: 3.0,
            maxEnemies: 5,
            aggression: 0.5
        }
    },

    // --- LEVEL 2: DOWNTOWN SKUNK CITY ---
    {
        name: "Skunk City",
        id: "level_2",
        width: 6000,
        background: 'bg_city',
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 1000, y: 300 },
            { x: 2000, y: 300 },
            { x: 3000, y: 100 },
            { x: 4000, y: 300 },
            { x: 5000, y: 100 }
        ],
        platforms: [
            // Ground
            { x: 0, y: 700, width: 6000, height: 40, type: 'static', tile: 'ground_tile' },
            
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
            { x: 5300, y: 500, width: 500, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        enemyConfig: {
            spawnInterval: 2.2,
            maxEnemies: 7,
            aggression: 0.7
        }
    },

    // --- LEVEL 3: THE DOJO ---
    {
        name: "Shadow Dojo",
        id: "level_3",
        width: 7500,
        background: 'bg_dojo', 
        spawnPoints: [ 
            { x: 'right', y: 300 }, 
            { x: 'left', y: 300 },
            { x: 1500, y: 300 },
            { x: 3000, y: 300 },
            { x: 4500, y: 300 },
            { x: 6000, y: 300 }
        ],
        platforms: [
            { x: 0, y: 700, width: 7500, height: 40, type: 'static', tile: 'ground_tile' },
            
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
            { x: 7200, y: 450, width: 200, height: 24, type: 'static', tile: 'platform_tile' }
        ],
        enemyConfig: {
            spawnInterval: 1.8,
            maxEnemies: 8,
            aggression: 1.0
        }
    }
];
