/**
 * Test script to verify skunk spray AoE effect
 * Run in browser console after loading the game
 */

(async function testSkunkSpray() {
    console.log('=== Skunk Spray AoE Test ===');
    
    // Wait for game to be ready
    if (!window.game || !window.game.player) {
        console.error('Game not ready. Load a level first.');
        return;
    }
    
    const game = window.game;
    const player = game.player;
    const level = game.level;
    
    if (!level) {
        console.error('No level loaded. Start the game first.');
        return;
    }
    
    console.log('\n1. Spray Cloud System Check:');
    console.log('  skunkSprays array exists:', !!player.skunkSprays);
    console.log('  createSprayCloud method exists:', typeof player.createSprayCloud === 'function');
    console.log('  Current spray clouds:', player.skunkSprays.length);
    
    console.log('\n2. Give Player Skunk Ammo:');
    player.skunkAmmo = 10;
    console.log('  ✓ Skunk ammo set to:', player.skunkAmmo);
    
    console.log('\n3. Spawn Test Enemies:');
    // Spawn a cluster of enemies near the player
    const enemyTypes = ['BASIC', 'FAST_BASIC', 'SECOND_BASIC', 'THIRD_BASIC'];
    const spawnPositions = [
        { x: player.x + 200, y: player.y },
        { x: player.x + 250, y: player.y },
        { x: player.x + 220, y: player.y - 50 },
        { x: player.x + 280, y: player.y + 30 }
    ];
    
    for (let i = 0; i < spawnPositions.length; i++) {
        const pos = spawnPositions[i];
        const enemyType = enemyTypes[i % enemyTypes.length];
        const enemy = new Enemy(pos.x, pos.y, enemyType, game.audioManager);
        game.enemyManager.enemies.push(enemy);
    }
    console.log('  ✓ Spawned', spawnPositions.length, 'enemies in a cluster');
    
    console.log('\n4. Test Manual Spray Creation:');
    player.createSprayCloud(player.x + 240, player.y);
    console.log('  ✓ Created spray cloud at enemy cluster');
    console.log('  Active spray clouds:', player.skunkSprays.length);
    if (player.skunkSprays.length > 0) {
        const spray = player.skunkSprays[0];
        console.log('  Spray details:', {
            radius: spray.radius.toFixed(1),
            maxRadius: spray.maxRadius,
            duration: spray.duration,
            particles: spray.particles.length,
            hitEnemies: spray.hitEnemies.size
        });
    }
    
    console.log('\n5. Instructions:');
    console.log('  • Press E to shoot skunk projectile');
    console.log('  • Watch for GREEN SPRAY CLOUD on impact');
    console.log('  • Spray cloud expands to 100px radius over 0.8 seconds');
    console.log('  • All enemies in spray area get SKUNKED (green particles + stunned)');
    console.log('  • Multiple enemies can be hit by single spray');
    
    console.log('\n6. Visual Indicators:');
    console.log('  • Projectile: Green glowing ball with trail');
    console.log('  • Impact: Expanding green cloud with particles');
    console.log('  • Hit enemies: "SKUNKED!" text + green stun effect');
    console.log('  • Spray area: Semi-transparent green circle');
    
    console.log('\n=== Test Setup Complete ===');
    console.log('Fire a skunk shot at the enemy cluster to see the spray effect!');
    console.log('Watch how ONE shot can skunk MULTIPLE enemies in the spray area.');
    
})();
