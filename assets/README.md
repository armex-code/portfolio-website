# Assets

Files the main page (`index.html`) expects. Paths are referenced as-is.

| Path | What | Notes |
| --- | --- | --- |
| `assets/resume.pdf` | Résumé | Linked from the nav, hero and footer. Missing = 404. |
| `assets/media/vr-arm.mp4` + `vr-arm-poster.webp` | Card R-01 loop | 720p, muted, < 3 MB |
| `assets/media/omni-platform.mp4` + poster | Card R-02 loop | |
| `assets/media/lidar-rig.webp` (or .mp4) | Card R-03 | screenshot or loop |
| `assets/media/vex-snake.mp4` + poster | Card R-04 loop | |

Each card in `index.html` has an `ASSET PLACEHOLDER` comment with a ready-to-paste
`<video>`/`<img>` snippet. Give videos the `data-autoplay` attribute and
`preload="none"`: `js/site.js` plays them only while on screen and skips them
for visitors with reduced motion enabled.

Encode loops small, e.g.:

    ffmpeg -i in.mov -vf scale=-2:720 -an -c:v libx264 -crf 28 -preset slow -movflags +faststart out.mp4
