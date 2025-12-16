#!/usr/bin/env python3
from pathlib import Path
from datetime import datetime
src_dir=Path('assets/sprites/characters')
backup_dir=Path('toolshed/backups')/(datetime.now().strftime('%Y%m%d_%H%M%S'))
backup_dir.mkdir(parents=True, exist_ok=True)
count=0
for p in src_dir.glob('*.bak'):
    new=backup_dir/p.name
    p.rename(new)
    print('moved',p,'->',new)
    count+=1
print('done, moved',count,'files to',backup_dir)
