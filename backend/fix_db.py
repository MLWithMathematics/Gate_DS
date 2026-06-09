import os
import sys
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))
load_dotenv(ROOT / ".env")

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")

db = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

# Get all unique subjects
res = db.table("mcqs").select("subject").execute()
subjects = set([row["subject"] for row in res.data])
print("Unique subjects in DB:", subjects)

# Update invalid ones
res = db.table("mcqs").update({"subject": "Data Science"}).eq("subject", "Data Science & Artificial Intelligence").execute()
print("Updated records:", len(res.data))

# Also fix AI if it used other invalid names
valid = ['Mathematics', 'Statistics', 'Machine Learning', 'Deep Learning', 'Data Science', 'Programming', 'Linear Algebra', 'Probability', 'Algorithms', 'Databases', 'Mixed']
for s in subjects:
    if s not in valid:
        print(f"INVALID SUBJECT FOUND: {s}")
