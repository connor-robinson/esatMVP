"""
TMUA Curriculum Parser

Parses Spec.md (markdown format) and provides topic filtering for Paper 1 and Paper 2.
Paper 1: Section 1 topics only (MM1-MM8, M1-M7)
Paper 2: Section 1 AND Section 2 topics (MM1-MM8, M1-M7, Arg1-Arg4, Prf1-Prf5, Err1-Err2)
"""

import re
from typing import Dict, List, Optional, Tuple
from pathlib import Path


class TMUACurriculumParser:
    def __init__(self, spec_file_path: Optional[str] = None):
        """
        Initialize the TMUA curriculum parser.
        
        Args:
            spec_file_path: Path to Spec.md. If None, uses default location.
        """
        if spec_file_path is None:
            base_dir = Path(__file__).parent
            spec_file_path = base_dir / "by_paper_prompts" / "Spec.md"
        
        self.spec_file_path = Path(spec_file_path)
        self.section1_topics = []
        self.section2_topics = []
        self._load_curriculum()
    
    def _load_curriculum(self):
        """Load and parse the Spec.md markdown file."""
        if not self.spec_file_path.exists():
            raise FileNotFoundError(
                f"TMUA Spec file not found: {self.spec_file_path}"
            )
        
        with open(self.spec_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Parse Section 1 topics (Paper 1)
        # Section 1, Part 1: MM1-MM8 (must come before M1-M7 to avoid conflicts)
        section1_part1_pattern = r'\*\*MM(\d+)\*\*\s+([^\n*]+)'
        for match in re.finditer(section1_part1_pattern, content):
            code = f"MM{match.group(1)}"
            title = match.group(2).strip()
            self.section1_topics.append({
                "code": code,
                "title": title,
                "section": "Section 1, Part 1",
                "paper": "Paper1"
            })
        
        # Section 1, Part 2: M1-M7 (must not match MM codes)
        # Use negative lookahead to ensure we don't match MM codes
        section1_part2_pattern = r'\*\*M(\d+)\*\*\s+([^\n*]+)'
        for match in re.finditer(section1_part2_pattern, content):
            # Check if this is actually MM (should have been caught above)
            full_match = match.group(0)
            if 'MM' in full_match:
                continue  # Skip MM codes, already handled
            
            code = f"M{match.group(1)}"
            title = match.group(2).strip()
            # Double-check it's not MM
            if not code.startswith("MM"):
                self.section1_topics.append({
                    "code": code,
                    "title": title,
                    "section": "Section 1, Part 2",
                    "paper": "Paper1"
                })
        
        # Parse Section 2 topics (Paper 2 only)
        # Arg1-Arg4
        arg_pattern = r'\*\*Arg(\d+)\*\*\s+([^\n*]+)'
        for match in re.finditer(arg_pattern, content):
            code = f"Arg{match.group(1)}"
            title = match.group(2).strip()
            self.section2_topics.append({
                "code": code,
                "title": title,
                "section": "Section 2 - Logic of Arguments",
                "paper": "Paper2"
            })
        
        # Prf1-Prf5
        prf_pattern = r'\*\*Prf(\d+)\*\*\s+([^\n*]+)'
        for match in re.finditer(prf_pattern, content):
            code = f"Prf{match.group(1)}"
            title = match.group(2).strip()
            self.section2_topics.append({
                "code": code,
                "title": title,
                "section": "Section 2 - Mathematical Proof",
                "paper": "Paper2"
            })
        
        # Err1-Err2
        err_pattern = r'\*\*Err(\d+)\*\*\s+([^\n*]+)'
        for match in re.finditer(err_pattern, content):
            code = f"Err{match.group(1)}"
            title = match.group(2).strip()
            self.section2_topics.append({
                "code": code,
                "title": title,
                "section": "Section 2 - Identifying Errors in Proofs",
                "paper": "Paper2"
            })
    
    def get_available_topics_for_schema(self, schema_id: str) -> List[Dict]:
        """
        Get all available topics for a schema based on paper type.
        
        Paper 1 (M_ prefix): Section 1 topics only
        Paper 2 (R_ prefix): Section 1 AND Section 2 topics
        
        Args:
            schema_id: Schema ID (e.g., "M_6abc19f7", "R_12345678")
        
        Returns:
            List of topic dictionaries with code, title, section, and paper
        """
        # Determine paper from schema prefix
        prefix = schema_id[0].upper()
        
        if prefix == "M":
            # Paper 1: Section 1 only
            return [
                {
                    "code": topic["code"],
                    "title": topic["title"],
                    "paper_name": "Paper1",
                    "section": topic["section"]
                }
                for topic in self.section1_topics
            ]
        elif prefix == "R":
            # Paper 2: Section 1 AND Section 2
            all_topics = []
            # Add Section 1 topics (but mark as available for Paper 2)
            for topic in self.section1_topics:
                all_topics.append({
                    "code": topic["code"],
                    "title": topic["title"],
                    "paper_name": "Paper2",  # Available for Paper 2
                    "section": topic["section"],
                    "section_type": "Section 1",  # Clear indicator
                    "note": "Section 1 topic - can be used as secondary tag for Paper 2"
                })
            # Add Section 2 topics (REQUIRED for Paper 2 primary tag)
            for topic in self.section2_topics:
                all_topics.append({
                    "code": topic["code"],
                    "title": topic["title"],
                    "paper_name": "Paper2",
                    "section": topic["section"],
                    "section_type": "Section 2",  # Clear indicator
                    "note": "Section 2 topic - REQUIRED for Paper 2 primary tag"
                })
            return all_topics
        else:
            # Unknown prefix, return empty
            return []
    
    def normalize_topic_code(self, topic_code: str) -> Optional[str]:
        """
        Normalize a topic code (just return it as-is for TMUA).
        
        Args:
            topic_code: Topic code (e.g., "MM4", "Arg2", "Prf1")
        
        Returns:
            Normalized topic code (same as input for TMUA)
        """
        # Check if it exists in our topics
        all_topics = self.section1_topics + self.section2_topics
        for topic in all_topics:
            if topic["code"] == topic_code:
                return topic_code
        return None
    
    def validate_topic_code(self, topic_code: str) -> bool:
        """
        Validate that a topic code exists in the curriculum.
        
        Args:
            topic_code: Topic code to validate
        
        Returns:
            True if valid, False otherwise
        """
        return self.normalize_topic_code(topic_code) is not None
    
    def get_topic_info(self, topic_code: str) -> Optional[Dict]:
        """
        Get full information about a topic code.
        
        Args:
            topic_code: Topic code (e.g., "MM4", "Arg2")
        
        Returns:
            Dictionary with code, title, section, and paper, or None if not found
        """
        all_topics = self.section1_topics + self.section2_topics
        for topic in all_topics:
            if topic["code"] == topic_code:
                return {
                    "code": topic["code"],
                    "title": topic["title"],
                    "section": topic["section"],
                    "paper": topic["paper"]
                }
        return None
    
    def is_section2_topic(self, topic_code: str) -> bool:
        """
        Check if a topic code belongs to Section 2 (Paper 2 only).
        
        Args:
            topic_code: Topic code to check
        
        Returns:
            True if Section 2 topic, False otherwise
        """
        return any(topic["code"] == topic_code for topic in self.section2_topics)
    
    def get_all_topics(self) -> Dict[str, List[Dict]]:
        """
        Get all topics organized by section.
        
        Returns:
            Dictionary with "section1" and "section2" keys
        """
        return {
            "section1": self.section1_topics,
            "section2": self.section2_topics
        }
    
    def map_tag_code_to_text(self, tag_code: str, paper: Optional[str] = None) -> str:
        """
        Map a tag code to its curriculum text name.
        
        Args:
            tag_code: Tag code (e.g., "MM1", "M1", "Arg1", "Prf1", "Err1")
            paper: Paper name (e.g., "Paper1", "Paper2") - optional, not used for mapping
        
        Returns:
            Topic title text (e.g., "Algebra and functions", "Units", "Propositional Logic")
            Returns the original tag_code if mapping not found
        """
        # Search in both section 1 and section 2 topics
        all_topics = self.section1_topics + self.section2_topics
        for topic in all_topics:
            if topic["code"] == tag_code:
                return topic["title"]
        
        return tag_code
    
    def map_tags_to_text(self, primary_tag: Optional[str], secondary_tags: Optional[List[str]], paper: Optional[str] = None) -> tuple[Optional[str], List[str]]:
        """
        Map primary and secondary tag codes to their curriculum text names.
        
        Args:
            primary_tag: Primary tag code (e.g., "MM1", "Arg1", "Prf1")
            secondary_tags: List of secondary tag codes
            paper: Paper name (e.g., "Paper1", "Paper2") - optional, not used for mapping
        
        Returns:
            Tuple of (mapped_primary_tag, mapped_secondary_tags)
        """
        mapped_primary = None
        if primary_tag:
            mapped_primary = self.map_tag_code_to_text(primary_tag, paper)
        
        mapped_secondary = []
        if secondary_tags:
            mapped_secondary = [
                self.map_tag_code_to_text(tag, paper)
                for tag in secondary_tags
            ]
        
        return mapped_primary, mapped_secondary


# Backward compatibility: Create a wrapper that matches CurriculumParser interface
class CurriculumParser:
    """
    Wrapper around TMUACurriculumParser for backward compatibility.
    Automatically detects if file is JSON (ESAT) or Markdown (TMUA).
    """
    def __init__(self, curriculum_file_path: Optional[str] = None):
        if curriculum_file_path is None:
            base_dir = Path(__file__).parent
            curriculum_file_path = base_dir / "by_paper_prompts" / "Spec.md"
        
        file_path = Path(curriculum_file_path)
        
        # Resolve relative paths
        if not file_path.is_absolute():
            # Try relative to current working directory first
            if not file_path.exists():
                # Try relative to this file's directory
                base_dir = Path(__file__).parent
                potential_path = base_dir / file_path
                if potential_path.exists():
                    file_path = potential_path
                else:
                    # Try as absolute path from base_dir
                    file_path = base_dir / curriculum_file_path
        
        # Check if it's JSON (ESAT) or Markdown (TMUA)
        if file_path.suffix == ".json" or "CURRICULUM" in file_path.name.upper():
            # ESAT format - use original parser
            try:
                from curriculum_parser import CurriculumParser as ESATParser
                self.parser = ESATParser(str(file_path))
                self.is_tmua = False
            except ImportError:
                # Fallback to TMUA parser if ESAT parser not available
                self.parser = TMUACurriculumParser(str(file_path))
                self.is_tmua = True
        else:
            # TMUA format - use new parser
            self.parser = TMUACurriculumParser(str(file_path))
            self.is_tmua = True
    
    def get_available_topics_for_schema(self, schema_id: str) -> List[Dict]:
        """Delegate to appropriate parser."""
        return self.parser.get_available_topics_for_schema(schema_id)
    
    def normalize_topic_code(self, topic_code: str) -> Optional[str]:
        """Delegate to appropriate parser."""
        return self.parser.normalize_topic_code(topic_code)
    
    def validate_topic_code(self, topic_code: str) -> bool:
        """Delegate to appropriate parser."""
        return self.parser.validate_topic_code(topic_code)
    
    def get_topic_info(self, topic_code: str) -> Optional[Dict]:
        """Delegate to appropriate parser."""
        return self.parser.get_topic_info(topic_code)

