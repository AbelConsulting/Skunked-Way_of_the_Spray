from PIL import Image
files = [
 'assets/sprites/characters/ninja_idle.png',
 'assets/sprites/characters/ninja_walk.png',
 'assets/sprites/characters/ninja_jump.png',
 'assets/sprites/characters/ninja_attack.png',
 'assets/sprites/characters/ninja_shadow_strike.png',
 'assets/sprites/characters/ninja_hurt.png'
]
for f in files:
    try:
        im = Image.open(f)
        print(f, im.size)
    except Exception as e:
        print('ERR', f, e)
