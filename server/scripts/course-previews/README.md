# Course preview trailers

`manifest.json` version 2 is the source of truth for the 30 actual courses. Each trailer has 12 course-specific scenes: a 4-second hook, ten curriculum or project scenes with per-scene timing, and a 4-second CTA. Course `durationSec` must equal the sum of its scene durations; total runtime varies with how much time its content needs, generally 55–85 seconds. `topics` lists the complete course curriculum; when the trailer selects representative topics, its mini-project scenes show the applied work. Scene text and visual instructions are specific to each course. The videos use original procedural graphics, typography, motion and generated music, with no stock footage or third-party audio.

## Requirements

- Python with Pillow and NumPy
- An ffmpeg executable with H.264 and AAC support
- The renderer uses the Noir Playfair Display and Be Vietnam Pro TTF files from `mobile/node_modules/@expo-google-fonts` when available; installed DejaVu Sans or Arial are fallbacks.

## Render one course

```powershell
$python = 'C:\path\to\python.exe'
$ffmpeg = 'C:\path\to\ffmpeg.exe'
& $python server/scripts/course-previews/render60.py --ffmpeg $ffmpeg --output server/static/previews --slug python-introduction
```

## Render all 30 courses

```powershell
& $python server/scripts/course-previews/render60.py --ffmpeg $ffmpeg --output server/static/previews
```

Each output is `<slug>-v2.mp4`, 1280×720 at 30 fps using the renderer defaults; duration is the per-course sum in the manifest. The production batch may explicitly pass `--width 1280 --height 720 --fps 30`. The renderer encodes H.264 with `libx264`, `yuv420p`, and AAC stereo generated music, then writes a fast-start MP4. No Baseline profile is forced by the renderer. Newton's `render60.py` consumes this v2 scene contract. The 18-second `render.py` is a prior sample renderer only; do not use it to generate v2 course assets.

The supplied font files are consumed from the existing npm packages at render time, not copied into this source directory. Their SIL Open Font License terms are provided by those packages.

`server/prisma/seed-data/coursePreviews.ts` maps each validated slug to `/static/previews/<slug>-v2.mp4` and its actual runtime. Catalog seed uses this mapping for the first two preview lessons only.
