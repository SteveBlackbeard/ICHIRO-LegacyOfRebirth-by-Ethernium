#!/usr/bin/env python3
"""Create a reviewable WebVTT draft from project-owned video audio."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from faster_whisper import WhisperModel


def timestamp(seconds: float) -> str:
    milliseconds = max(0, round(seconds * 1000))
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    whole_seconds, milliseconds = divmod(milliseconds, 1000)
    return f"{hours:02}:{minutes:02}:{whole_seconds:02}.{milliseconds:03}"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--model", default="base.en")
    parser.add_argument("--report", type=Path)
    parser.add_argument(
        "--initial-prompt",
        default=(
            "New Eden. Hangyaku-sha incident. Nemeth core. "
            "Ichiro. Designation: Silent Sentinel."
        ),
    )
    args = parser.parse_args()

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    segments, info = model.transcribe(
        str(args.video),
        language="en",
        beam_size=5,
        vad_filter=True,
        condition_on_previous_text=False,
        no_speech_threshold=0.62,
        initial_prompt=args.initial_prompt,
    )
    records = [
        {
            "start": segment.start,
            "end": segment.end,
            "text": segment.text.strip(),
            "avgLogProb": segment.avg_logprob,
            "noSpeechProb": segment.no_speech_prob,
        }
        for segment in segments
        if segment.text.strip()
    ]

    lines = ["WEBVTT", "", "NOTE Machine draft; verify against the project master before release.", ""]
    for index, record in enumerate(records, 1):
        lines.extend(
            [
                str(index),
                f"{timestamp(record['start'])} --> {timestamp(record['end'])}",
                record["text"],
                "",
            ]
        )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text("\n".join(lines), encoding="utf-8")

    report = args.report or args.output.with_suffix(".json")
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(
        json.dumps(
            {
                "model": args.model,
                "language": info.language,
                "languageProbability": info.language_probability,
                "duration": info.duration,
                "initialPrompt": args.initial_prompt,
                "segments": records,
            },
            indent=2,
        ),
        encoding="utf-8",
    )
    print(f"Wrote {len(records)} caption segment(s) to {args.output}")


if __name__ == "__main__":
    main()
