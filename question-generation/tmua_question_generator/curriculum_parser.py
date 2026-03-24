"""
Curriculum Parser for ESAT Question Tagging System

Parses ESAT_CURRICULUM.json and provides schema-based filtering and topic mapping.
"""

import json
import os
from typing import Dict, List, Optional, Tuple
from pathlib import Path


class CurriculumParser:
    def __init__(self, curriculum_file_path: Optional[str] = None):
        """
        Initialize the curriculum parser.
        
        Args:
            curriculum_file_path: Path to ESAT_CURRICULUM.json. If None, uses default location.
        """
        if curriculum_file_path is None:
            # Default to by_subject_prompts/ESAT curriculum.md relative to this file
            base_dir = Path(__file__).parent
            curriculum_file_path = base_dir / "by_subject_prompts" / "ESAT curriculum.md"
        
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


# Convenience function for easy import
def load_curriculum(curriculum_file_path: Optional[str] = None) -> CurriculumParser:
    """Load and return a CurriculumParser instance."""
    return CurriculumParser(curriculum_file_path)

