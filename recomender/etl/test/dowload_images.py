#!/usr/bin/env python3

import argparse
import json
import pathlib
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Final, List

BASE_HEADERS: Final = {
    "User-Agent": (
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
    ),
    "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
}

@dataclass
class ImageEntry:
    product_id: str
    color: str
    url: str


def load_manifest(json_path: pathlib.Path) -> List[ImageEntry]:
    """Return product metadata entries stored under the `images` key."""
    if not json_path.is_file():
        raise ValueError(f"URL file not found: {json_path}")

    try:
        data = json.loads(json_path.read_text())
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {json_path}: {exc}") from exc

    images = data.get("images")
    if not isinstance(images, list):
        raise ValueError("JSON must contain an `images` list.")
    if not images:
        raise ValueError("No entries found in `images` list.")

    entries: List[ImageEntry] = []
    for raw in images:
        if not isinstance(raw, dict):
            raise ValueError("Each `images` entry must be an object.")
        product_id = (str(raw.get("product_id", ""))).strip()
        url = (raw.get("url") or "").strip()
        color = (raw.get("color") or "").strip() or "default"
        if not product_id or not url:
            raise ValueError(
                "Each `images` entry must include non-empty `product_id` and `url`."
            )
        entries.append(ImageEntry(product_id=product_id, color=color, url=url))

    return entries


def _sanitize_segment(value: str) -> str:
    """Return a filesystem-friendly segment derived from the input string."""
    cleaned = re.sub(r"[^0-9A-Za-z._-]+", "-", value.strip().lower())
    cleaned = cleaned.strip("-") or "default"
    return cleaned


def derive_filename(item: ImageEntry) -> str:
    """Create an output filename from product_id, color, and the image URL."""
    parsed = urllib.parse.urlparse(item.url)
    name = pathlib.Path(parsed.path).name
    suffix = pathlib.Path(name).suffix
    if not name:
        name = f"{item.product_id}-{item.color}"
    if not suffix:
        query_params = urllib.parse.parse_qs(parsed.query)
        sfrm = query_params.get("sfrm")
        if sfrm and sfrm[0]:
            suffix = f".{sfrm[0].split('/')[-1]}"
        else:
            suffix = ".jpg"
    product_segment = _sanitize_segment(item.product_id)
    color_segment = _sanitize_segment(item.color)
    return f"{product_segment}-{color_segment}{suffix}"


def ensure_unique_path(path: pathlib.Path, overwrite: bool) -> pathlib.Path:
    """Return a unique path, appending a numeric suffix unless overwrite is on."""
    if overwrite or not path.exists():
        return path

    stem = path.stem
    suffix = path.suffix
    counter = 1
    candidate = path
    while candidate.exists():
        candidate = path.with_name(f"{stem}_{counter}{suffix}")
        counter += 1
    return candidate


def download_file(url: str, destination: pathlib.Path) -> None:
    """Download the URL content to the destination path."""
    parsed = urllib.parse.urlparse(url)
    referer = f"{parsed.scheme}://{parsed.netloc}/"
    headers = {
        **BASE_HEADERS,
        "Referer": referer,
        "Origin": referer.rstrip("/"),
        "Sec-Fetch-Dest": "image",
        "Sec-Fetch-Mode": "no-cors",
        "Sec-Fetch-Site": "same-origin",
    }

    request = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(request) as response:
        content_type = response.info().get_content_type()
        if not content_type.startswith("image/"):
            raise ValueError(f"Unexpected content type {content_type!r}")

        data = response.read()

    destination.write_bytes(data)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Download images described in urls.json with `images` entries."
    )
    parser.add_argument(
        "--json",
        type=pathlib.Path,
        default=pathlib.Path("urls.json"),
        help="Path to the JSON file containing an `images` list (default: urls.json).",
    )
    parser.add_argument(
    "--output-dir",
    type=pathlib.Path,
    default=pathlib.Path("./data/raw/downloads"),
    help="Directory to store downloaded images (default: ./data/raw/downloads).",
)
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing files instead of creating unique filenames.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        entries = load_manifest(args.json)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    output_dir = args.output_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    successes = 0
    failures = 0
    for entry in entries:
        destination = ensure_unique_path(
            output_dir / derive_filename(entry), overwrite=args.overwrite
        )
        try:
            download_file(entry.url, destination)
        except Exception as exc:  # pragma: no cover - handles runtime errors
            print(f"failed: {entry.url} -> {exc}", file=sys.stderr)
            failures += 1
            continue

        print(f"saved: {entry.url} -> {destination}")
        successes += 1

    if failures:
        print(
            f"completed with {successes} success(es) and {failures} failure(s)",
            file=sys.stderr,
        )
        return 1

    print(f"downloaded {successes} file(s) to {output_dir}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
