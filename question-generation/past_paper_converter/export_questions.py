"""Download question images and build job records."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import httpx

from .config import expected_option_letters
from .db import fetch_questions


@dataclass
class QuestionJob:
    question_id: int
    paper_id: int
    exam_name: str
    exam_year: int
    paper_name: str
    part_letter: str
    part_name: str
    exam_type: str
    question_number: int
    answer_letter: str
    question_image_url: str
    expected_letters: List[str] = field(default_factory=list)
    image_bytes: Optional[bytes] = None
    image_hash: Optional[str] = None
    pdf_text_hint: Optional[str] = None

    @classmethod
    def from_row(cls, row: Dict[str, Any]) -> "QuestionJob":
        letters = expected_option_letters(
            row.get("exam_name", ""),
            row.get("paper_name", ""),
            row.get("part_name"),
        )
        return cls(
            question_id=int(row["id"]),
            paper_id=int(row["paper_id"]),
            exam_name=str(row.get("exam_name") or ""),
            exam_year=int(row.get("exam_year") or 0),
            paper_name=str(row.get("paper_name") or ""),
            part_letter=str(row.get("part_letter") or ""),
            part_name=str(row.get("part_name") or ""),
            exam_type=str(row.get("exam_type") or ""),
            question_number=int(row.get("question_number") or 0),
            answer_letter=str(row.get("answer_letter") or "").upper(),
            question_image_url=str(row.get("question_image") or "").strip(),
            expected_letters=letters,
        )


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def download_image(url: str, timeout: float = 60.0) -> bytes:
    with httpx.Client(follow_redirects=True, timeout=timeout) as client:
        resp = client.get(url)
        resp.raise_for_status()
        return resp.content


def export_jobs(
    *,
    paper_id: Optional[int] = None,
    exam_name: Optional[str] = None,
    question_id: Optional[int] = None,
    limit: Optional[int] = None,
    download: bool = True,
) -> List[QuestionJob]:
    rows = fetch_questions(
        paper_id=paper_id,
        exam_name=exam_name,
        question_id=question_id,
        limit=limit,
    )
    jobs: List[QuestionJob] = []
    for row in rows:
        job = QuestionJob.from_row(row)
        if download and job.question_image_url:
            try:
                job.image_bytes = download_image(job.question_image_url)
                job.image_hash = sha256_bytes(job.image_bytes)
            except Exception:
                job.image_bytes = None
                job.image_hash = None
        jobs.append(job)
    return jobs
