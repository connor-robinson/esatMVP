import os
import time
from pathlib import Path
from typing import Optional
from db import NSAASchemaDB

_QGEN_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_SCHEMAS = _QGEN_ROOT / "esat_question_generator" / "schemas" / "Schemas_NSAA.md"


class MarkdownExporter:
    def __init__(self, output_path: Optional[str] = None):
        self.output_path = output_path or str(_DEFAULT_SCHEMAS)
        self.db = NSAASchemaDB()

    def export(self):
        data = self.db.get_all_data_for_export()
        if not data:
            return

        os.makedirs(os.path.dirname(self.output_path), exist_ok=True)
        
        md_content = "# NSAA Schemas - Restructured\n\n"
        
        current_subject = None
        
        for s in data:
            if s["subject"] != current_subject:
                current_subject = s["subject"]
                md_content += f"# **{current_subject.upper()} Schemas**\n\n"
            
            md_content += f"## **{s['id']}. {s['title']}**\n\n"
            md_content += f"**Core move:** {s['core_move']}\n\n"
            
            if s['context']:
                md_content += "**Seen in / context:**\n"
                for line in s['context'].split('\n'):
                    if line.strip():
                        md_content += f"- {line.strip()}\n"
                md_content += "\n"
                
            if s['wrong_paths']:
                md_content += "**Possible wrong paths:**\n"
                for line in s['wrong_paths'].split('\n'):
                    if line.strip():
                        md_content += f"- {line.strip()}\n"
                md_content += "\n"
                
            if s['notes']:
                md_content += "**Notes for generation:**\n"
                for line in s['notes'].split('\n'):
                    if line.strip():
                        md_content += f"- {line.strip()}\n"
                md_content += "\n"
                
            if s['exemplars']:
                md_content += "**Exemplar questions:**\n"
                for e in s['exemplars']:
                    md_content += f"- `{e['id']}`: {e['justification']}\n"
                md_content += "\n"
                
            md_content += "---\n\n"

        with open(self.output_path, "w", encoding="utf-8") as f:
            f.write(md_content)
        
        print(f"Exported {len(data)} schemas to {self.output_path}")

def run_periodic_export(interval: int = 60):
    exporter = MarkdownExporter()
    while True:
        try:
            exporter.export()
        except Exception as e:
            print(f"Export error: {e}")
        time.sleep(interval)

if __name__ == "__main__":
    exporter = MarkdownExporter()
    exporter.export()
















