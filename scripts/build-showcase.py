"""Turns the owner's originals in "creative showcase/" into web-ready files.

    python scripts/build-showcase.py [--ffmpeg PATH] [--ffmpeg-frames PATH] [--skip-video]

Reads   creative showcase/        (git-ignored originals: mp4, pdf, jpg/heic)
Writes  public/showcase/**        (committed: compressed mp4 + poster, webp pages, webp photos)
        src/content/showcaseMedia.json  (sizes and durations, read by the site)

Needs PyMuPDF (fitz) and Pillow, plus ffmpeg for the videos: one build with
libx264 to compress, and one that can write a PNG frame for the posters (on
this machine those are two different cut-down builds, hence two options). The
outputs are committed, so the site itself builds without Python or ffmpeg.
Which original becomes which piece is the table below; titles and captions
live in src/content/site.ts, not here.
"""
import argparse
import io
import json
import shutil
import subprocess
from pathlib import Path

import fitz
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "creative showcase"
OUT = ROOT / "public" / "showcase"
INDEX = ROOT / "src" / "content" / "showcaseMedia.json"

VIDEOS = {
    # id: (original file, target height, frames per second, quality: lower is better, filter applied first)
    "showreel": ("main video - Video Editing Showreel.mp4", 720, 30, 25, None),
    "process": ("third video ((short film on process of creation)).mp4", 720, 30, 26, None),
    # This one was exported lying on its side in a 720x1280 frame; it is turned upright (a quarter turn anticlockwise).
    "udaipur": ("fast paced udaipur edit - fast video.mp4", 720, 25, 24, "transpose=2"),
}
DESIGNS = {
    # The first and third originals carry each other's names: the file called "hyderabadi bbq..." is the
    # explainable-AI research poster, and the one called "poster made w a friend cs research" is the
    # Smoke House (Hyderabadi BBQ food box) identity. They are filed here by what they contain.
    "xai-poster": "hyderabadi bbq food box poster.pdf",
    "nothing-3a": "nothing 3a CE Draft.pdf",
    "smoke-house": "poster made w a friend cs research.pdf",
}
PHOTOS = {
    "burns-and-melts": "burns and melts until it doesnt.jpg",
    "butter-aint-flying": "butter aint flying",
    "blue-clue": "got any blue clue",
    "sip": "sip.heic",
}


def find(prefix: str) -> Path:
    """Originals have long names; match on how they start."""
    matches = sorted(p for p in SRC.iterdir() if p.name.startswith(prefix))
    if not matches:
        raise SystemExit(f'no original starting with "{prefix}" in {SRC}')
    return matches[0]


def save_webp(image: Image.Image, path: Path, width: int, quality: int = 82) -> dict:
    if image.width > width:
        image = image.resize((width, round(image.height * width / image.width)), Image.LANCZOS)
    path.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGB").save(path, "WEBP", quality=quality, method=6)
    return {"src": "/" + path.relative_to(ROOT / "public").as_posix(), "width": image.width, "height": image.height}


def build_designs() -> dict:
    out = {}
    for name, file in DESIGNS.items():
        doc = fitz.open(find(file))
        pages = []
        for number, page in enumerate(doc, start=1):
            # Render at about 1800 px on the long side, then let save_webp settle the width.
            zoom = 1800 / max(page.rect.width, page.rect.height)
            pixmap = page.get_pixmap(matrix=fitz.Matrix(zoom, zoom), alpha=False)
            image = Image.open(io.BytesIO(pixmap.tobytes("png")))
            width = 1600 if image.width >= image.height else 1100
            pages.append(save_webp(image, OUT / "design" / f"{name}-{number}.webp", width))
        out[name] = {"pages": pages}
        print(f"design {name}: {len(pages)} page(s)")
    return out


def build_photos() -> dict:
    out = {}
    for name, file in PHOTOS.items():
        image = Image.open(find(file))
        out[name] = {
            "full": save_webp(image, OUT / "photo" / f"{name}.webp", 1170, 84),
            "thumb": save_webp(image, OUT / "photo" / f"{name}-thumb.webp", 600, 80),
        }
        print(f"photo {name}")
    return out


def probe(ffmpeg: str, path: Path) -> dict:
    """Width, height and duration, read from ffmpeg's own banner (no ffprobe needed)."""
    text = subprocess.run([ffmpeg, "-hide_banner", "-i", str(path)], capture_output=True, text=True, errors="replace").stderr
    info = {}
    for line in text.splitlines():
        line = line.strip()
        if line.startswith("Duration:"):
            h, m, s = line.split(",")[0].split()[1].split(":")
            info["seconds"] = round(int(h) * 3600 + int(m) * 60 + float(s), 1)
        if "Video: h264" in line and "width" not in info:
            for part in line.split(","):
                part = part.strip().split(" ")[0]
                if "x" in part and part.replace("x", "").isdigit():
                    info["width"], info["height"] = (int(v) for v in part.split("x"))
    return info


def build_videos(ffmpeg: str, ffmpeg_frames: str) -> dict:
    out = {}
    (OUT / "video").mkdir(parents=True, exist_ok=True)
    for name, (file, height, fps, crf, first) in VIDEOS.items():
        source = find(file)
        target = OUT / "video" / f"{name}.mp4"
        # Compressing takes minutes; an up-to-date result is kept.
        fresh = target.exists() and target.stat().st_size > 0 and target.stat().st_mtime >= source.stat().st_mtime
        if not fresh:
            turned = None
            if first:
                # The compressing build has no filters beyond scale, so the other build applies this one first,
                # into a high-bitrate intermediate that is deleted afterwards.
                turned = OUT / "video" / f"{name}-turned.mp4"
                subprocess.run(
                    [
                        ffmpeg_frames, "-y", "-hide_banner", "-loglevel", "error", "-i", str(source),
                        "-vf", first, "-c:v", "h264_mf", "-b:v", "12M", "-c:a", "copy", str(turned),
                    ],
                    check=True,
                )
            subprocess.run(
                [
                    ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(turned or source),
                    "-map", "0:v:0", "-map", "0:a:0?",
                    "-vf", f"scale=-2:{height}", "-r", str(fps),
                    "-c:v", "libx264", "-preset", "slow", "-crf", str(crf), "-pix_fmt", "yuv420p",
                    "-c:a", "aac", "-b:a", "128k", "-ac", "2",
                    # the index goes at the front so the video starts playing before it has fully downloaded
                    "-movflags", "+faststart", str(target),
                ],
                check=True,
            )
            if turned:
                turned.unlink()
        # Poster: a frame a little way in, where there is usually something to see.
        frame = OUT / "video" / f"{name}-poster.png"
        info = probe(ffmpeg, target)
        at = min(2.0, info.get("seconds", 4) / 3)
        subprocess.run(
            [ffmpeg_frames, "-y", "-hide_banner", "-loglevel", "error", "-ss", str(at), "-i", str(target), "-frames:v", "1", str(frame)],
            check=True,
        )
        poster = save_webp(Image.open(frame), OUT / "video" / f"{name}-poster.webp", 1280, 80)
        frame.unlink()
        out[name] = {
            "src": "/" + target.relative_to(ROOT / "public").as_posix(),
            "poster": poster,
            "width": info.get("width"),
            "height": info.get("height"),
            "seconds": info.get("seconds"),
            "megabytes": round(target.stat().st_size / 1e6, 1),
        }
        print(f"video {name}: {out[name]['megabytes']} MB, {info.get('seconds')} s")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--ffmpeg", default=shutil.which("ffmpeg") or "ffmpeg")
    parser.add_argument("--ffmpeg-frames", help="ffmpeg used to grab poster frames (defaults to --ffmpeg)")
    parser.add_argument("--skip-video", action="store_true", help="keep the videos already built")
    args = parser.parse_args()

    index = json.loads(INDEX.read_text()) if INDEX.exists() else {}
    index["designs"] = build_designs()
    index["photos"] = build_photos()
    if not args.skip_video:
        index["videos"] = build_videos(args.ffmpeg, args.ffmpeg_frames or args.ffmpeg)
    INDEX.write_text(json.dumps(index, indent=2) + "\n")
    print(f"wrote {INDEX.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
