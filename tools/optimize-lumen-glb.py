#!/usr/bin/env python3
"""Resize embedded GLB textures while preserving geometry and material wiring."""

from __future__ import annotations

import argparse
import io
import json
import struct
from pathlib import Path

import numpy as np
from PIL import Image

JSON_CHUNK = 0x4E4F534A
BIN_CHUNK = 0x004E4942


def align4(data: bytes, fill: bytes = b"\x00") -> bytes:
    return data + fill * ((-len(data)) % 4)


def resize_png(payload: bytes, name: str, max_size: int) -> bytes:
    image = Image.open(io.BytesIO(payload))
    image.load()
    if max(image.size) <= max_size:
        return payload

    scale = max_size / max(image.size)
    target = tuple(max(1, round(value * scale)) for value in image.size)
    resized = image.resize(target, Image.Resampling.LANCZOS)

    if "normal" in name.lower():
        normal = np.asarray(resized.convert("RGB"), dtype=np.float32) / 127.5 - 1.0
        length = np.linalg.norm(normal, axis=2, keepdims=True)
        normal = normal / np.maximum(length, 1e-6)
        resized = Image.fromarray(np.clip((normal + 1.0) * 127.5, 0, 255).astype(np.uint8), "RGB")

    output = io.BytesIO()
    resized.save(output, "PNG", optimize=True, compress_level=9)
    return output.getvalue()


def optimize(source: Path, destination: Path, max_size: int) -> None:
    raw = source.read_bytes()
    magic, version, declared_length = struct.unpack_from("<III", raw, 0)
    if magic != 0x46546C67 or version != 2 or declared_length != len(raw):
        raise ValueError("Expected a valid GLB 2.0 file")

    chunks: dict[int, bytes] = {}
    cursor = 12
    while cursor < len(raw):
        length, chunk_type = struct.unpack_from("<II", raw, cursor)
        cursor += 8
        chunks[chunk_type] = raw[cursor : cursor + length]
        cursor += length

    document = json.loads(chunks[JSON_CHUNK].decode("utf-8").rstrip("\x00 "))
    original_bin = chunks[BIN_CHUNK]
    image_by_view = {
        image["bufferView"]: image
        for image in document.get("images", [])
        if image.get("mimeType") == "image/png" and "bufferView" in image
    }

    rebuilt = bytearray()
    for index, view in enumerate(document.get("bufferViews", [])):
        start = view.get("byteOffset", 0)
        payload = original_bin[start : start + view["byteLength"]]
        image = image_by_view.get(index)
        if image:
            payload = resize_png(payload, image.get("name", f"image-{index}"), max_size)
        while len(rebuilt) % 4:
            rebuilt.append(0)
        view["byteOffset"] = len(rebuilt)
        view["byteLength"] = len(payload)
        rebuilt.extend(payload)

    document["buffers"][0]["byteLength"] = len(rebuilt)
    json_payload = align4(json.dumps(document, separators=(",", ":")).encode("utf-8"), b" ")
    bin_payload = align4(bytes(rebuilt))
    total = 12 + 8 + len(json_payload) + 8 + len(bin_payload)
    result = (
        struct.pack("<III", 0x46546C67, 2, total)
        + struct.pack("<II", len(json_payload), JSON_CHUNK)
        + json_payload
        + struct.pack("<II", len(bin_payload), BIN_CHUNK)
        + bin_payload
    )
    destination.write_bytes(result)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--max-size", type=int, default=2048)
    args = parser.parse_args()
    optimize(args.source, args.destination, args.max_size)


if __name__ == "__main__":
    main()
