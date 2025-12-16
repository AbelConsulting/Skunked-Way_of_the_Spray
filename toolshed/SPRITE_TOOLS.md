Sprite Helper Tools
===================

This folder contains utilities to help with sprite asset management.

Usage:

- Generate placeholder backgrounds and tiles:
- Fix sprite sheet widths (pad to integer frame widths): `fix_spritesheets.py` - pads known sprite sheets so sheet width is a multiple of their expected frame count (use `--backup` to keep originals).

  ```sh
  python toolshed/generate_backgrounds.py
  ```

- Run a non-destructive optimization pass (writes `*.opt.png` files):

  ```sh
  python toolshed/optimize_sprites.py
  ```

- Overwrite originals (careful — keep backups or use Git):

  ```sh
  python toolshed/optimize_sprites.py --inplace
  ```

Notes:
- `optimize_sprites.py` will use `pngquant`/`optipng` if available on PATH, otherwise it will fall back to Pillow-based quantization.
- Placeholder backgrounds are not final art; replace them with production assets when ready.
