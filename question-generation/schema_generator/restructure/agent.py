import os
import json
import uuid
import yaml
import time
from pathlib import Path
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from dotenv import load_dotenv
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from db import NSAASchemaDB

# Load environment variables
def load_env():
    # Go up from scripts/schema_generator/restructure/ to project root
    base_dir = Path(__file__).parent.parent.parent.parent
    env_path = base_dir / ".env.local"
    if env_path.exists():
        load_dotenv(env_path)
    else:
        print(f"Warning: .env.local not found at {env_path}")

load_env()

# Configure Gemini
api_key = os.environ.get("GEMINI_API_KEY")
if not api_key:
    print("Error: GEMINI_API_KEY not found in environment variables.")
else:
    genai.configure(api_key=api_key)

# Model choice: User explicitly requested Gemini Flash 2.5
GEMINI_MODEL_NAME = "gemini-2.5-flash"

class SchemaAgent:
    def __init__(self, worker_id: str):
        self.worker_id = worker_id
        self.db = NSAASchemaDB()
        try:
            self.model = genai.GenerativeModel(
                model_name=GEMINI_MODEL_NAME,
                generation_config={"response_mime_type": "application/json"}
            )
        except Exception as e:
            print(f"Error initializing model {GEMINI_MODEL_NAME}: {e}")
            print("Attempting fallback to gemini-2.0-flash...")
            self.model = genai.GenerativeModel(
                model_name="gemini-2.0-flash",
                generation_config={"response_mime_type": "application/json"}
            )

    def get_top_5_candidates(self, question_text: str, subject: str) -> List[Dict[str, Any]]:
        existing_schemas = self.db.get_schemas_by_subject(subject)
        if not existing_schemas:
            return []
        
        if len(existing_schemas) <= 5:
            return existing_schemas

        # Simple TF-IDF similarity
        texts = [q["core_move"] + " " + q["title"] for q in existing_schemas]
        texts.append(question_text)
        
        try:
            vectorizer = TfidfVectorizer(stop_words='english')
            tfidf_matrix = vectorizer.fit_transform(texts)
            
            # Compare last element (question) with all others
            cosine_sim = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])
            
            # Get indices of top 5
            sim_scores = list(enumerate(cosine_sim[0]))
            sim_scores = sorted(sim_scores, key=lambda x: x[1], reverse=True)
            
            top_5_indices = [i for i, score in sim_scores[:5]]
            return [existing_schemas[i] for i in top_5_indices]
        except Exception as e:
            print(f"Error in similarity search: {e}")
            return existing_schemas[:5]

    def process_next(self):
        question = self.db.get_next_pending_question(self.worker_id)
        if not question:
            return False

        qid = question["question_id"]
        text = question["text"]
        subject = question["subject"]
        
        print(f"[{self.worker_id}] Processing {qid} ({subject})...")

        candidates = self.get_top_5_candidates(text, subject)
        
        prompt = self._build_prompt(text, subject, candidates)
        
        try:
            response = self.model.generate_content(prompt)
            
            if not response.text:
                raise ValueError("Empty response from Gemini")
                
            result = json.loads(response.text)
            self._handle_decision(qid, subject, result)
            self.db.mark_question_done(qid)
            return True
            
        except Exception as e:
            print(f"Error processing question {qid}: {e}")
            # Mark as skipped if error persists
            self.db.mark_question_skipped(qid)
            return True

    def _build_prompt(self, question_text: str, subject: str, candidates: List[Dict[str, Any]]) -> str:
        candidates_str = ""
        for c in candidates:
            candidates_str += f"- ID: {c['id']}\n  Title: {c['title']}\n  Core Move: {c['core_move']}\n\n"
            
        return f"""
Analyze the following {subject} question from an NSAA paper:

QUESTION:
\"\"\"
{question_text}
\"\"\"

Below are existing thinking patterns (schemas) for {subject}:
{candidates_str if candidates_str else "No existing schemas found."}

TASK:
1. Determine if this question matches one of the existing schemas with >85% confidence.
   A match means the core mathematical/scientific thinking required to solve the question is the same as described in the 'Core Move'.
2. If it matches, return "decision": "match", "schema_id": "[ID]", and a brief "justification".
3. If it does not match any existing schema well enough, or if no schemas were provided, return "decision": "new".
4. If "new", you must generate a full schema definition including:
   - "title": (3-8 words, describing the thinking pattern, NOT the topic)
   - "core_move": (exactly ONE sentence, actionable, e.g., "Infer...", "Exploit...", "Apply...")
   - "context": (bullet points of where this pattern appears)
   - "wrong_paths": (bullet points of common mistakes)
   - "notes": (guidelines for generating similar questions)

Return your response in JSON format.

EXAMPLE MATCH:
{{
  "decision": "match",
  "schema_id": "M_a1b2c3d4",
  "justification": "This question requires scaling a quantity linearly, which matches the core move of M_a1b2c3d4."
}}

EXAMPLE NEW:
{{
  "decision": "new",
  "schema": {{
    "title": "Conservation of Energy in Collisions",
    "core_move": "Apply the principle of conservation of total energy to determine the final velocities of colliding objects.",
    "context": ["Inelastic collisions with heat loss", "Elastic collisions in a vacuum"],
    "wrong_paths": ["Forgetting to include kinetic energy", "Assuming momentum is conserved but energy is not"],
    "notes": ["Ensure the system is closed", "Values should lead to integer results"]
  }}
}}
"""

    def _handle_decision(self, qid: str, subject: str, result: Dict[str, Any]):
        decision = result.get("decision")
        
        if decision == "match":
            schema_id = result.get("schema_id")
            justification = result.get("justification", "Matches existing pattern.")
            self.db.add_exemplar(schema_id, qid, justification)
            print(f"  Matched with {schema_id}")
            
        elif decision == "new":
            schema_data = result.get("schema", {})
            # Generate a new hex ID
            prefix = subject[0].upper() if subject else "M"
            new_id = f"{prefix}_{uuid.uuid4().hex[:8]}"
            
            self.db.add_schema(
                new_id,
                subject,
                schema_data.get("title", "New Schema"),
                schema_data.get("core_move", ""),
                "\n".join(schema_data.get("context", [])),
                "\n".join(schema_data.get("wrong_paths", [])),
                "\n".join(schema_data.get("notes", []))
            )
            self.db.add_exemplar(new_id, qid, "Initial exemplar for new schema.")
            print(f"  Created new schema: {new_id}")

if __name__ == "__main__":
    import sys
    worker_name = sys.argv[1] if len(sys.argv) > 1 else "Agent-1"
    agent = SchemaAgent(worker_name)
    while agent.process_next():
        pass
