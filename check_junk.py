import sqlite3
import sys

def check_q():
    db_path = 'scripts/schema_generator/restructure/nsaa_state.db'
    q_id = 'NSAA_2018_Section1_Q3_NSAA_Sec'
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    cursor.execute('SELECT text FROM questions_queue WHERE question_id = ?', (q_id,))
    row = cursor.fetchone()
    if row:
        print(f"--- Text for {q_id} ---")
        print(row[0])
        print("------------------------")
    else:
        print(f"Question {q_id} not found in DB.")
    conn.close()

if __name__ == "__main__":
    check_q()

