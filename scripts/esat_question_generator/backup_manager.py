#!/usr/bin/env python3
"""
Backup Manager for AI-Generated Questions

Saves all questions (accepted and rejected) to JSONL files organized by date.
Backup happens immediately after generation and when status changes.
"""

import os
import json
import datetime
from typing import Dict, Any, Optional
from pathlib import Path


class BackupManager:
    """Manages backup of all generated questions to JSONL files."""
    
    def __init__(self, base_dir: str, backup_dir: str = "backups"):
        """
        Initialize backup manager.
        
        Args:
            base_dir: Base directory of the question generator
            backup_dir: Name of backup directory (relative to base_dir)
        """
        self.base_dir = Path(base_dir)
        self.backup_dir = self.base_dir / backup_dir
        self.backup_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_backup_path(self, date: Optional[datetime.date] = None) -> Path:
        """
        Get the backup file path for a given date.
        
        Args:
            date: Date to backup to (defaults to today)
            
        Returns:
            Path to backup file
        """
        if date is None:
            date = datetime.date.today()
        
        date_str = date.strftime("%Y-%m-%d")
        backup_file = self.backup_dir / date_str / "questions.jsonl"
        backup_file.parent.mkdir(parents=True, exist_ok=True)
        
        return backup_file
    
    def backup_question(self, question_data: Dict[str, Any], status: str = "pending_review") -> str:
        """
        Backup a question to the appropriate date file.
        
        Args:
            question_data: Full question data dictionary
            status: Current status of the question
            
        Returns:
            Path to backup file where question was saved
        """
        # Create backup entry
        backup_entry = {
            "id": question_data.get("id") or question_data.get("generation_id", "unknown"),
            "generation_id": question_data.get("generation_id") or question_data.get("id", "unknown"),
            "status": status,
            "backed_up_at": datetime.datetime.now().isoformat(),
            "question_data": question_data
        }
        
        # Determine backup date (use created_at if available, otherwise today)
        backup_date = datetime.date.today()
        if "created_at" in question_data:
            try:
                created_dt = datetime.datetime.fromisoformat(question_data["created_at"].replace("Z", "+00:00"))
                backup_date = created_dt.date()
            except (ValueError, AttributeError):
                pass
        
        backup_path = self._get_backup_path(backup_date)
        
        # Append to backup file
        with open(backup_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(backup_entry, ensure_ascii=False) + "\n")
        
        return str(backup_path)
    
    def update_backup_status(self, generation_id: str, new_status: str, 
                           reviewed_by: Optional[str] = None, 
                           review_notes: Optional[str] = None) -> bool:
        """
        Update the status of a question in the backup file.
        
        Note: This searches through backup files to find and update the entry.
        This is not efficient for large backups but ensures data consistency.
        
        Args:
            generation_id: Generation ID of the question
            new_status: New status
            reviewed_by: User who reviewed (optional)
            review_notes: Review notes (optional)
            
        Returns:
            True if update was successful, False otherwise
        """
        # Search through backup files (most recent first)
        backup_dirs = sorted(self.backup_dir.glob("*/"), reverse=True)
        
        for backup_dir in backup_dirs:
            backup_file = backup_dir / "questions.jsonl"
            if not backup_file.exists():
                continue
            
            # Read all entries
            entries = []
            updated = False
            
            with open(backup_file, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        entry = json.loads(line)
                        if entry.get("generation_id") == generation_id or entry.get("id") == generation_id:
                            # Update this entry
                            entry["status"] = new_status
                            entry["updated_at"] = datetime.datetime.now().isoformat()
                            if reviewed_by:
                                entry["reviewed_by"] = reviewed_by
                            if review_notes:
                                entry["review_notes"] = review_notes
                            updated = True
                        entries.append(entry)
                    except json.JSONDecodeError:
                        continue
            
            # Write back if updated
            if updated:
                with open(backup_file, "w", encoding="utf-8") as f:
                    for entry in entries:
                        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
                return True
        
        return False
    
    def get_backup_stats(self) -> Dict[str, Any]:
        """
        Get statistics about backups.
        
        Returns:
            Dictionary with backup statistics
        """
        stats = {
            "total_backup_files": 0,
            "total_questions": 0,
            "by_date": {},
            "by_status": {}
        }
        
        for backup_dir in self.backup_dir.glob("*/"):
            backup_file = backup_dir / "questions.jsonl"
            if not backup_file.exists():
                continue
            
            date_str = backup_dir.name
            date_count = 0
            date_statuses = {}
            
            with open(backup_file, "r", encoding="utf-8") as f:
                for line in f:
                    if not line.strip():
                        continue
                    try:
                        entry = json.loads(line)
                        date_count += 1
                        status = entry.get("status", "unknown")
                        date_statuses[status] = date_statuses.get(status, 0) + 1
                        stats["by_status"][status] = stats["by_status"].get(status, 0) + 1
                    except json.JSONDecodeError:
                        continue
            
            if date_count > 0:
                stats["total_backup_files"] += 1
                stats["total_questions"] += date_count
                stats["by_date"][date_str] = {
                    "count": date_count,
                    "by_status": date_statuses
                }
        
        return stats


def backup_question_from_pipeline(question_item: Dict[str, Any], base_dir: str, 
                                 status: str = "pending_review") -> str:
    """
    Convenience function to backup a question from the pipeline.
    
    Args:
        question_item: Question item from pipeline (from build_bank_item)
        base_dir: Base directory of question generator
        status: Status to assign (default: pending_review)
        
    Returns:
        Path to backup file
    """
    manager = BackupManager(base_dir)
    return manager.backup_question(question_item, status)


if __name__ == "__main__":
    # Test backup manager
    import tempfile
    
    with tempfile.TemporaryDirectory() as tmpdir:
        manager = BackupManager(tmpdir)
        
        # Test backup
        test_question = {
            "id": "M6-Easy-test123",
            "generation_id": "M6-Easy-test123",
            "schema_id": "M6",
            "difficulty": "Easy",
            "question_package": {
                "question": {
                    "stem": "What is $2+2$?",
                    "options": {"A": "3", "B": "4", "C": "5"},
                    "correct_option": "B"
                }
            },
            "created_at": datetime.datetime.now().isoformat()
        }
        
        backup_path = manager.backup_question(test_question, "pending_review")
        print(f"Backed up to: {backup_path}")
        
        # Test stats
        stats = manager.get_backup_stats()
        print(f"Stats: {json.dumps(stats, indent=2)}")

