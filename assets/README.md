# Assets

Drop files at these paths and they appear on the site automatically: no HTML
edits needed. Until a file exists, its slot shows a grey placeholder.

Use `.webp` (or rename the paths in `index.html` if you prefer `.jpg`).

| Path | Where it shows | Suggested size |
| --- | --- | --- |
| `assets/resume.pdf` | Nav, hero and footer résumé links | |
| `assets/media/<project>/cover.webp` | Banner panel (grey until hovered) | 1200×1500, portrait |
| `assets/media/<project>/1.webp` … `4.webp` | Project popup gallery | 1600×900 (16:9) |
| `assets/media/workshop/1.webp` … `6.webp` | "From the workshop" mosaic (W1 is the large one) | 1600×1000 |

`<project>` is one of: `vr-arm`, `omni-manipulator`, `lidar-rig`, `competition`.
Gallery captions are the `data-caption` values on each thumbnail in `index.html`.

Shrink photos before committing, e.g. `cwebp -q 78 -resize 1600 0 in.jpg -o 1.webp`.
