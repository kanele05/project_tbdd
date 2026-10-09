#!/usr/bin/env python3
"""Render original, category-specific course trailer animations with Pillow and ffmpeg."""
import argparse
from functools import lru_cache
import json
import math
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

REPO_ROOT = Path(__file__).resolve().parents[3]
MANIFEST = Path(__file__).with_name('manifest.json')
BG = (9, 14, 23)
PAPER = (236, 232, 221)
CYAN = (46, 242, 255)
GOLD = (222, 185, 116)
MUTED = (135, 151, 169)


@lru_cache(maxsize=32)
def font(font_dir, size, display=False):
    candidates = []
    if font_dir:
        candidates += list(Path(font_dir).glob('*.ttf')) + list(Path(font_dir).glob('*.otf'))
    else:
        font_root = REPO_ROOT / 'mobile' / 'node_modules' / '@expo-google-fonts'
        default_fonts = [
            font_root / 'playfair-display' / '600SemiBold' / 'PlayfairDisplay_600SemiBold.ttf',
            font_root / 'be-vietnam-pro' / '400Regular' / 'BeVietnamPro_400Regular.ttf',
            font_root / 'be-vietnam-pro' / '700Bold' / 'BeVietnamPro_700Bold.ttf',
        ]
        candidates += [path for path in default_fonts if path.is_file()]
    preferred = ('Playfair', 'Georgia') if display else ('BeVietnam', 'DejaVuSans')
    for name in preferred:
        match = next((p for p in candidates if name.lower() in p.name.lower()), None)
        if match:
            return ImageFont.truetype(str(match), size)
    if candidates:
        return ImageFont.truetype(str(candidates[0]), size)
    for path in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 'C:/Windows/Fonts/arial.ttf']:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def wrapped(draw, text, fnt, width):
    words, lines, line = text.split(), [], ''
    for word in words:
        candidate = f'{line} {word}'.strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] > width and line:
            lines.append(line)
            line = word
        else:
            line = candidate
    if line:
        lines.append(line)
    return lines


def frame(course, t, font_dir):
    image = Image.new('RGB', (1280, 720), BG)
    d = ImageDraw.Draw(image)
    f_title, f_body, f_small = font(font_dir, 55, True), font(font_dir, 26), font(font_dir, 19)
    d.rectangle((48, 42, 1232, 678), outline=(34, 49, 65), width=2)
    d.text((82, 66), 'E-LEARNING  /  COURSE PREVIEW', font=f_small, fill=CYAN)
    d.text((82, 618), f'{course["category"].upper()}   •   {course["slug"].upper()}', font=f_small, fill=MUTED)
    phase = min(3, int(t / 4.5))
    phase_t = max(0.0, min(1.0, (t - phase * 4.5) / 4.5))
    if phase == 0:
        title_font = font(font_dir, 52, True)
        for index, line in enumerate(wrapped(d, course['title'], title_font, 1050)[:2]):
            d.text((82, 175 + index * 66), line, font=title_font, fill=PAPER)
        message = course.get('hook', f"What changes when you learn {course['topics'][0].lower()}")
        for index, line in enumerate(wrapped(d, message, font(font_dir, 34), 1000)[:2]):
            d.text((84, 400 + index * 44), line, font=font(font_dir, 34), fill=CYAN)
        reveal = ease(phase_t)
        for i in range(6):
            x = 850 + i * 45
            y = 560 - int(reveal * (i + 1) * 29)
            d.line((x, 560, x, y), fill=(50, 81, 98), width=3)
            d.ellipse((x - 6, y - 6, x + 6, y + 6), fill=CYAN if i % 2 == 0 else GOLD)
    elif phase == 1:
        title_font = font(font_dir, 42, True)
        d.text((82, 120), course['title'], font=title_font, fill=PAPER)
        for index, line in enumerate(wrapped(d, course['topics'][1], f_body, 1080)[:2]):
            d.text((84, 185 + index * 34), line, font=f_body, fill=MUTED)
        draw_visual(d, course, phase_t, font_dir)
    elif phase == 2:
        d.text((82, 130), 'THREE IDEAS TO TAKE WITH YOU', font=f_small, fill=GOLD)
        for i, topic in enumerate(course['topics']):
            y = 220 + i * 108
            d.text((90, y), f'0{i + 1}', font=f_body, fill=CYAN)
            d.line((160, y + 22, 230, y + 22), fill=GOLD, width=2)
            d.text((260, y), topic, font=f_body, fill=PAPER)
            d.rounded_rectangle((1035, y + 2, 1085, y + 32), radius=10, outline=CYAN, width=2)
    else:
        title_font = font(font_dir, 52, True)
        title_lines = wrapped(d, course['title'], title_font, 1000)[:2]
        title_y = 180 if len(title_lines) == 1 else 150
        for index, line in enumerate(title_lines):
            d.text((82, title_y + index * 62), line, font=title_font, fill=PAPER)
        prompt_y = title_y + len(title_lines) * 62 + 22
        d.text((84, prompt_y), 'Learn by making something real.', font=f_body, fill=CYAN)
        reveal = ease(phase_t)
        button_y = prompt_y + 75
        d.rounded_rectangle((84, button_y, 84 + int(310 * reveal), button_y + 60), radius=25, fill=CYAN)
        if reveal > 0.8:
            d.text((115, button_y + 19), 'EXPLORE THE COURSE', font=f_small, fill=BG)
        d.text((84, button_y + 115), 'A guided course preview', font=f_small, fill=MUTED)
    progress = (t % 4.5) / 4.5
    d.rectangle((82, 658, 1198, 662), fill=(32, 45, 59))
    d.rectangle((82, 658, 82 + int(1116 * progress), 662), fill=CYAN)
    return image


def ease(value):
    return value * value * (3 - 2 * value)


@lru_cache(maxsize=4)
def mono_font(font_dir, size):
    if font_dir:
        for file_name in ('CascadiaMono.ttf', 'DejaVuSansMono.ttf', 'consola.ttf'):
            candidate = Path(font_dir) / file_name
            if candidate.is_file():
                return ImageFont.truetype(str(candidate), size)
    for file_name in ('C:/Windows/Fonts/consola.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'):
        try:
            return ImageFont.truetype(file_name, size)
        except OSError:
            continue
    return font(font_dir, size)


def draw_visual(d, course, phase_t, font_dir):
    kind = course['visual']
    reveal = ease(phase_t)
    t = phase_t * 4.5
    if kind == 'portrait':
        d.ellipse((470, 300, 825, 610), fill=(30, 44, 56), outline=GOLD, width=3)
        face_bottom = 340 + int(reveal * 245)
        d.ellipse((535, 325, 760, face_bottom), fill=(186, 132, 105))
        d.pieslice((520, 285, 775, 495), 180, 360, fill=(34, 31, 39))
        if reveal > .35:
            d.ellipse((588, 415, 612, 428), fill=BG)
            d.ellipse((688, 415, 712, 428), fill=BG)
        if reveal > .6:
            d.arc((610, 428, 692, 500), 10, 160, fill=BG, width=4)
        d.arc((490, 305, 805, 595), 200, 200 + int(250 * reveal), fill=CYAN, width=4)
    elif kind == 'desk':
        d.line((280, 485, 280 + int(730 * reveal), 485), fill=GOLD, width=8)
        d.rectangle((355, 500, 380, 585), fill=(55, 70, 81))
        d.rectangle((900, 500, 925, 585), fill=(55, 70, 81))
        if reveal > .15:
            d.rounded_rectangle((475, 345, 810, 470), radius=12, fill=(22, 39, 52), outline=CYAN, width=3)
            d.rectangle((620, 470, 660, 485), fill=GOLD)
        if reveal > .45:
            d.polygon([(820, 480), (860, 360), (900, 480)], fill=(49, 87, 71))
            d.ellipse((850, 330, 910, 390), fill=(70, 117, 83))
        if reveal > .7:
            d.rectangle((285, 435, 430, 480), fill=(58, 42, 33))
    elif kind == 'typehierarchy':
        d.text((210, 295), 'Aa', font=font(font_dir, 152, True), fill=CYAN)
        d.text((500, 300), 'TYPE / SCALE', font=font(None, 27), fill=GOLD)
        for i, size in enumerate((58, 42, 30, 22)):
            y = 355 + i * 55
            if reveal * 4 > i:
                d.text((500, y), 'Design with intention', font=font(font_dir, size, i == 0), fill=PAPER if i < 2 else MUTED)
            d.line((500, y + size + 5, 1060, y + size + 5), fill=(35, 54, 70), width=1)
    elif kind == 'tessellation':
        for row in range(5):
            for col in range(9):
                x = 260 + col * 82 + (row % 2) * 41
                y = 305 + row * 55
                phase = (row + col + int(t * 3)) % 3
                color = (CYAN, GOLD, (93, 160, 139))[phase]
                d.polygon([(x, y - 27), (x + 40, y), (x, y + 27), (x - 40, y)], outline=color, fill=(18, 35, 47))
                d.ellipse((x - 8, y - 8, x + 8, y + 8), fill=color)
        return
    if kind in ('python', 'sql', 'php', 'java', 'javascript'):
        d.rounded_rectangle((180, 280, 1100, 565), radius=18, fill=(15, 25, 36), outline=(47, 68, 84), width=2)
        snippets = {
            'python': ['name = "Ada"', 'score = 98', 'print(f"Hello, {name}!")', 'Hello, Ada!'],
            'sql': ['SELECT name, score', 'FROM learners', 'WHERE score >= 90;', 'Ada  |  98'],
            'php': ['$name = "Ada";', 'if ($active) {', '  echo "Hello, $name";', 'Hello, Ada'],
            'java': ['class Main {', '  public static void main(String[] args) {', '    System.out.println("Hello, Ada");', 'Hello, Ada!'],
            'javascript': ['const button = document.querySelector("#start");', 'button.addEventListener("click", () => {', '  document.body.classList.toggle("active");', 'DOM state: active'],
        }[kind]
        code_font = mono_font(font_dir, 22)
        typed_count = int(reveal * sum(len(line) for line in snippets))
        for i, line in enumerate(snippets):
            yy = 310 + i * 52
            visible = min(len(line), max(0, typed_count - sum(len(item) for item in snippets[:i])))
            if visible:
                color = (120, 210, 153) if i == len(snippets) - 1 else (CYAN if i == 0 else PAPER)
                d.text((220, yy), line[:visible], fill=color, font=code_font)
        cursor_x = 220 + min(850, typed_count * 13)
        d.rectangle((cursor_x, 512, cursor_x + 3, 540), fill=GOLD)
    elif kind in ('wireframe', 'journey'):
        for i in range(4):
            x = 185 + i * 240
            d.rounded_rectangle((x, 300, x + 175, 535), radius=12, outline=CYAN if i == int(t) % 4 else (65, 83, 99), width=3)
            d.rectangle((x + 18, 326, x + 155, 353), fill=(27, 48, 62))
            for j in range(3):
                d.rounded_rectangle((x + 18, 374 + j * 42, x + 150, 389 + j * 42), radius=5, fill=(42, 58, 72))
            d.ellipse((x + 70, 465, x + 100, 495), fill=GOLD if i == 2 else (37, 62, 77))
            if i < 3:
                d.line((x + 175, 420, x + 240, 420), fill=CYAN, width=3)
    elif kind == 'packaging':
        left, top = 280, 345
        d.line((left, top, 950, top), fill=CYAN, width=4)
        d.line((left, top + 190, 950, top + 190), fill=CYAN, width=4)
        for x in (left, left + 155, left + 355, left + 510, left + 710):
            d.line((x, top, x, top + 190), fill=GOLD, width=3)
        d.polygon([(left, top + 18), (left - 75, top + 48), (left - 75, top + 145), (left, top + 175)], outline=CYAN)
        for x in (left + 155, left + 355, left + 510, left + 710):
            d.line((x, top, x, top + int(190 * reveal)), fill=GOLD, width=3)
        d.text((left + 185, top + 75), 'FRONT PANEL', font=font(font_dir, 19), fill=PAPER)
    elif kind in ('painting', 'designboard'):
        for i, col in enumerate([CYAN, GOLD, (224, 109, 100), (93, 160, 139), (150, 131, 204)]):
            angle = t * 20 + i * 72
            x = 450 + math.cos(math.radians(angle)) * 220
            y = 420 + math.sin(math.radians(angle)) * 95
            d.ellipse((x - 65, y - 65, x + 65, y + 65), fill=col)
    elif kind == 'kanban':
        columns = [('TO DO', ['Scope', 'Stakeholders']), ('IN PROGRESS', ['Milestone 1', 'Plan review']), ('DONE', ['Kickoff'])]
        for col, (label, cards) in enumerate(columns):
            x = 225 + col * 280
            d.rounded_rectangle((x, 305, x + 245, 560), radius=12, fill=(17, 29, 41), outline=(55, 76, 93), width=2)
            d.text((x + 16, 323), label, font=font(font_dir, 17), fill=CYAN if col == 1 else GOLD)
            for row, card in enumerate(cards):
                card_y = 370 + row * 75 - (int(reveal * 26) if col == 1 and row == 0 else 0)
                d.rounded_rectangle((x + 14, card_y, x + 225, card_y + 53), radius=7, fill=(32, 47, 61))
                d.text((x + 25, card_y + 15), card, font=font(font_dir, 18), fill=PAPER)
    elif kind == 'marketingchart':
        d.line((250, 570, 1050, 570), fill=MUTED, width=2)
        vals = [95, 145, 115, 220, 190, 300, 270, 385]
        pts = []
        for i, value in enumerate(vals):
            x, y = 280 + i * 100, 570 - value * .62
            pts.append((x, y))
        visible = max(2, int(1 + reveal * (len(pts) - 1)))
        d.line(pts[:visible], fill=GOLD, width=5)
        for x, y in pts[:visible]:
            d.ellipse((x - 8, y - 8, x + 8, y + 8), fill=CYAN)
        d.line((250, 570, 250, 300), fill=MUTED, width=2)
    elif kind == 'writing':
        d.rounded_rectangle((210, 300, 1070, 565), radius=12, fill=(17, 27, 39), outline=(55, 76, 93), width=2)
        draft = 'The first line opened a door.\nMara stepped into the morning light,\ncarrying one question she could not ignore.'
        chars = int(reveal * len(draft))
        visible = draft[:chars]
        for index, line in enumerate(visible.split('\n')):
            d.text((260, 345 + index * 56), line, font=font(font_dir, 25), fill=CYAN if index == 0 else PAPER)
        d.line((260, 520, 260 + min(730, chars * 12), 520), fill=GOLD, width=3)
        cursor = 260 + min(740, len(visible.split('\n')[-1]) * 14)
        d.rectangle((cursor, 475, cursor + 3, 507), fill=CYAN)
    elif kind == 'timeline':
        for i in range(5):
            x = 175 + i * 198
            d.rectangle((x, 330, x + 160, 465), outline=GOLD if i % 2 else CYAN, width=3)
            d.polygon([(x + 20, 440), (x + 65, 365 + (i % 2) * 35), (x + 140, 440)], fill=(27, 50 + i * 5, 66))
        d.rectangle((180, 500, 1080, 516), fill=(29, 45, 59))
        d.rectangle((180, 500, 180 + int(900 * ((t % 4) / 4)), 516), fill=CYAN)
    elif kind == 'english':
        d.rounded_rectangle((210, 310, 1070, 540), radius=28, outline=CYAN, width=3)
        d.text((280, 370), 'Hello!', font=font(font_dir, 62, True), fill=GOLD)
        d.text((620, 370), 'How are you?', font=font(font_dir, 42), fill=PAPER)
        d.arc((845, 330, 940, 400), 190, 350, fill=CYAN, width=4)
        d.arc((845, 355, 940, 425), 10, 170, fill=CYAN, width=4)
        d.ellipse((885, 425, 905, 445), fill=GOLD)
        for i in range(8):
            x = 300 + i * 88
            width = 12 + int(24 * (0.5 + 0.5 * math.sin(t * 4 + i)))
            d.rounded_rectangle((x, 490 - width, x + 52, 490 + width), radius=8, fill=CYAN if i == int(t * 2) % 8 else (30, 49, 64))
    else:
        d.rounded_rectangle((210, 310, 1070, 540), radius=28, outline=CYAN, width=3)
        d.text((280, 370), 'Hola', font=font(font_dir, 62, True), fill=GOLD)
        d.text((620, 370), 'Hello', font=font(font_dir, 62), fill=PAPER)
        for i in range(8):
            x = 300 + i * 88
            width = 12 + int(24 * (0.5 + 0.5 * math.sin(t * 4 + i)))
            d.rounded_rectangle((x, 490 - width, x + 52, 490 + width), radius=8, fill=CYAN if i == int(t * 2) % 8 else (30, 49, 64))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--ffmpeg', required=True, help='Path to ffmpeg executable')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--slug')
    parser.add_argument('--font-dir')
    args = parser.parse_args()
    manifest = json.loads(MANIFEST.read_text(encoding='utf-8'))
    courses = manifest['courses']
    if args.slug:
        courses = [course for course in courses if course['slug'] == args.slug]
        if not courses:
            parser.error(f'Unknown course slug: {args.slug}')
    args.output.mkdir(parents=True, exist_ok=True)
    for course in courses:
        output = args.output / f"{course['slug']}-v1.mp4"
        command = [args.ffmpeg, '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', '1280x720', '-r', '24', '-i', '-', '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000', '-t', '18', '-c:v', 'libx264', '-profile:v', 'baseline', '-level', '3.1', '-pix_fmt', 'yuv420p', '-preset', 'fast', '-crf', '21', '-c:a', 'aac', '-b:a', '96k', '-shortest', '-movflags', '+faststart', str(output)]
        process = subprocess.Popen(command, stdin=subprocess.PIPE)
        try:
            for index in range(18 * 24):
                rgb = np.asarray(frame(course, index / 24, args.font_dir), dtype=np.uint8)
                process.stdin.write(rgb.tobytes())
        finally:
            process.stdin.close()
        if process.wait() != 0:
            raise SystemExit(f'ffmpeg failed for {course["slug"]}')
        print(f"Rendered {course['slug']} -> {output}", flush=True)


if __name__ == '__main__':
    main()
