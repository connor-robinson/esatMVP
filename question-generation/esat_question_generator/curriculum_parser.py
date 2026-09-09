"""
Curriculum Parser for ESAT Question Tagging System

Parses ESAT_CURRICULUM.json and provides schema-based filtering and topic mapping.
"""

import json
import os
import re
from typing import Dict, List, Optional, Tuple
from pathlib import Path


# Display labels stored by legacy db_sync / reclass scripts -> curriculum paper_id
_SUBJECT_LABEL_TO_PAPER_ID: Dict[str, str] = {
    "mathematics 1": "math1",
    "math 1": "math1",
    "mathematics 2": "math2",
    "math 2": "math2",
    "physics": "physics",
    "chemistry": "chemistry",
    "biology": "biology",
}

_PREFIXED_TAG_RE = re.compile(
    r"^(M1-|M2-|P-|chemistry-|biology-)([A-Za-z0-9]+)$",
    re.IGNORECASE,
)


def _default_curriculum_path() -> Path:
    """First existing file wins (JSON under curriculum/, then new-pack copy, then legacy name)."""
    base_dir = Path(__file__).parent.resolve()
    candidates = (
        base_dir / "curriculum" / "ESAT_CURRICULUM.json",
        base_dir / "by_subject_prompts" / "new" / "ESAT_curriculum.md",
        base_dir / "by_subject_prompts" / "ESAT curriculum.md",
    )
    for p in candidates:
        if p.is_file():
            return p
    return candidates[0]


def esat_paper_id_from_row(
    *,
    schema_id: str = "",
    subjects: str = "",
    paper: Optional[str] = None,
) -> Optional[str]:
    """Resolve ESAT curriculum ``paper_id`` from DB row fields."""
    subj = (subjects or "").strip()
    if subj:
        key = subj.lower()
        if key in _SUBJECT_LABEL_TO_PAPER_ID:
            return _SUBJECT_LABEL_TO_PAPER_ID[key]
    pap = (paper or "").strip()
    if pap in ("Math 1", "Math 2"):
        return "math1" if pap == "Math 1" else "math2"
    if not schema_id:
        return None
    c0 = schema_id[0].upper()
    if c0 == "M":
        return "math2" if subj == "Math 2" else "math1"
    if c0 == "P":
        return "physics"
    if c0 == "C":
        return "chemistry"
    if c0 == "B":
        return "biology"
    return None


def _bare_digit_to_raw_code(tag: str, paper_id: str) -> Optional[str]:
    t = tag.strip()
    if not re.fullmatch(r"[1-9]|1[01]", t):
        return None
    n = t
    if paper_id == "math1":
        return f"M{n}"
    if paper_id == "math2":
        return f"MM{n}"
    if paper_id == "physics":
        return f"P{n}"
    if paper_id == "biology" and 1 <= int(t) <= 11:
        return f"B{n}"
    return None


def _display_label_to_prefixed_code(tag: str, parser: "CurriculumParser") -> Optional[str]:
    """``Physics - Mechanics`` / ``Biology - Cells`` -> prefixed curriculum code."""
    if " - " not in tag:
        return None
    subj_part, title_part = tag.split(" - ", 1)
    paper_id = _SUBJECT_LABEL_TO_PAPER_ID.get(subj_part.strip().lower())
    if not paper_id:
        return None
    title = title_part.strip()
    paper = parser.papers_by_id.get(paper_id)
    if not paper:
        return None
    for topic in paper.get("topics", []):
        if (topic.get("title") or "").strip() == title:
            raw = topic.get("code", "")
            if raw:
                return parser._get_prefixed_code(paper_id, str(raw))
    return None


def canonicalize_esat_tag(
    tag: Optional[str],
    *,
    schema_id: str = "",
    subjects: str = "",
    paper_id: Optional[str] = None,
    parser: Optional["CurriculumParser"] = None,
) -> Optional[str]:
    """
    Normalize any stored ESAT tag to prefixed curriculum code (e.g. ``M1-M4``, ``P-P3``).

    Handles bare labeler digits, raw codes (``M4``, ``P2``), prefixed codes, and legacy
    ``Subject - Topic title`` strings.
    """
    if tag is None:
        return None
    t = str(tag).strip()
    if not t:
        return None

    p = parser or CurriculumParser()
    pid = paper_id or esat_paper_id_from_row(schema_id=schema_id, subjects=subjects)
    if not pid:
        pid = esat_paper_id_from_row(schema_id=schema_id)

    m = _PREFIXED_TAG_RE.match(t)
    if m:
        norm = p.normalize_topic_code(t)
        return norm or t

    if pid:
        from_title = _display_label_to_prefixed_code(t, p)
        if from_title:
            return from_title

        bare_raw = _bare_digit_to_raw_code(t, pid) if pid else None
        if bare_raw:
            norm = p.normalize_topic_code(bare_raw)
            if norm:
                return norm

    coerced = coerce_classifier_topic_code(schema_id, t)
    norm = p.normalize_topic_code(coerced)
    if norm:
        return norm
    if coerced != t and p.validate_topic_code(coerced):
        return coerced
    return t


def canonicalize_esat_tags_list(
    tags: Optional[List[str]],
    *,
    schema_id: str = "",
    subjects: str = "",
    paper_id: Optional[str] = None,
    parser: Optional["CurriculumParser"] = None,
) -> List[str]:
    if not tags:
        return []
    out: List[str] = []
    for raw in tags:
        c = canonicalize_esat_tag(
            raw,
            schema_id=schema_id,
            subjects=subjects,
            paper_id=paper_id,
            parser=parser,
        )
        if c and c not in out:
            out.append(c)
    return out


def coerce_classifier_topic_code(schema_id: str, code: str) -> str:
    """
    Map bare classifier / labeler digits to curriculum raw codes before normalize_topic_code.

    Physics tag output sometimes returns '1'–'7' instead of 'P1'–'P7'; biology may return '1'–'11'.
    """
    if not code or not schema_id:
        return code
    c0 = schema_id[0].upper()
    t = str(code).strip()
    if c0 == "P" and len(t) == 1 and t in "1234567":
        return f"P{t}"
    if c0 == "B" and t.isdigit():
        n = int(t)
        if 1 <= n <= 11:
            return f"B{n}"
    return t


class CurriculumParser:
    def __init__(self, curriculum_file_path: Optional[str] = None):
        """
        Initialize the curriculum parser.

        Args:
            curriculum_file_path: Path to curriculum JSON (``.json`` or JSON-in-``.md``).
                If None, uses ``curriculum/ESAT_CURRICULUM.json`` or
                ``by_subject_prompts/new/ESAT_curriculum.md`` when present.
        """
        if curriculum_file_path is None:
            curriculum_file_path = _default_curriculum_path()

        self.curriculum_file_path = Path(curriculum_file_path)
        self.curriculum_data = self._load_curriculum()
        self.papers_by_id = {paper["paper_id"]: paper for paper in self.curriculum_data["papers"]}
        self.topics_by_code = self._build_topic_index()
    
    def _load_curriculum(self) -> Dict:
        """Load and parse the curriculum JSON file."""
        if not self.curriculum_file_path.exists():
            raise FileNotFoundError(
                f"Curriculum file not found: {self.curriculum_file_path}"
            )
        
        with open(self.curriculum_file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _build_topic_index(self) -> Dict[str, Dict]:
        """Build an index of topics by code for quick lookup."""
        topics = {}
        for paper in self.curriculum_data["papers"]:
            for topic in paper["topics"]:
                code = topic["code"]
                # Store both raw code and prefixed code
                prefixed_code = self._get_prefixed_code(paper["paper_id"], code)
                topics[code] = {
                    **topic,
                    "paper_id": paper["paper_id"],
                    "paper_name": paper["paper_name"],
                    "prefixed_code": prefixed_code
                }
                # Also index by prefixed code for reverse lookup
                topics[prefixed_code] = topics[code]
        return topics
    
    def _get_prefixed_code(self, paper_id: str, topic_code: str) -> str:
        """
        Get the prefixed curriculum tag code for a topic.
        
        Format:
        - Math 1: "M1-M1", "M1-M2", etc.
        - Math 2: "M2-MM1", "M2-MM2", etc.
        - Physics: "P-P1", "P-P2", etc.
        - Other papers: "paper_id-topic_code"
        
        Args:
            paper_id: Paper ID (e.g., "math1", "math2", "physics")
            topic_code: Raw topic code from curriculum (e.g., "M1", "MM1", "P1")
        
        Returns:
            Prefixed code (e.g., "M1-M1", "M2-MM1", "P-P1")
        """
        if paper_id == "math1":
            return f"M1-{topic_code}"
        elif paper_id == "math2":
            return f"M2-{topic_code}"
        elif paper_id == "physics":
            return f"P-{topic_code}"
        else:
            # For other papers (biology, chemistry), use paper_id prefix
            return f"{paper_id}-{topic_code}"
    
    def get_papers_for_schema(self, schema_id: str) -> List[str]:
        """
        Get available papers for a given schema ID.
        
        Args:
            schema_id: Schema ID (e.g., "M1", "P3", "B1", "C1")
        
        Returns:
            List of paper IDs that can be used for this schema
        """
        prefix = schema_id[0].upper()
        
        if prefix == "M":
            # Math schemas can use Math 1 or Math 2 (interchangeable)
            return ["math1", "math2"]
        elif prefix == "P":
            # Physics schemas only use Physics
            return ["physics"]
        elif prefix == "B":
            # Biology schemas only use Biology
            return ["biology"]
        elif prefix == "C":
            # Chemistry schemas only use Chemistry
            return ["chemistry"]
        else:
            # Unknown schema prefix
            return []
    
    def get_topics_for_paper(self, paper_id: str) -> List[Dict]:
        """
        Get all topics for a given paper.
        
        Args:
            paper_id: Paper ID (e.g., "math1", "physics")
        
        Returns:
            List of topic dictionaries with code and title
        """
        paper = self.papers_by_id.get(paper_id)
        if not paper:
            return []
        return paper["topics"]
    
    def map_schema_to_topic_code(self, schema_id: str, paper_id: str) -> Optional[str]:
        """
        Map a schema ID to the corresponding topic code for a given paper.
        
        Args:
            schema_id: Schema ID (e.g., "M1", "P3", "B1", "C1")
            paper_id: Paper ID (e.g., "math1", "math2", "physics", "biology", "chemistry")
        
        Returns:
            Topic code (e.g., "M1", "MM1", "P3", "B1", "C1") or None if mapping not possible
        """
        prefix = schema_id[0].upper()
        schema_num = schema_id[1:] if len(schema_id) > 1 else ""
        
        if prefix == "M":
            if paper_id == "math1":
                # Math 1: M1→M1, M2→M2, etc.
                return f"M{schema_num}"
            elif paper_id == "math2":
                # Math 2: M1→MM1, M2→MM2, etc.
                return f"MM{schema_num}"
        elif prefix == "P":
            if paper_id == "physics":
                # Physics: P1→P1, P2→P2, etc.
                return f"P{schema_num}"
        elif prefix == "B":
            if paper_id == "biology":
                # Biology: B1→B1, B2→B2, etc.
                return f"B{schema_num}"
        elif prefix == "C":
            if paper_id == "chemistry":
                # Chemistry: C1→C1, C2→C2, etc.
                return f"C{schema_num}"
        
        return None
    
    def get_available_topics_for_schema(self, schema_id: str) -> List[Dict]:
        """
        Get all available topics for a schema (across all valid papers).
        
        Args:
            schema_id: Schema ID (e.g., "M1", "P3")
        
        Returns:
            List of topic dictionaries with code, title, paper_id, paper_name, and prefixed_code
            Note: The 'code' field contains the PREFIXED code (e.g., "M1-M1", "M2-MM1", "P-P1")
            for use as curriculum tags. The raw code is available in the topic data.
        """
        papers = self.get_papers_for_schema(schema_id)
        all_topics = []
        
        for paper_id in papers:
            topics = self.get_topics_for_paper(paper_id)
            for topic in topics:
                raw_code = topic["code"]
                prefixed_code = self._get_prefixed_code(paper_id, raw_code)
                all_topics.append({
                    **topic,
                    "code": prefixed_code,  # Return prefixed code as the main code
                    "raw_code": raw_code,   # Keep raw code for reference
                    "paper_id": paper_id,
                    "paper_name": self.papers_by_id[paper_id]["paper_name"],
                    "prefixed_code": prefixed_code
                })
        
        return all_topics
    
    def validate_topic_code(self, topic_code: str) -> bool:
        """
        Validate that a topic code exists in the curriculum.
        
        Accepts both raw codes (e.g., "M1", "MM1", "P1") and prefixed codes (e.g., "M1-M1", "M2-MM1", "P-P1").
        
        Args:
            topic_code: Topic code to validate (raw or prefixed)
        
        Returns:
            True if valid, False otherwise
        """
        return topic_code in self.topics_by_code
    
    def normalize_topic_code(self, topic_code: str) -> Optional[str]:
        """
        Normalize a topic code to prefixed format.
        
        If the code is already prefixed, returns it as-is.
        If it's a raw code, attempts to find the appropriate paper and return prefixed version.
        
        Args:
            topic_code: Raw or prefixed topic code
        
        Returns:
            Prefixed code (e.g., "M1-M1", "M2-MM1", "P-P1") or None if not found
        """
        # If already prefixed, validate and return
        if topic_code in self.topics_by_code:
            topic_info = self.topics_by_code[topic_code]
            if "prefixed_code" in topic_info:
                return topic_info["prefixed_code"]
            # If it's already a prefixed code in the index, return as-is
            if "-" in topic_code:
                return topic_code
        
        # Try to find raw code and determine paper
        for paper in self.curriculum_data["papers"]:
            for topic in paper["topics"]:
                if topic["code"] == topic_code:
                    return self._get_prefixed_code(paper["paper_id"], topic_code)
        
        return None
    
    def get_topic_info(self, topic_code: str) -> Optional[Dict]:
        """
        Get full information about a topic code.
        
        Args:
            topic_code: Topic code (e.g., "M1", "MM1", "P1")
        
        Returns:
            Dictionary with code, title, paper_id, paper_name, or None if not found
        """
        return self.topics_by_code.get(topic_code)
    
    def get_all_topic_codes(self) -> List[str]:
        """Get a list of all valid topic codes."""
        return list(self.topics_by_code.keys())
    
    def get_curriculum_summary(self) -> Dict:
        """Get a summary of the curriculum structure."""
        return {
            "exam": self.curriculum_data.get("exam"),
            "source": self.curriculum_data.get("source"),
            "papers": [
                {
                    "paper_id": paper["paper_id"],
                    "paper_name": paper["paper_name"],
                    "topic_count": len(paper["topics"])
                }
                for paper in self.curriculum_data["papers"]
            ]
        }
    
    def map_tag_code_to_text(self, tag_code: str, paper_id: str) -> str:
        """
        Map a tag code to its curriculum text name.
        
        Args:
            tag_code: Tag code (e.g., "M1", "MM1", "P1", "M1-M4", "P-P3")
            paper_id: Paper ID (e.g., "math1", "math2", "physics", "chemistry", "biology")
        
        Returns:
            Topic title text (e.g., "Units", "Algebra and functions", "Electricity")
            Returns the original tag_code if mapping not found
        """
        paper = self.papers_by_id.get(paper_id)
        if not paper:
            return tag_code

        norm = self.normalize_topic_code(tag_code)
        lookup = norm or tag_code

        prefix_for_paper = {
            "math1": "M1-",
            "math2": "M2-",
            "physics": "P-",
            "chemistry": "chemistry-",
            "biology": "biology-",
        }.get(paper_id, "")

        raw = lookup
        if prefix_for_paper and lookup.startswith(prefix_for_paper):
            raw = lookup[len(prefix_for_paper) :]

        for topic in paper["topics"]:
            if topic["code"] == raw or topic["code"] == lookup:
                return topic["title"]

        return tag_code
    
    def map_tags_to_text(self, primary_tag: Optional[str], secondary_tags: Optional[List[str]], paper_id: str) -> Tuple[Optional[str], List[str]]:
        """
        Map primary and secondary tag codes to their curriculum text names.
        
        Args:
            primary_tag: Primary tag code (e.g., "M1", "MM1", "P1")
            secondary_tags: List of secondary tag codes
            paper_id: Paper ID (e.g., "math1", "math2", "physics", "chemistry", "biology")
        
        Returns:
            Tuple of (mapped_primary_tag, mapped_secondary_tags)
        """
        mapped_primary = None
        if primary_tag:
            mapped_primary = self.map_tag_code_to_text(primary_tag, paper_id)
        
        mapped_secondary = []
        if secondary_tags:
            mapped_secondary = [
                self.map_tag_code_to_text(tag, paper_id)
                for tag in secondary_tags
            ]
        
        return mapped_primary, mapped_secondary


# Convenience function for easy import
def load_curriculum(curriculum_file_path: Optional[str] = None) -> CurriculumParser:
    """Load and return a CurriculumParser instance."""
    return CurriculumParser(curriculum_file_path)

