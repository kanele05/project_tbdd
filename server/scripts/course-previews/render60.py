#!/usr/bin/env python3
"""Render original course-specific learning trailers with variable runtimes."""

from __future__ import annotations

import argparse
from functools import lru_cache
import json
import math
import re
import subprocess
import sys
import tempfile
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parents[2]
DEFAULT_MANIFEST = SCRIPT_DIR / 'manifest.json'
DEFAULT_FFMPEG = REPO_ROOT / 'notes/tools/video-runtime/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe'
FONT_ROOT = REPO_ROOT / 'mobile/node_modules/@expo-google-fonts'
FONT_DISPLAY = FONT_ROOT / 'playfair-display/600SemiBold/PlayfairDisplay_600SemiBold.ttf'
FONT_BODY = FONT_ROOT / 'be-vietnam-pro/400Regular/BeVietnamPro_400Regular.ttf'
FONT_BOLD = FONT_ROOT / 'be-vietnam-pro/700Bold/BeVietnamPro_700Bold.ttf'
FONT_BLACK = FONT_ROOT / 'be-vietnam-pro/900Black/BeVietnamPro_900Black.ttf'
FONT_MONO = Path('C:/Windows/Fonts/consola.ttf')

INK = (10, 16, 27)
PAPER = (239, 237, 226)
WHITE = (250, 249, 243)
CYAN = (82, 231, 239)
GOLD = (247, 195, 101)
VIOLET = (174, 142, 255)
ERROR = (255, 102, 124)
MUTED = (152, 170, 190)
PALE = (207, 218, 228)
FPS = 30
SCENE_COUNT = 12

PALETTES = {
    'code': ((10, 18, 32), CYAN, GOLD, VIOLET),
    'design': ((23, 20, 29), GOLD, (255, 123, 105), (194, 168, 255)),
    'business': ((14, 24, 33), (99, 229, 186), GOLD, CYAN),
    'language': ((18, 22, 35), GOLD, (255, 132, 105), (166, 191, 255)),
    'creative': ((26, 19, 30), (255, 147, 124), GOLD, VIOLET),
}


def clamp(value: float, low: float = 0, high: float = 1) -> float:
    return max(low, min(high, value))


def ease(value: float) -> float:
    value = clamp(value)
    return value * value * (3 - 2 * value)


def out_cubic(value: float) -> float:
    return 1 - (1 - clamp(value)) ** 3


@lru_cache(maxsize=256)
def font(size: int, face: str = 'body') -> ImageFont.FreeTypeFont:
    paths = {'display': FONT_DISPLAY, 'body': FONT_BODY, 'bold': FONT_BOLD, 'black': FONT_BLACK, 'mono': FONT_MONO}
    path = paths[face]
    if path.is_file():
        return ImageFont.truetype(str(path), max(9, size))
    fallbacks = [Path('C:/Windows/Fonts/arial.ttf'), Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')]
    fallback = next((candidate for candidate in fallbacks if candidate.is_file()), None)
    return ImageFont.truetype(str(fallback), max(9, size)) if fallback else ImageFont.load_default()


@lru_cache(maxsize=12)
def vignette(size: tuple[int, int]) -> Image.Image:
    width, height = size
    image = Image.new('L', size, 0)
    draw = ImageDraw.Draw(image)
    for ring in range(16):
        inset = int(ring * min(width, height) / 32)
        draw.rectangle((inset, inset, width - inset, height - inset), outline=min(220, ring * 14), width=max(1, height // 540))
    return image


def palette(course: dict) -> tuple[tuple[int, int, int], ...]:
    return PALETTES.get(course['category'].lower(), PALETTES['creative'])


def fitted(draw: ImageDraw.ImageDraw, value: str, maximum: int, size: int, face: str = 'black') -> ImageFont.FreeTypeFont:
    while size > 12 and draw.textbbox((0, 0), value, font=font(size, face))[2] > maximum:
        size -= 2
    return font(size, face)


def wrap_lines(draw: ImageDraw.ImageDraw, value: str, size: int, max_width: int, face: str = 'body') -> list[str]:
    words = value.split()
    lines: list[str] = []
    current = ''
    for word in words:
        candidate = f'{current} {word}'.strip()
        if current and draw.textbbox((0, 0), candidate, font=font(size, face))[2] > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines or ['']


def is_code_line(course: dict, value: str) -> bool:
    line = value.strip()
    if not line:
        return False
    if re.match(r'^(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|FROM|JOIN|WHERE|GROUP BY|ORDER BY)\b', line, re.IGNORECASE):
        return True
    if re.match(r'^(?:\$\s*)?(?:python3?|pip|npm|node|php|java)\b', line):
        return True
    if re.match(r'^(?:<\?php|<[/!?]?[a-zA-Z]|\{\s*["\'])', line):
        return True
    if re.fullmatch(r'[{}()[\],;]+', line) and str(course.get('category', '')).lower() == 'code':
        return True
    return bool(re.match(r'^(?:(?:async\s+)?(?:def|class|if|elif|else\s*:|for|while|try\s*:|except|finally\s*:|with|return|yield|import|from|const|let|var|function|public|private|static|void|int|String|boolean|echo|print)\b|[\w.$\[\]"\']+\s*(?:=|\+=|-=)|[\w.$]+\s*\()', line))


def frame_base(course: dict, scene_index: int, size: tuple[int, int], local: float, progress: float, beat: float) -> tuple[Image.Image, ImageDraw.ImageDraw, tuple]:
    width, height = size
    bg, accent, accent_two, accent_three = palette(course)
    phase = math.sin(local * .7 + scene_index * .41)
    base = tuple(int(clamp(channel + phase * 4, 0, 255)) for channel in bg)
    image = Image.new('RGB', size, base)
    shade = Image.new('RGB', size, (5, 9, 16))
    image = Image.composite(image, shade, vignette(size))
    draw = ImageDraw.Draw(image, 'RGBA')
    scale = min(width / 1920, height / 1080)
    draw.line((width * .055, height * .91, width * (.945), height * .91), fill=(125, 151, 171, 75), width=max(1, int(scale * 2)))
    draw.line((width * .055, height * .91, width * (.055 + .89 * progress), height * .91), fill=(*accent, 225), width=max(2, int(scale * (3 + beat * 3))))
    if scene_index not in (0, 11):
        draw.text((width * .055, height * .045), 'E-LEARNING  /  COURSE PREVIEW', font=font(int(17 * scale), 'bold'), fill=(*PALE, 210))
        draw.text((width * .945, height * .045), f'{scene_index + 1:02d} / 12', font=font(int(17 * scale), 'mono'), fill=(*accent, 240), anchor='ra')
        draw.line((width * .055, height * .085, width * .945, height * .085), fill=(180, 198, 214, 55), width=max(1, int(scale)))
    return image, draw, (accent, accent_two, accent_three, scale, beat)


def rounded(draw: ImageDraw.ImageDraw, box: tuple[float, float, float, float], radius: int, fill, outline=None, width: int = 1) -> None:
    draw.rounded_rectangle(tuple(int(value) for value in box), radius=max(1, radius), fill=fill, outline=outline, width=width)


def card_text(draw: ImageDraw.ImageDraw, value: str, x: float, y: float, max_width: int, size: int, fill, face='body', line_gap=1.34, limit=4) -> float:
    rows = wrap_lines(draw, value, size, max_width, face)[:limit]
    line_height = int(size * line_gap)
    for row_index, row in enumerate(rows):
        draw.text((x, y + row_index * line_height), row, font=font(size, face), fill=fill)
    return y + len(rows) * line_height


def draw_intro(image: Image.Image, draw: ImageDraw.ImageDraw, course: dict, scene: dict, size: tuple[int, int], local: float, colors: tuple, seconds: float) -> Image.Image:
    width, height = size
    accent, second, third, scale, beat = colors
    reveal = out_cubic(local / .72)
    draw.text((width * .075, height * .09), course['category'].upper() + '  /  ' + scene.get('title', 'START HERE').upper(), font=font(int(20 * scale), 'bold'), fill=(*accent, 230))
    title_font = fitted(draw, course['title'], int(width * .55), int(100 * scale * (.92 + .08 * reveal + .015 * beat)))
    draw.text((width * .075, height * .28), course['title'], font=title_font, fill=WHITE)
    hook = course.get('hook', scene['title'])
    card_text(draw, hook, width * .08, height * .48, int(width * .47), int(43 * scale), (*accent, 255), 'display', 1.2, 3)
    draw_visual(draw, course, scene, size, local, (width * .79, height * .61), scale, .68, seconds)
    first_line = scene.get('lines', [''])[0]
    if first_line:
        code_like = any(token in first_line for token in ('=', '(', ')', '->', 'def ', 'for ', 'if '))
        draw.text((width * .08, height * .75), first_line[:72], font=font(int(25 * scale), 'mono' if code_like else 'bold'), fill=(*PALE, 225))
    return image


def draw_outro(draw: ImageDraw.ImageDraw, course: dict, scene: dict, size: tuple[int, int], local: float, colors: tuple) -> None:
    width, height = size
    accent, second, third, scale, beat = colors
    cx, cy = width * .5, height * .30
    pulse = .88 + .09 * math.sin(local * math.tau * 2) + beat * .035
    for index in range(5):
        radius = (55 + index * 20) * scale * pulse
        draw.ellipse((cx - radius, cy - radius * .72, cx + radius, cy + radius * .72), outline=(*[accent, second, third][index % 3], 210 - index * 20), width=max(1, int(scale * 3)))
    draw.text((cx, height * .51), course['title'], font=fitted(draw, course['title'], int(width * .82), int(78 * scale)), fill=WHITE, anchor='mm')
    card_text(draw, course.get('hook', scene['title']), width * .13, height * .62, int(width * .74), int(29 * scale), (*accent, 255), 'body', 1.25, 2)
    lines = scene.get('lines', ['Explore the course'])
    detail = lines[0] if len(lines) > 1 else ''
    if detail:
        card_text(draw, detail, width * .15, height * .705, int(width * .70), int(19 * scale), (*PALE, 225), 'body', 1.15, 2)
    call = next((line for line in reversed(lines) if len(line.split()) <= 7), 'Explore the course')
    box = (width * .32, height * .81, width * .68, height * .88)
    rounded(draw, box, int(height * .025), (*accent, 245))
    draw.text((cx, height * .845), call.upper(), font=fitted(draw, call.upper(), int(width * .36), int(22 * scale), 'bold'), fill=INK, anchor='mm')


def code_rows(draw: ImageDraw.ImageDraw, lines: list[str], face: str, size: int, max_width: int) -> list[str]:
    rows = []
    for line in lines:
        if not line:
            rows.append('')
            continue
        current = ''
        for character in line:
            candidate = current + character
            if current and draw.textlength(candidate, font=font(size, face)) > max_width:
                rows.append(current)
                current = character
            else:
                current = candidate
        rows.append(current)
    return rows


def draw_code(draw: ImageDraw.ImageDraw, course: dict, scene: dict, size: tuple[int, int], local: float, x: float, y: float, width: float, height: float, scale: float, accent) -> None:
    lines = scene.get('lines', [])
    rounded(draw, (x, y, x + width, y + height), int(20 * scale), (8, 14, 24, 238), (110, 144, 171, 95), max(1, int(2 * scale)))
    dot_y = y + 24 * scale
    for index, color in enumerate((accent, GOLD, VIOLET)):
        radius = 5 * scale
        draw.ellipse((x + (22 + index * 20) * scale - radius, dot_y - radius, x + (22 + index * 20) * scale + radius, dot_y + radius), fill=(*color, 235))
    extension = {'python': 'py', 'javascript': 'js', 'php': 'php', 'java': 'java', 'sql': 'sql'}.get(course['slug'].split('-')[0], 'txt')
    draw.text((x + 95 * scale, dot_y), f'main.{extension}', font=font(int(15 * scale), 'mono'), fill=(*MUTED, 230), anchor='lm')
    code_size = max(20, int(31 * scale))
    line_height = int(code_size * 1.48)
    text_x = x + 72 * scale
    max_text_width = int(width - 100 * scale)
    rows = code_rows(draw, lines, 'mono', code_size, max_text_width)
    max_rows = max(1, int((height - 78 * scale) / line_height))
    while len(rows) > max_rows and code_size > max(15, int(20 * scale)):
        code_size -= 1
        line_height = int(code_size * 1.48)
        rows = code_rows(draw, lines, 'mono', code_size, max_text_width)
        max_rows = max(1, int((height - 78 * scale) / line_height))
    start_y = y + 58 * scale
    for index, value in enumerate(rows[:max_rows]):
        appeared = clamp((local * 1.55 - index * .34) / .38)
        if appeared <= 0:
            continue
        row_y = start_y + index * line_height
        if int(local * 2) % max(1, len(lines)) == index:
            rounded(draw, (x + 12 * scale, row_y - 3 * scale, x + width - 12 * scale, row_y + line_height - 4 * scale), int(5 * scale), (*accent, 24))
        draw.text((x + 24 * scale, row_y), f'{index + 1:02d}', font=font(int(17 * scale), 'mono'), fill=(*MUTED, 155))
        prefix = value[:max(1, int(len(value) * ease(appeared)))]
        ink = accent if any(token in value for token in ('def ', 'for ', 'if ', 'return ', 'import ')) else WHITE
        draw.text((text_x, row_y), prefix, font=font(code_size, 'mono'), fill=(*ink, 250))
        if appeared < 1 and int(local * 8) % 2 == 0:
            cursor_x = text_x + draw.textlength(prefix, font=font(code_size, 'mono'))
            draw.rectangle((cursor_x, row_y + 3 * scale, cursor_x + 12 * scale, row_y + line_height - 12 * scale), fill=(*GOLD, 240))


def draw_copy(draw: ImageDraw.ImageDraw, scene: dict, size: tuple[int, int], local: float, scale: float, x: float, y: float, max_width: int, accent, limit: int = 4) -> None:
    width, height = size
    heading_size = int(62 * scale)
    title = scene.get('title', '')
    heading = fitted(draw, title, max_width, heading_size, 'display')
    enter = out_cubic(local / .38)
    draw.text((x, y - (1 - enter) * 20 * scale), title, font=heading, fill=(*WHITE, int(255 * enter)))
    body_y = y + heading_size * 1.16
    for index, row in enumerate(scene.get('lines', [])[:limit]):
        reveal = ease((local - .45 - index * .38) / .3)
        if reveal <= 0:
            continue
        lines = wrap_lines(draw, row, int(31 * scale), max_width, 'mono' if any(mark in row for mark in ('=', '(', ')', '->', 'def ', 'for ', 'if ')) else 'body')
        face = 'mono' if len(lines) == 1 and any(mark in row for mark in ('=', '(', ')', '->', 'def ', 'for ', 'if ')) else 'body'
        color = accent if index == 0 else PALE
        draw.ellipse((x - 12 * scale, body_y + 8 * scale, x - 4 * scale, body_y + 16 * scale), fill=(*color, int(230 * reveal)))
        for sub_index, line in enumerate(lines):
            draw.text((x + reveal * 12 * scale, body_y + sub_index * 38 * scale), line, font=font(int(29 * scale), face), fill=(*color, int(245 * reveal)))
        body_y += max(56, len(lines) * 39 * scale + 16 * scale)


def visual_kind(course: dict, scene: dict) -> str:
    name = str(scene.get('visual', course.get('visual', 'flow'))).lower().replace('-', '').replace('_', '').replace(' ', '')
    category = str(course.get('category', '')).lower()
    if category == 'code' or any(word in name for word in ('python', 'javascript', 'php', 'java', 'sql', 'query', 'exception', 'debugger', 'function', 'variable', 'terminal', 'editor', 'dom', 'mysql', 'branchloop')):
        return 'code'
    if any(word in name for word in ('file', 'folder', 'organizer', 'organiser', 'dieline', 'carton', 'package', 'packaging')):
        return 'files' if any(word in name for word in ('file', 'folder', 'organizer', 'organiser')) else 'packaging'
    if any(word in name for word in ('portrait', 'face', 'skin', 'hair', 'profile')):
        return 'portrait'
    if any(word in name for word in ('wireframe', 'layout', 'grid', 'page', 'screen', 'navigation', 'responsive', 'breakpoint', 'prototype', 'component', 'site', 'htmlcss', 'inspector', 'mobileform', 'mobilefirst', 'phone', 'reflow')):
        return 'wireframe'
    if any(word in name for word in ('desk', 'workspace', 'ergonomic', 'lamp', 'cable', 'room', 'lighting')):
        return 'desk'
    if any(word in name for word in ('type', 'font', 'letterform', 'typography', 'leading', 'dynamic')):
        return 'typehierarchy'
    if any(word in name for word in ('poster', 'readingmeasure', 'readingdistance', 'headlinehierarchy')):
        return 'typehierarchy'
    if any(word in name for word in ('kanban', 'milestone', 'burndown', 'budget', 'gantt', 'workbreakdown', 'riskheatmap')):
        return 'kanban'
    if category in {'language', 'languages'} or any(word in name for word in ('english', 'spanish', 'dialogue', 'greeting', 'phrase', 'pronunciation', 'conversation', 'listening', 'speech', 'spoken', 'idiom', 'smalltalk', 'roleplay')):
        return 'language'
    if any(word in name for word in ('tessellation', 'pattern', 'motif', 'colorwheel', 'colourwheel', 'swatch', 'palette', 'hsv', 'negative', 'shape', 'collage', 'colorvision', 'contrastpalette', 'effectlayer', 'layerstack', 'materialtest', 'lightdarktoken')):
        return 'tessellation'
    if any(word in name for word in ('beforeafter', 'messageaudit', 'redesignreview', 'deliveryquality', 'exportsettings', 'imagecrop', 'cropandalt', 'iconimageaudit', 'insighttodecision', 'ideatopremise', 'designprinciples')):
        return 'researchboard'
    if any(word in name for word in ('observation', 'interview', 'affinity', 'evidence', 'annotation', 'critique', 'feedback', 'persona', 'participant', 'stakeholder', 'audiencesegment', 'briefcard')):
        return 'researchboard'
    if any(word in name for word in ('timeline', 'multitrack', 'waveform', 'edit', 'footage', 'cut', 'film', 'audio', 'shotsequence', 'roughcut')):
        return 'timeline'
    if any(word in name for word in ('chart', 'metric', 'campaign', 'abtest', 'funnel', 'marketing', 'channel', 'analytics', 'conversion', 'calendar', 'audiencechannelsignal', 'emailfunnel')):
        return 'marketingchart'
    if any(word in name for word in ('paint', 'artwork', 'canvas', 'sketch', 'brush', 'watercolor', 'mixedmedia', 'illustration')):
        return 'painting'
    if any(word in name for word in ('designprinciplescta', 'poster')):
        return 'typehierarchy'
    if any(word in name for word in ('finishedart', 'artcta')):
        return 'painting'
    if any(word in name for word in ('writing', 'story', 'copy', 'headline', 'draft', 'email', 'reader', 'revision', 'essay')):
        return 'writing'
    if any(word in name for word in ('flow', 'journey', 'map', 'path', 'process', 'loop', 'sequence', 'iteration', 'relationship', 'handoff', 'research', 'clearpath', 'frictionpoint')):
        return 'journey'
    if any(word in name for word in ('color', 'colour', 'contrast', 'alignment', 'hierarchy', 'composition', 'sketch', 'study', 'board', 'canvas', 'plan', 'matrix', 'specimen')):
        return 'tessellation' if category == 'design' else 'researchboard'
    return 'kanban' if category in {'business', 'management'} else 'flow'


def draw_visual(draw: ImageDraw.ImageDraw, course: dict, scene: dict, size: tuple[int, int], local: float, center: tuple[float, float], scale: float, strength: float, seconds: float) -> None:
    width, height = size
    cx, cy = center
    accent, second, third = palette(course)[1:]
    visual_id = str(scene.get('visual', '')).lower().replace('-', '').replace('_', '').replace(' ', '')
    visual = visual_kind(course, scene)
    if visual == 'wireframe':
        strength = max(strength, .86)
    beat = math.exp(-((seconds % .5) / .5) * 15)
    entrance = .76 + .24 * out_cubic(local / .7)
    orbit = local * (1.0 + beat * .08)
    radius = min(width, height) * .31 * entrance * strength

    if visual == 'code':
        if 'variable' in visual_id:
            found = re.findall(r'\b(?:str|int|bool|float|string|number|boolean|const|let|var)\b', ' '.join(scene.get('lines', [])), re.IGNORECASE)
            kinds = list(dict.fromkeys(found[:3])) or ['NAME', 'TYPE', 'VALUE']
            for index, kind in enumerate(kinds):
                x = cx - radius * .8 + index * radius * .78
                y = cy + math.sin(orbit + index) * radius * .18
                rounded(draw, (x, y - radius * .3, x + radius * .66, y + radius * .3), int(10 * scale), (*[accent, second, third][index], 42), (*[accent, second, third][index], 220), max(1, int(2 * scale)))
                draw.text((x + radius * .08, y - radius * .16), kind, font=font(int(15 * scale), 'mono'), fill=(*[accent, second, third][index], 245))
                draw.text((x + radius * .08, y + radius * .06), ('name', 'type', 'value')[index], font=font(int(15 * scale), 'mono'), fill=(*WHITE, 240))
        elif 'inputoutput' in visual_id or 'requesttoresponse' in visual_id:
            for index, (name, color) in enumerate((('INPUT', accent), ('OUTPUT', second))):
                x = cx - radius * .92 + index * radius * 1.13
                y = cy + math.sin(orbit + index) * radius * .12
                rounded(draw, (x, y - radius * .28, x + radius * .78, y + radius * .28), int(13 * scale), (*color, 38), (*color, 230), max(1, int(3 * scale)))
                draw.text((x + radius * .08, y), name, font=font(int(17 * scale), 'bold'), fill=(*color, 250), anchor='lm')
            draw.line((cx - radius * .1, cy, cx + radius * .04, cy), fill=(*WHITE, 230), width=max(2, int(4 * scale)))
            draw.polygon([(cx + radius * .09, cy), (cx, cy - 9 * scale), (cx, cy + 9 * scale)], fill=(*WHITE, 230))
        elif 'branch' in visual_id or 'controlflow' in visual_id:
            diamond = [(cx, cy - radius * .42), (cx + radius * .45, cy), (cx, cy + radius * .42), (cx - radius * .45, cy)]
            draw.polygon(diamond, fill=(*accent, 48), outline=(*accent, 235), width=max(2, int(3 * scale)))
            draw.text((cx, cy), 'IF?', font=font(int(17 * scale), 'bold'), fill=(*WHITE, 250), anchor='mm')
            for sign, label in ((-1, 'YES'), (1, 'NO')):
                end_x, end_y = cx + sign * radius * .9, cy + radius * .6
                draw.line((cx + sign * radius * .28, cy + radius * .28, end_x, end_y), fill=(*[accent, second][sign > 0], 230), width=max(2, int(3 * scale)))
                draw.ellipse((end_x - 8 * scale, end_y - 8 * scale, end_x + 8 * scale, end_y + 8 * scale), fill=(*[accent, second][sign > 0], 240))
                draw.text((end_x, end_y + 19 * scale), label, font=font(int(13 * scale), 'bold'), fill=(*PALE, 235), anchor='mm')
        elif 'loop' in visual_id or 'iteration' in visual_id:
            points = []
            for index in range(5):
                x = cx - radius * .8 + index * radius * .4
                y = cy + math.sin(orbit + index * .8) * radius * .22
                points.append((x, y))
                color = accent if index == int(local * 2) % 5 else second
                rounded(draw, (x - 18 * scale, y - 20 * scale, x + 18 * scale, y + 20 * scale), int(5 * scale), (*color, 225))
            draw.line(points, fill=(*accent, 155), width=max(2, int(3 * scale)), joint='curve')
            draw.arc((cx - radius * .9, cy - radius * .42, cx + radius * .9, cy + radius * .42), 185, 350, fill=(*WHITE, 205), width=max(2, int(3 * scale)))
        elif 'function' in visual_id or 'method' in visual_id:
            boxes = [(cx - radius * .9, cy - radius * .2, 'INPUT'), (cx - radius * .24, cy - radius * .4, 'CALL'), (cx + radius * .44, cy - radius * .2, 'RETURN')]
            for index, (x, y, label) in enumerate(boxes):
                rounded(draw, (x, y, x + radius * .48, y + radius * .38), int(8 * scale), (*[accent, second, third][index], 45), (*[accent, second, third][index], 220), max(1, int(2 * scale)))
                draw.text((x + radius * .24, y + radius * .19), label, font=font(int(13 * scale), 'bold'), fill=(*WHITE, 250), anchor='mm')
                if index < 2:
                    draw.line((x + radius * .48, y + radius * .19, x + radius * .68, y + radius * .19), fill=(*WHITE, 210), width=max(2, int(2 * scale)))
        elif 'listdictionary' in visual_id or 'datastructure' in visual_id or 'list' in visual_id:
            for index in range(4):
                x = cx - radius * .92 + index * radius * .43
                y = cy + math.sin(orbit + index) * radius * .1
                rounded(draw, (x, y - radius * .21, x + radius * .37, y + radius * .21), int(5 * scale), (*accent, 35), (*accent, 220), max(1, int(2 * scale)))
                draw.text((x + radius * .18, y), str(index), font=font(int(14 * scale), 'mono'), fill=(*WHITE, 235), anchor='mm')
            rounded(draw, (cx - radius * .3, cy + radius * .38, cx + radius * .9, cy + radius * .77), int(6 * scale), (*second, 38), (*second, 210), max(1, int(2 * scale)))
            draw.text((cx - radius * .2, cy + radius * .5), 'key  →  value', font=font(int(13 * scale), 'mono'), fill=(*WHITE, 240))
        elif 'exception' in visual_id or 'debug' in visual_id:
            for index, value in enumerate(('ERROR', 'CAUSE', 'SOURCE LINE', 'FIX → RETRY')):
                y = cy - radius * .48 + index * radius * .28
                color = (ERROR, second, ERROR, accent)[index]
                draw.text((cx - radius * .75, y), value, font=font(int(15 * scale), 'mono'), fill=(*color, 245))
                draw.line((cx - radius * .78, y + 20 * scale, cx + radius * .78, y + 20 * scale), fill=(*color, 80), width=max(1, int(scale)))
        else:
            for index in range(5):
                y = cy + (index - 2) * 35 * scale
                draw.line((cx - radius, y, cx + radius, y), fill=(*accent, 60 + index * 12), width=max(1, int(2 * scale)))
            prompt = '$ run program'
            draw.text((cx - radius, cy), prompt, font=font(int(25 * scale), 'mono'), fill=(*accent, 250))
            draw.polygon([(cx + radius * .68, cy - 10 * scale), (cx + radius * .68, cy + 10 * scale), (cx + radius * .83, cy)], fill=(*second, 240))
    elif visual in {'files', 'fileorganizer', 'fileorg'}:
        folder_x, folder_y = cx - radius * .55, cy - radius * .36
        rounded(draw, (folder_x, folder_y, folder_x + radius * 1.1, folder_y + radius * .77), int(15 * scale), (*accent, 38), (*accent, 210), max(2, int(3 * scale)))
        draw.rectangle((folder_x, folder_y - 18 * scale, folder_x + radius * .4, folder_y + 2 * scale), fill=(*accent, 205))
        for index in range(4):
            angle = orbit + index * math.tau / 4
            x = cx + math.cos(angle) * radius * .83
            y = cy + math.sin(angle) * radius * .58
            color = (accent, second, third, GOLD)[index]
            extensions = re.findall(r'\.(pdf|txt|csv|png|jpe?g|docx?|mp3|mp4|zip)\b', ' '.join(scene.get('lines', [])), re.IGNORECASE)
            labels = [item.upper() for item in extensions[:4]] or ['IN', 'MOVE', 'DONE', 'SKIP']
            rounded(draw, (x - 34 * scale, y - 39 * scale, x + 34 * scale, y + 39 * scale), int(8 * scale), (*color, 225))
            draw.text((x, y), labels[index % len(labels)], font=fitted(draw, labels[index % len(labels)], int(60 * scale), int(12 * scale), 'bold'), fill=INK, anchor='mm')
            draw.line((x, y, cx, cy), fill=(*color, 125), width=max(1, int(2 * scale)))
    elif visual == 'kanban':
        column_width = radius * .53
        for column in range(3):
            left = cx - radius + column * column_width
            rounded(draw, (left, cy - radius * .65, left + column_width * .88, cy + radius * .68), int(10 * scale), (255, 255, 255, 16), (155, 177, 199, 105), max(1, int(scale)))
            draw.text((left + column_width * .12, cy - radius * .49), ('TO DO', 'IN PROGRESS', 'DONE')[column], font=font(int(10 * scale), 'bold'), fill=(*[accent, second, third][column], 235))
        for index in range(6):
            column = min(2, int((index * .57 + local * .1) % 3))
            left = cx - radius + column * column_width
            row = (index // 3) % 2
            top = cy - radius * .25 + row * radius * .48
            card_color = (accent, second, third)[index % 3]
            rounded(draw, (left + column_width * .1, top, left + column_width * .77, top + radius * .28), int(6 * scale), (*card_color, 190))
            draw.line((left + column_width * .18, top + radius * .1, left + column_width * .64, top + radius * .1), fill=(*WHITE, 210), width=max(1, int(2 * scale)))
    elif visual in {'flow', 'journey', 'process'}:
        count = 5
        nodes = []
        for index in range(count):
            x = cx + (index - (count - 1) / 2) * radius * .48
            y = cy + math.sin(orbit + index * .8) * radius * .3
            nodes.append((x, y))
        draw.line(nodes, fill=(*accent, 180), width=max(2, int(4 * scale)), joint='curve')
        for index, (x, y) in enumerate(nodes):
            r = (19 + beat * 8) * scale
            draw.ellipse((x - r, y - r, x + r, y + r), fill=(*[accent, second, third][index % 3], 245), outline=(*WHITE, 230), width=max(1, int(2 * scale)))
            draw.text((x, y + r * 1.7), f'{index + 1:02d}', font=font(int(15 * scale), 'mono'), fill=(*PALE, 235), anchor='mm')
    elif visual == 'researchboard':
        source = scene.get('lines', []) or [scene.get('title', '')]
        for index in range(4):
            x = cx - radius * .9 + (index % 2) * radius * .95
            y = cy - radius * .48 + (index // 2) * radius * .72 + math.sin(orbit + index) * 8 * scale
            color = (accent, second, third, GOLD)[index]
            rounded(draw, (x, y, x + radius * .84, y + radius * .55), int(8 * scale), (*color, 35), (*color, 185), max(1, int(2 * scale)))
            content = source[index % len(source)]
            short = ' '.join(content.split()[:5])
            lines = wrap_lines(draw, short, int(13 * scale), int(radius * .7), 'bold')[:2]
            for row, line in enumerate(lines):
                draw.text((x + 9 * scale, y + 10 * scale + row * 18 * scale), line, font=font(int(13 * scale), 'bold'), fill=(*WHITE, 235))
    elif visual == 'wireframe':
        compact = any(word in visual_id for word in ('responsive', 'mobile', 'phone', 'reflow'))
        desktop_w, desktop_h = radius * (1.55 if compact else 1.72), radius * 1.18
        desktop_x, desktop_y = cx - desktop_w * .58, cy - desktop_h * .53
        rounded(draw, (desktop_x, desktop_y, desktop_x + desktop_w, desktop_y + desktop_h), int(12 * scale), (13, 21, 33, 248), (*PALE, 190), max(1, int(2 * scale)))
        draw.rounded_rectangle((desktop_x, desktop_y, desktop_x + desktop_w, desktop_y + desktop_h * .14), radius=max(1, int(10 * scale)), fill=(34, 45, 60, 245))
        for dot_index, color in enumerate((ERROR, GOLD, accent)):
            dot = 5 * scale
            dot_x = desktop_x + (17 + dot_index * 17) * scale
            dot_y = desktop_y + desktop_h * .07
            draw.ellipse((dot_x - dot, dot_y - dot, dot_x + dot, dot_y + dot), fill=(*color, 240))
        content_x = desktop_x + desktop_w * .09
        content_y = desktop_y + desktop_h * .23
        content_w = desktop_w * .82
        draw.rounded_rectangle((content_x, content_y, content_x + content_w, content_y + desktop_h * .09), radius=max(1, int(4 * scale)), fill=(*second, 220))
        hero_y = content_y + desktop_h * .14
        hero_h = desktop_h * .31
        draw.rectangle((content_x, hero_y, content_x + content_w * .54, hero_y + hero_h), fill=(*third, 200))
        copy_x = content_x + content_w * .61
        draw.line((copy_x, hero_y + desktop_h * .07, content_x + content_w, hero_y + desktop_h * .07), fill=(*WHITE, 230), width=max(2, int(4 * scale)))
        draw.line((copy_x, hero_y + desktop_h * .15, copy_x + content_w * .25, hero_y + desktop_h * .15), fill=(*PALE, 195), width=max(2, int(3 * scale)))
        button_w, button_h = desktop_w * .18, desktop_h * .09
        button_y = hero_y + desktop_h * .21
        rounded(draw, (copy_x, button_y, copy_x + button_w, button_y + button_h), int(5 * scale), (*accent, 240))
        card_y = content_y + desktop_h * .53
        card_w = content_w * .29
        for card_index in range(3):
            card_x = content_x + card_index * content_w * .34
            rounded(draw, (card_x, card_y, card_x + card_w, card_y + desktop_h * .23), int(4 * scale), (255, 255, 255, 18), (*PALE, 125), max(1, int(scale)))
            draw.rectangle((card_x + 5 * scale, card_y + 5 * scale, card_x + card_w - 5 * scale, card_y + desktop_h * .11), fill=(*third, 150))
            draw.line((card_x + 8 * scale, card_y + desktop_h * .16, card_x + card_w * .72, card_y + desktop_h * .16), fill=(*second, 205), width=max(1, int(3 * scale)))
        if compact:
            phone_w, phone_h = radius * .52, radius * 1.06
            phone_x, phone_y = desktop_x + desktop_w * .88, desktop_y + desktop_h * .23
            rounded(draw, (phone_x, phone_y, phone_x + phone_w, phone_y + phone_h), int(15 * scale), (8, 14, 24, 250), (*WHITE, 225), max(1, int(3 * scale)))
            inner_x, inner_y = phone_x + phone_w * .13, phone_y + phone_h * .12
            inner_w = phone_w * .74
            draw.rectangle((inner_x, inner_y, inner_x + inner_w, inner_y + phone_h * .23), fill=(*third, 220))
            for row in range(3):
                row_y = inner_y + phone_h * (.43 + row * .15)
                rounded(draw, (inner_x, row_y, inner_x + inner_w, row_y + phone_h * .09), int(3 * scale), (*[accent, second, PALE][row], 210))
    elif visual in {'grid', 'tessellation', 'designboard'}:
        if visual == 'tessellation':
            step = radius * .34
            for row in range(-2, 3):
                for col in range(-3, 4):
                    x = cx + col * step + (row % 2) * step / 2
                    y = cy + row * step * .72
                    sway = math.sin(orbit + col * .7 + row) * step * .1
                    points = [(x - step / 2, y + sway), (x + step / 2, y - sway), (x, y + step * .62)]
                    color = (accent, second, third)[(row + col) % 3]
                    draw.polygon(points, fill=(*color, 55 + int(beat * 65)), outline=(*color, 205))
        else:
            rows = 7
            for row in range(rows):
                points = []
                for col in range(9):
                    x = cx - radius + col * radius / 4
                    y = cy - radius * .58 + row * radius / 5 + math.sin(col * .7 + row * .4 + orbit) * 11 * scale
                    points.append((x, y))
                draw.line(points, fill=(*accent, 95 + row * 10), width=max(1, int(2 * scale)))
                for x, y in points:
                    draw.ellipse((x - 3 * scale, y - 3 * scale, x + 3 * scale, y + 3 * scale), fill=(*second, 230))
    elif visual in {'portrait', 'face'}:
        face_r = radius * .55
        draw.ellipse((cx - face_r, cy - face_r * 1.18, cx + face_r, cy + face_r * 1.18), fill=(*second, 230), outline=(*WHITE, 230), width=max(1, int(3 * scale)))
        draw.arc((cx - face_r * .8, cy - face_r * .75, cx + face_r * .8, cy + face_r * .95), 195, 345, fill=(*accent, 255), width=max(2, int(5 * scale)))
        eye_y = cy - face_r * .12
        for side in (-1, 1):
            ex = cx + side * face_r * .33
            draw.ellipse((ex - 5 * scale, eye_y - 6 * scale, ex + 5 * scale, eye_y + 6 * scale), fill=INK)
        draw.arc((cx - face_r * .4, cy + face_r * .13, cx + face_r * .4, cy + face_r * .62), 15, 165, fill=INK, width=max(2, int(3 * scale)))
    elif visual in {'desk', 'workspace', 'workspace'}:
        desk_y = cy + radius * .35
        draw.line((cx - radius, desk_y, cx + radius, desk_y), fill=(*second, 240), width=max(4, int(8 * scale)))
        rounded(draw, (cx - radius * .45, desk_y - radius * .65, cx + radius * .35, desk_y - 5 * scale), int(10 * scale), (*accent, 205), (*WHITE, 180), max(1, int(2 * scale)))
        draw.line((cx + radius * .58, desk_y, cx + radius * .58, desk_y - radius * .72), fill=(*third, 235), width=max(3, int(6 * scale)))
        draw.arc((cx + radius * .28, desk_y - radius * .92, cx + radius * .88, desk_y - radius * .38), 180, 350, fill=(*third, 235), width=max(3, int(6 * scale)))
        draw.polygon([(cx - radius * .9, desk_y), (cx - radius * .72, desk_y - radius * .55), (cx - radius * .58, desk_y)], fill=(*accent, 205))
    elif visual in {'packaging', 'box'}:
        lift = math.sin(orbit) * radius * .12
        top = [(cx, cy - radius * .55 + lift), (cx + radius * .55, cy - radius * .25 + lift), (cx, cy + radius * .05 + lift), (cx - radius * .55, cy - radius * .25 + lift)]
        left = [top[3], top[2], (cx, cy + radius * .66 + lift), (cx - radius * .55, cy + radius * .34 + lift)]
        right = [top[2], top[1], (cx + radius * .55, cy + radius * .34 + lift), (cx, cy + radius * .66 + lift)]
        draw.polygon(left, fill=(*accent, 235), outline=(*WHITE, 210))
        draw.polygon(right, fill=(*second, 235), outline=(*WHITE, 210))
        draw.polygon(top, fill=(*third, 240), outline=(*WHITE, 220))
        draw.line((cx, cy - radius * .54 + lift, cx, cy + radius * .66 + lift), fill=(*WHITE, 195), width=max(1, int(2 * scale)))
    elif visual in {'painting', 'sketch', 'creative'}:
        for index in range(12):
            phase = orbit + index * .45
            points = [(cx + math.sin(phase + step * .12) * radius * .78, cy + (step - 16) * radius * .035 + math.cos(phase + step * .08) * radius * .18) for step in range(32)]
            color = (accent, second, third)[index % 3]
            draw.line(points, fill=(*color, 65 + index * 10), width=max(1, int((2 + index % 4) * scale)), joint='curve')
    elif visual in {'typehierarchy', 'typography', 'type'}:
        for index, text_value in enumerate(('Aa', 'Ab', 'Ag', 'Ay')):
            size_px = int((70 - index * 12) * scale * (.96 + .04 * math.sin(orbit + index)))
            draw.text((cx - radius * .8, cy - radius * .53 + index * radius * .32), text_value, font=font(size_px, 'display'), fill=(*[accent, second, third][index % 3], 240))
    elif visual in {'marketingchart', 'chart', 'analytics'}:
        baseline = cy + radius * .48
        for index in range(9):
            x = cx - radius * .82 + index * radius * .2
            bar_h = radius * (.22 + .55 * (.5 + .5 * math.sin(index * .81 + orbit * .8)))
            draw.rounded_rectangle((x, baseline - bar_h, x + radius * .11, baseline), radius=max(1, int(5 * scale)), fill=(*[accent, second, third][index % 3], 210))
        trend = [(cx - radius * .85 + index * radius * .21, baseline - radius * (.18 + index * .07) - math.sin(orbit + index) * 8 * scale) for index in range(9)]
        draw.line(trend, fill=(*WHITE, 215), width=max(2, int(3 * scale)))
    elif visual in {'writing', 'page', 'notes'}:
        rounded(draw, (cx - radius * .62, cy - radius * .7, cx + radius * .62, cy + radius * .7), int(12 * scale), (244, 239, 221, 240))
        for index in range(7):
            line_y = cy - radius * .42 + index * radius * .14
            line_w = radius * (.8 if index % 3 else .52) * ease((local * 2 + index * .15) % 1)
            draw.line((cx - radius * .42, line_y, cx - radius * .42 + line_w, line_y), fill=(*[accent, second, third][index % 3], 225), width=max(2, int(3 * scale)))
    elif visual in {'timeline', 'video', 'editing'}:
        for row in range(4):
            y = cy - radius * .55 + row * radius * .36
            draw.line((cx - radius, y, cx + radius, y), fill=(*MUTED, 115), width=max(1, int(2 * scale)))
            for block in range(3):
                x = cx - radius * .9 + ((block * .63 + row * .35 + local * .18) % 1.8) * radius
                rounded(draw, (x, y - radius * .11, min(cx + radius, x + radius * (.32 + row * .04)), y + radius * .11), int(6 * scale), (*[accent, second, third][row % 3], 190))
        draw.line((cx - radius, cy - radius * .7, cx - radius + (local / 5) * radius * 2, cy - radius * .7), fill=(*WHITE, 235), width=max(2, int(3 * scale)))
    elif visual in {'language', 'english', 'speech', 'conversation'}:
        for index in range(3):
            x = cx + math.cos(orbit + index * math.tau / 3) * radius * .42
            y = cy + math.sin(orbit + index * math.tau / 3) * radius * .38
            box = (x - radius * .39, y - radius * .2, x + radius * .39, y + radius * .2)
            rounded(draw, box, int(18 * scale), (*[accent, second, third][index], 220))
            phrases = scene.get('lines', []) or [scene.get('title', '')]
            phrase = ' '.join(phrases[index % len(phrases)].split(':', 1)[-1].strip().split()[:5])
            phrase_rows = wrap_lines(draw, phrase, int(18 * scale), int(radius * .69), 'bold')[:3]
            draw.multiline_text((x, y), '\n'.join(phrase_rows), font=font(int(18 * scale), 'bold'), fill=INK, anchor='mm', align='center', spacing=max(1, int(2 * scale)))
    else:
        for index in range(8):
            angle = orbit + index * math.tau / 8
            x, y = cx + math.cos(angle) * radius * .73, cy + math.sin(angle) * radius * .5
            dot = (8 + beat * 8) * scale
            draw.ellipse((x - dot, y - dot, x + dot, y + dot), fill=(*[accent, second, third][index % 3], 230))


def scene_clock(course: dict, seconds: float) -> tuple[int, float, float]:
    elapsed = 0.0
    for index, scene in enumerate(course['scenes']):
        duration = float(scene['durationSec'])
        if seconds < elapsed + duration or index == len(course['scenes']) - 1:
            phase = clamp((seconds - elapsed) / duration)
            return index, phase * 5, elapsed
        elapsed += duration
    return len(course['scenes']) - 1, 5, elapsed


def frame(course: dict, seconds: float, size: tuple[int, int]) -> Image.Image:
    scene_index, local, elapsed = scene_clock(course, seconds)
    scenes = course['scenes']
    scene = scenes[scene_index]
    progress = (elapsed + local / 5 * scene['durationSec']) / course['durationSec']
    beat = math.exp(-((seconds % .5) / .5) * 15)
    image, draw, colors = frame_base(course, scene_index, size, local, progress, beat)
    accent, second, third, scale, beat = colors
    width, height = size

    if scene_index == 0:
        image = draw_intro(image, draw, course, scene, size, local, colors, seconds)
    elif scene_index == 11:
        draw_outro(draw, course, scene, size, local, colors)
    else:
        visual = visual_kind(course, scene)
        code_lines = [line for line in scene.get('lines', []) if is_code_line(course, line)]
        prose_lines = [line for line in scene.get('lines', []) if not is_code_line(course, line)]
        if code_lines:
            panel_x, panel_w = width * .055, width * .59
            code_size = max(20, int(31 * scale))
            text_width = int(panel_w - 100 * scale)
            rows = code_rows(draw, code_lines, 'mono', code_size, text_width)
            line_height = int(code_size * 1.48)
            panel_h = min(height * .70, max(height * .19, 78 * scale + len(rows) * line_height + 22 * scale))
            panel_y = max(height * .18, min(height * .30, (height * .82 - panel_h) / 2))
            draw_code(draw, course, {**scene, 'lines': code_lines}, size, local, panel_x, panel_y, panel_w, panel_h, scale, accent)
            draw_copy(draw, {**scene, 'lines': prose_lines}, size, local, scale, width * .68, height * .19, int(width * .27), accent, 3)
            draw_visual(draw, course, scene, size, local, (width * .82, height * .73), scale, .52, seconds)
        else:
            draw_copy(draw, scene, size, local, scale, width * .07, height * .16, int(width * .44), accent, 4)
            draw_visual(draw, course, scene, size, local, (width * .77, height * .56), scale, .68, seconds)

    if scene_index not in (0, 11):
        scene_title = scene.get('title', '')
        draw.text((width * .055, height * .12), scene_title.upper(), font=fitted(draw, scene_title.upper(), int(width * .84), int(18 * scale), 'bold'), fill=(*accent, 220))
    transition = min(out_cubic(local / .20), out_cubic((5 - local) / .20))
    if transition < .99:
        image = Image.blend(Image.new('RGB', size, (3, 6, 12)), image, transition)
    return image


def make_audio(path: Path, duration_sec: float, course: dict) -> None:
    sample_rate = 48000
    count = round(sample_rate * duration_sec)
    times = np.arange(count, dtype=np.float32) / sample_rate
    beat = .5
    phase = np.mod(times, beat)
    beat_index = np.floor(times / beat).astype(np.int32)
    kick_env = np.exp(-phase * 19)
    kick = np.sin(2 * np.pi * (46 * times - 10 * kick_env / (2 * np.pi))) * kick_env * (beat_index % 4 != 3)
    snare_phase = np.mod(times - beat, beat * 2)
    snare_env = np.exp(-np.maximum(snare_phase, 0) * 23) * (snare_phase < .19)
    rng = np.random.default_rng(2608)
    noise = rng.standard_normal(count).astype(np.float32)
    snare = noise * snare_env * .20 + np.sin(2 * np.pi * 190 * times) * snare_env * .16
    hats = noise * np.exp(-phase * 72) * .11 * (beat_index % 2 == 1)
    bass_notes = np.array([55, 55, 65.41, 73.42, 49, 65.41, 55, 82.41], dtype=np.float32)
    bass = np.sin(2 * np.pi * bass_notes[(beat_index // 4) % len(bass_notes)] * times) * .14
    arp_steps = np.array([0, 7, 12, 19, 12, 7, 4, 11], dtype=np.float32)
    arp_phase = np.mod(times, beat / 2)
    arp_hz = 220 * 2 ** (arp_steps[(beat_index * 2) % len(arp_steps)] / 12)
    arp = np.sin(2 * np.pi * arp_hz * times) * np.exp(-arp_phase * 7) * .08
    hit = np.zeros(count, dtype=np.float32)
    scene_start = 0.0
    for scene in course['scenes']:
        scene_start += float(scene['durationSec'])
        start = scene_start - .85
        mask = (times >= start) & (times < scene_start)
        local = times[mask] - start
        hit[mask] = np.sin(2 * np.pi * (145 + 720 * local ** 2) * local) * local * .10
    mix = np.tanh((kick * .38 + snare + hats + bass + arp + hit) * 1.55) * .74
    mix *= np.minimum(1, times / 1.25) * np.minimum(1, (duration_sec - times) / 2)
    stereo = np.stack((mix, mix * .97 + np.roll(arp, 17) * .025), axis=1)
    pcm = np.int16(np.clip(stereo, -1, 1) * 32767)
    with wave.open(str(path), 'wb') as output:
        output.setnchannels(2)
        output.setsampwidth(2)
        output.setframerate(sample_rate)
        output.writeframes(pcm.tobytes())


def validate_manifest(data: dict) -> None:
    if data.get('version') != 2:
        raise ValueError('Expected a version 2 manifest.')
    if data.get('fps', FPS) != FPS:
        raise ValueError('Manifest profile must use 30 fps.')
    courses = data.get('courses')
    if not isinstance(courses, list) or not courses:
        raise ValueError('Manifest must contain a non-empty courses list.')
    for course in courses:
        for key in ('slug', 'title', 'category', 'topics', 'hook', 'durationSec', 'scenes'):
            if key not in course:
                raise ValueError(f"Course is missing required field '{key}'.")
        if len(course['scenes']) != SCENE_COUNT:
            raise ValueError(f"{course['slug']} must contain exactly 12 scenes.")
        scene_total = 0.0
        for index, scene in enumerate(course['scenes']):
            if not isinstance(scene.get('title'), str) or not isinstance(scene.get('lines'), list) or not isinstance(scene.get('visual'), str) or not isinstance(scene.get('durationSec'), (int, float)):
                raise ValueError(f"{course['slug']} scene {index + 1} needs title, lines, visual, and durationSec fields.")
            if scene['durationSec'] <= 0:
                raise ValueError(f"{course['slug']} scene {index + 1} must have a positive duration.")
            if not all(isinstance(line, str) for line in scene['lines']):
                raise ValueError(f"{course['slug']} scene {index + 1} lines must be strings.")
            scene_total += scene['durationSec']
        if not 55 <= course['durationSec'] <= 95:
            raise ValueError(f"{course['slug']} durationSec must be between 55 and 95 seconds.")
        if abs(scene_total - course['durationSec']) > .05:
            raise ValueError(f"{course['slug']} durationSec must equal the sum of its scene durations.")


def encode_video(course: dict, output: Path, ffmpeg: str, size: tuple[int, int], fps: int) -> None:
    width, height = size
    duration = float(course['durationSec'])
    frame_count = round(duration * fps)
    command = [ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s:v', f'{width}x{height}', '-r', str(fps), '-i', '-', '-an', '-c:v', 'libx264', '-threads', '2', '-preset', 'veryfast', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-t', str(duration), str(output)]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    try:
        for index in range(frame_count):
            rendered = frame(course, index / fps, size)
            if process.stdin is None:
                raise RuntimeError('ffmpeg video input pipe is unavailable.')
            process.stdin.write(rendered.tobytes())
        process.stdin.close()
        error_output = process.stderr.read() if process.stderr else b''
        code = process.wait()
        if code:
            raise RuntimeError(f'ffmpeg video encode failed ({code}): {error_output.decode(errors="replace")[-2500:]}')
    except BaseException:
        process.kill()
        process.wait()
        raise


def render_course(course: dict, args: argparse.Namespace, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output = output_dir / f"{course['slug']}-v2.mp4"
    with tempfile.TemporaryDirectory(prefix='course-preview-60-') as temporary:
        silent = Path(temporary) / 'silent.mp4'
        audio = Path(temporary) / 'music.wav'
        encode_video(course, silent, args.ffmpeg, (args.width, args.height), args.fps)
        duration = float(course['durationSec'])
        make_audio(audio, duration, course)
        command = [args.ffmpeg, '-y', '-hide_banner', '-loglevel', 'error', '-i', str(silent), '-i', str(audio), '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-t', str(duration), '-movflags', '+faststart', str(output)]
        result = subprocess.run(command, capture_output=True, text=True)
        if result.returncode:
            output.unlink(missing_ok=True)
            raise RuntimeError(f'ffmpeg mux failed ({result.returncode}): {result.stderr[-2500:]}')
    return output


def render_samples(course: dict, args: argparse.Namespace, output_dir: Path) -> list[Path]:
    sample_dir = output_dir / f"{course['slug']}-samples"
    sample_dir.mkdir(parents=True, exist_ok=True)
    if args.frame_times:
        moments = [float(item.strip()) for item in args.frame_times.split(',') if item.strip()]
    else:
        starts = np.cumsum([0, *[scene['durationSec'] for scene in course['scenes']]])
        moments = [float(starts[index] + course['scenes'][index]['durationSec'] * .46) for index in range(SCENE_COUNT)]
    rendered: list[tuple[float, Image.Image]] = []
    paths = []
    for seconds in moments:
        if not 0 <= seconds < course['durationSec']:
            raise ValueError(f"Sample time is outside this course's timeline: {seconds}.")
        image = frame(course, seconds, (args.width, args.height))
        path = sample_dir / f'frame-{seconds:05.2f}s.png'
        image.save(path)
        paths.append(path)
        rendered.append((seconds, image))
    if args.contact_sheet and rendered:
        thumb_width = min(480, args.width)
        thumb_height = round(thumb_width * args.height / args.width)
        columns = min(3, len(rendered))
        rows = math.ceil(len(rendered) / columns)
        sheet = Image.new('RGB', (columns * thumb_width, rows * (thumb_height + 32)), PAPER)
        draw = ImageDraw.Draw(sheet)
        for index, (seconds, image) in enumerate(rendered):
            x = index % columns * thumb_width
            y = index // columns * (thumb_height + 32)
            sheet.paste(image.resize((thumb_width, thumb_height), Image.Resampling.LANCZOS), (x, y))
            draw.text((x + 10, y + thumb_height + 5), f'{seconds:05.2f}s', font=font(17, 'bold'), fill=INK)
        sheet.save(sample_dir / 'contact-sheet.jpg', quality=92)
    return paths


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Render course trailers from manifest v2 with per-course scene timing.')
    parser.add_argument('--manifest', default=str(DEFAULT_MANIFEST))
    parser.add_argument('--ffmpeg', default=str(DEFAULT_FFMPEG))
    parser.add_argument('--output', default=str(REPO_ROOT / 'server/static/previews'))
    parser.add_argument('--slug', help='Render one course; omit to render every manifest course.')
    parser.add_argument('--width', type=int, default=1280)
    parser.add_argument('--height', type=int, default=720)
    parser.add_argument('--fps', type=int, default=FPS)
    parser.add_argument('--samples', action='store_true', help='Write scene PNGs instead of encoding an MP4.')
    parser.add_argument('--frame-times', help='Comma-separated times in seconds; implies --samples.')
    parser.add_argument('--contact-sheet', action='store_true')
    args = parser.parse_args()
    if args.width < 320 or args.height < 180 or args.fps < 1:
        parser.error('width >= 320, height >= 180, and fps >= 1 are required.')
    if args.frame_times:
        args.samples = True
    return args


def main() -> int:
    args = parse_args()
    try:
        manifest_path = Path(args.manifest).expanduser().resolve()
        data = json.loads(manifest_path.read_text(encoding='utf-8'))
        validate_manifest(data)
        courses = data['courses']
        if args.slug:
            courses = [course for course in courses if course['slug'] == args.slug]
            if not courses:
                raise ValueError(f"Course slug '{args.slug}' was not found in the manifest.")
        if not args.samples and not Path(args.ffmpeg).is_file():
            raise FileNotFoundError(f'ffmpeg executable not found: {args.ffmpeg}')
        output_dir = Path(args.output).expanduser().resolve()
        for course in courses:
            if args.samples:
                paths = render_samples(course, args, output_dir)
                print(f"Rendered {len(paths)} frames for {course['slug']}.")
            else:
                path = render_course(course, args, output_dir)
                print(f'Rendered {path}')
    except (BrokenPipeError, OSError, RuntimeError, ValueError, json.JSONDecodeError, KeyError) as error:
        print(f'Error: {error}', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
