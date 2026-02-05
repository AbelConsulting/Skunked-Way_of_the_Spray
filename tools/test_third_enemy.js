/**
 * Test script to verify THIRD_BASIC enemy implementation
 * Run after the game loads to spawn and check third enemies
 */

(async function testThirdEnemy() {
    console.log('=== THIRD_BASIC Enemy Test ===');
    
    // Wait for game to be ready
    if (!window.game || !window.game.enemyManager) {
        console.error('Game not ready. Load a level first.');
        return;
    }
    
    const game = window.game;
    const level = game.level;
    
    if (!level) {
        console.error('No level loaded. Start the game first.');
        return;
    }
    
    console.log('\n1. Sprite Loading Check:');
    const spriteKeys = ['third_idle', 'third_walk', 'third_attack', 'third_hurt'];
    for (const key of spriteKeys) {
        const sprite = spriteLoader.getSprite(key);
        if (sprite) {
            console.log(`✓ ${key}: ${sprite.width}x${sprite.height}`);
        } else {
            console.warn(`✗ ${key}: MISSING`);
        }
    }
    
    console.log('\n2. Spawning Test THIRD_BASIC Enemy:');
    // Spawn a third enemy near the player
    const spawnX = game.player.x + 400;
    const spawnY = game.player.y;
    const testEnemy = new Enemy(spawnX, spawnY, 'THIRD_BASIC', game.audioManager);
    game.enemyManager.enemies.push(testEnemy);
    
    console.log('✓ Spawned THIRD_BASIC at:', { x: spawnX, y: spawnY });
    console.log('  Stats:', {
        health: testEnemy.health,
        maxHealth: testEnemy.maxHealth,
        speed: testEnemy.speed,
        attackDamage: testEnemy.attackDamage,
        points: testEnemy.points
    });
    
    console.log('\n3. Animation Check:');
    console.log('  Animations loaded:', Object.keys(testEnemy.animations));
    console.log('  Current animation:', testEnemy.currentAnimation ? 'Set' : 'Missing');
    
    console.log('\n4. Level Configuration Check:');
    const currentLevel = game.currentLevelIndex || 0;
    const levelConfig = LEVEL_CONFIGS[currentLevel];
    if (levelConfig && levelConfig.enemyConfig) {
        const allowedTypes = levelConfig.enemyConfig.allowedTypes || [];
        console.log(`  Level ${currentLevel + 1} (${levelConfig.name})`);
        console.log('  Allowed enemy types:', allowedTypes.join(', '));
        console.log('  THIRD_BASIC allowed:', allowedTypes.includes('THIRD_BASIC') ? '✓ YES' : '✗ NO');
    }
    
    console.log('\n5. AI Behavior Check:');
    // Update the enemy once to trigger AI
    testEnemy.update(0.016, game.player, level);
    console.log('  State:', testEnemy.state);
    console.log('  Velocity:', { x: testEnemy.velocityX.toFixed(2), y: testEnemy.velocityY.toFixed(2) });
    console.log('  Rush sparks array exists:', !!testEnemy.rushSparks);
    
    console.log('\n6. Visual Effects Check:');
    console.log('  Rush sparks implementation:', 
        testEnemy.rushSparks !== undefined ? '✓ Implemented' : '✗ Missing');
    
    console.log('\n=== Test Complete ===');
    console.log('Watch the game for the fast-moving red enemy with rush spark effects!');
    console.log('The third enemy should chase the player at 2.5x normal speed.');
    
})();
