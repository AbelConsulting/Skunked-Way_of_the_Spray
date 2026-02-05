# Skunk Spray AoE Enhancement

## Overview
The skunk attack has been enhanced with a visual spray cloud effect that creates an area-of-effect (AoE) attack on impact, allowing a single skunk shot to disable multiple enemies.

## How It Works

### 1. **Projectile Phase**
- Player fires a skunk projectile (green glowing ball)
- Projectile travels in an arc with gravity
- Visual trail follows the projectile

### 2. **Impact Detection**
When the projectile hits:
- **Enemy** - Direct collision with any enemy
- **Platform** - Collision with walls or ground

### 3. **Spray Cloud Creation**
On impact, a spray cloud is created:
- **Start radius**: 30 pixels
- **Max radius**: 100 pixels (expands over time)
- **Duration**: 0.8 seconds
- **Particles**: 25 animated particles spreading outward

### 4. **AoE Effect**
- All enemies within the expanding spray radius get "SKUNKED"
- Each spray cloud tracks which enemies it has hit (prevents double-hitting)
- Already skunked enemies are skipped
- Multiple enemies can be affected by a single shot

## Visual Feedback

### Spray Cloud
- Semi-transparent green expanding circle
- Particle effects radiating from impact point
- Particles fade as they disperse
- Uses additive blending for glow effect

### Enemy Hit Indicators
- **Green burst particles** at enemy location
- **"SKUNKED!" floating text** in green
- **Stunned animation** with green particles above enemy
- **Audio feedback** for each enemy hit

## Technical Implementation

### Player.js Changes

#### New Property
```javascript
this.skunkSprays = []; // Active spray clouds
```

#### New Method
```javascript
createSprayCloud(x, y) {
    // Creates expanding spray with particles
    // Duration: 0.8 seconds
    // Max radius: 100 pixels
}
```

#### Enhanced Method
```javascript
updateProjectiles(dt, level) {
    // Now updates both projectiles AND spray clouds
    // Creates spray on platform collision
    // Updates spray radius expansion
    // Updates spray particles
}

drawProjectiles(ctx, cameraX, cameraY) {
    // Now draws spray clouds first, then projectiles
    // Spray clouds show expanding AoE area
    // Particles use additive blending
}
```

### Game.js Changes

#### Collision System
```javascript
// Projectile collision - creates spray on hit
if (Utils.rectCollision(projRect, enemyRect)) {
    this.player.createSprayCloud(proj.x, proj.y);
    this.player.skunkProjectiles.splice(i, 1);
}

// Spray cloud collision - affects enemies in radius
if (distance <= spray.radius) {
    enemy.isSkunked = true;
    // Visual + audio feedback
}
```

## Gameplay Benefits

### Tactical Advantages
1. **Group Control** - One shot can disable multiple enemies
2. **Defensive Tool** - Create safe zones when surrounded
3. **Combo Potential** - Skunk groups then clean up with shadow strike
4. **Resource Efficiency** - More value per skunk powerup

### Strategic Considerations
- **Positioning matters** - Aim for enemy clusters
- **Platform use** - Spray on walls/ground creates area denial
- **Timing** - Wait for enemies to group before firing
- **Conservation** - Each shot now more valuable

## Testing

### In-Game Testing
1. Load the game (http://localhost:8000)
2. Collect a skunk powerup (green ammo icon)
3. Press **E** to fire skunk shot
4. Observe the green spray cloud on impact
5. Watch multiple enemies get skunked in the AoE

### Test Script
Run in browser console after starting a level:
```javascript
const script = document.createElement('script');
script.src = 'tools/test_spray_effect.js';
document.head.appendChild(script);
```

This will:
- Verify spray cloud system
- Give player ammo
- Spawn a cluster of test enemies
- Create a manual spray to demonstrate

## Configuration

### Tweakable Parameters

In `player.js` → `createSprayCloud()`:
```javascript
duration: 0.8,        // How long spray lasts
startRadius: 30,      // Initial spray size
maxRadius: 100,       // Maximum spray reach
particles: 25         // Number of particles
```

In `player.js` → `updateProjectiles()`:
```javascript
Config.GRAVITY * 0.15  // Projectile arc (lower = flatter)
```

Particle properties:
```javascript
lifetime: 0.6-1.0,    // Particle fade time
size: 3-8,            // Particle size
speed: 60-180         // Spread speed
```

## Performance Notes

- Spray clouds automatically clean up after duration expires
- Particles are culled when lifetime ends
- Only active spray clouds are checked for collisions
- Each spray tracks hit enemies to prevent redundant checks
- Maximum 25 particles per spray cloud

## Future Enhancements (Optional)

### Possible Improvements
1. **Damage falloff** - More damage near center, less at edges
2. **Stacking sprays** - Multiple sprays combine effects
3. **Element types** - Different spray colors/effects
4. **Upgrades** - Larger radius or longer duration pickups
5. **Chain reaction** - Skunked enemies create mini-sprays

### Balance Adjustments
- Reduce spray duration if too powerful
- Increase/decrease max radius for difficulty tuning
- Adjust skunk ammo drop rates
- Add spray cloud damage to balance stun + damage

## Compatibility

- Works with all enemy types (BASIC, FAST_BASIC, SECOND_BASIC, THIRD_BASIC, BOSS variants)
- Compatible with existing skunk stun mechanics
- Preserves original skunk powerup system
- No changes to item spawning or collection

## Visual Reference

```
Before (Single Target):
   Player → [Projectile] → Enemy ✓
                           Enemy X (missed)
                           Enemy X (missed)

After (Area Effect):
   Player → [Projectile] → ☁ SPRAY CLOUD ☁
                           ↓    ↓    ↓
                         Enemy ✓ Enemy ✓ Enemy ✓
```

The spray effect makes the skunk attack a powerful crowd control tool while maintaining the game's fast-paced action feel!
