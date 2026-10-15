#!/usr/bin/env python3
"""Convert a VihangNet browser recording (WebM or MP4) to standard H.264/AAC MP4.
Requires a system-installed FFmpeg binary. Offline CLI only; not an HTTP endpoint.
Usage: python3 private/python/convert.py recording.webm [result.mp4]
"""
from __future__ import annotations
import argparse
from pathlib import Path
import shutil
import subprocess
import sys


def convert(source: Path, target: Path, *, timeout: int = 600) -> None:
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        raise RuntimeError("FFmpeg is not installed or not on PATH.")
    if not source.is_file() or source.suffix.lower() not in {".webm", ".mp4", ".mov", ".mkv"}:
        raise ValueError("Input must be a local .webm, .mp4, .mov or .mkv video file.")
    if source.stat().st_size > 1_073_741_824:
        raise ValueError("Input exceeds the 1 GiB conversion limit.")
    if source.resolve() == target.resolve():
        raise ValueError("Output must differ from input.")
    if target.suffix.lower() != ".mp4":
        raise ValueError("Output must have a .mp4 extension.")
    target.parent.mkdir(parents=True, exist_ok=True)
    command = [
        ffmpeg, "-hide_banner", "-loglevel", "error", "-nostdin", "-y",
        "-i", str(source), "-map", "0:v:0", "-map", "0:a:0?",
        "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
        "-movflags", "+faststart", str(target),
    ]
    try:
        subprocess.run(command, check=True, timeout=timeout)
    except Exception:
        target.unlink(missing_ok=True)
        raise
    if not target.is_file() or target.stat().st_size < 512:
        raise RuntimeError("FFmpeg did not generate a usable MP4.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path)
    parser.add_argument("output", nargs="?", type=Path)
    args = parser.parse_args()
    output = args.output or args.source.with_suffix(".mp4")
    try:
        convert(args.source, output)
    except (ValueError, RuntimeError, subprocess.CalledProcessError, subprocess.TimeoutExpired) as exc:
        print(f"Conversion failed: {exc}", file=sys.stderr)
        return 1
    print(output)
    return 0


if __name__ == "__main__":
    sys.exit(main())
