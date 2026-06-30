from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional

from models.schemas import IntervalFeature, StageFractions

_STAGES = ("awake", "light", "deep", "rem")

_STAGE_MAP = {
    "AWAKE": "awake",
    "LIGHT": "light",
    "DEEP": "deep",
    "REM": "rem",
    "ASLEEP": "light",
    "RESTLESS": "awake",
    "SLEEP_STAGE_TYPE_UNSPECIFIED": "light",
}


@dataclass
class SleepSegment:
    start: datetime
    end: datetime
    stage: str


@dataclass
class VitalSample:
    at: datetime
    hr: Optional[float] = None
    hrv: Optional[float] = None
    rr: Optional[float] = None


def parse_rfc3339(value: object) -> Optional[datetime]:
    if not value or not isinstance(value, str):
        return None
    try:
        normalized = value.replace("Z", "+00:00")
        return datetime.fromisoformat(normalized)
    except ValueError:
        return None


def parse_v4_sleep_segments(data_points: list[dict]) -> list[SleepSegment]:
    segments: list[SleepSegment] = []
    for pt in data_points:
        sleep = pt.get("sleep")
        if not sleep:
            continue
        for stage in sleep.get("stages") or []:
            start = parse_rfc3339(stage.get("startTime"))
            end = parse_rfc3339(stage.get("endTime"))
            if start is None or end is None or end <= start:
                continue
            raw_type = stage.get("type", "LIGHT")
            mapped = _STAGE_MAP.get(raw_type, "light")
            segments.append(SleepSegment(start=start, end=end, stage=mapped))
        for oob in sleep.get("outOfBedSegments") or []:
            start = parse_rfc3339(oob.get("startTime"))
            end = parse_rfc3339(oob.get("endTime"))
            if start is None or end is None or end <= start:
                continue
            segments.append(SleepSegment(start=start, end=end, stage="awake"))
    return segments


def parse_v4_heart_rate(data_points: list[dict]) -> list[VitalSample]:
    out: list[VitalSample] = []
    for pt in data_points:
        hr = pt.get("heartRate")
        if not hr:
            continue
        at = parse_rfc3339((hr.get("sampleTime") or {}).get("physicalTime"))
        if at is None:
            continue
        bpm = hr.get("beatsPerMinute")
        try:
            val = float(bpm) if bpm is not None else None
        except (TypeError, ValueError):
            val = None
        out.append(VitalSample(at=at, hr=val))
    return out


def parse_v4_hrv(data_points: list[dict]) -> list[VitalSample]:
    out: list[VitalSample] = []
    for pt in data_points:
        hrv = pt.get("heartRateVariability")
        if not hrv:
            continue
        at = parse_rfc3339((hrv.get("sampleTime") or {}).get("physicalTime"))
        if at is None:
            continue
        ms = hrv.get("rootMeanSquareOfSuccessiveDifferencesMilliseconds")
        if ms is None:
            ms = hrv.get("standardDeviationMilliseconds")
        try:
            val = float(ms) if ms is not None else None
        except (TypeError, ValueError):
            val = None
        out.append(VitalSample(at=at, hrv=val))
    return out


def build_intervals_from_samples(
    window_start: datetime,
    window_end: datetime,
    segments: list[SleepSegment],
    vitals: list[VitalSample],
    grid_size: int,
) -> list[IntervalFeature]:
    total = (window_end - window_start).total_seconds()
    if total <= 0 or grid_size <= 0:
        return []

    intervals: list[IntervalFeature] = []
    for i in range(grid_size):
        t_start = i / grid_size
        t_end = (i + 1) / grid_size
        bin_start = window_start + timedelta(seconds=total * t_start)
        bin_end = window_start + timedelta(seconds=total * t_end)

        stage_secs = {s: 0.0 for s in _STAGES}
        for seg in segments:
            overlap = _overlap_seconds(bin_start, bin_end, seg.start, seg.end)
            if overlap > 0 and seg.stage in stage_secs:
                stage_secs[seg.stage] += overlap
        covered = sum(stage_secs.values())
        if covered > 0:
            fractions = {s: stage_secs[s] / covered for s in _STAGES}
        else:
            fractions = {"awake": 0.0, "light": 1.0, "deep": 0.0, "rem": 0.0}
        minutes_awake = (stage_secs["awake"] / 60.0) if covered > 0 else 0.0

        hr = _mean_in_bin(vitals, bin_start, bin_end, "hr")
        hrv = _mean_in_bin(vitals, bin_start, bin_end, "hrv")
        rr = _mean_in_bin(vitals, bin_start, bin_end, "rr")

        intervals.append(
            IntervalFeature(
                index=i,
                tStart=round(t_start, 6),
                tEnd=round(t_end, 6),
                stageFractions=StageFractions(**fractions),
                minutesAwake=round(minutes_awake, 3),
                hrvMs=hrv,
                restingHr=hr,
                respiratoryRate=rr,
            )
        )
    return intervals


def _overlap_seconds(a0: datetime, a1: datetime, b0: datetime, b1: datetime) -> float:
    start = max(a0, b0)
    end = min(a1, b1)
    return max(0.0, (end - start).total_seconds())


def _mean_in_bin(
    vitals: list[VitalSample], bin_start: datetime, bin_end: datetime, attr: str
) -> Optional[float]:
    vals = [
        getattr(v, attr)
        for v in vitals
        if bin_start <= v.at < bin_end and getattr(v, attr) is not None
    ]
    if not vals:
        return None
    return round(sum(vals) / len(vals), 3)
