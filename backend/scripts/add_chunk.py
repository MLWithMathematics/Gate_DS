"""
add_chunk.py — Add a single custom syllabus chunk to Supabase
==============================================================

Usage:
    python scripts/add_chunk.py \
        --subject "Machine Learning" \
        --topic "Attention Mechanism" \
        --file my_notes.txt        # read content from file

    python scripts/add_chunk.py \
        --subject "Statistics" \
        --topic "ANOVA" \
        --content "ANOVA tests equality of means across groups..."

    python scripts/add_chunk.py --list      # show all existing chunks
    python scripts/add_chunk.py --delete <id>  # remove a chunk by ID
"""

import argparse
import os
import sys
import logging
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from dotenv import load_dotenv
load_dotenv(ROOT / ".env")

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
log = logging.getLogger(__name__)

VALID_SUBJECTS = [
    "Mathematics", "Statistics", "Machine Learning", "Deep Learning",
    "Data Science", "Programming", "Linear Algebra", "Probability",
    "Algorithms", "Databases",
]


def get_clients():
    url = os.getenv("SUPABASE_URL", "")
    service_key = os.getenv("SUPABASE_SERVICE_KEY", "")  # ✅ use service role key
    if not url or not service_key:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be in .env")
        sys.exit(1)
    from supabase import create_client
    from sentence_transformers import SentenceTransformer
    return create_client(url, service_key), SentenceTransformer("all-MiniLM-L6-v2")  # ✅ bypasses RLS


def cmd_add(args):
    content = ""
    if args.file:
        path = Path(args.file)
        if not path.exists():
            log.error(f"File not found: {args.file}")
            sys.exit(1)
        content = path.read_text(encoding="utf-8").strip()
        log.info(f"Read {len(content)} chars from {args.file}")
    elif args.content:
        content = args.content.strip()
    else:
        log.info("Paste your content below (Ctrl+D / Ctrl+Z to finish):")
        content = sys.stdin.read().strip()

    if not content:
        log.error("Content cannot be empty")
        sys.exit(1)

    if args.subject not in VALID_SUBJECTS:
        log.warning(f"Subject '{args.subject}' is not in the standard list: {VALID_SUBJECTS}")
        confirm = input("Continue anyway? [y/N]: ").strip().lower()
        if confirm != "y":
            sys.exit(0)

    subtopics = [s.strip() for s in args.subtopics.split(",")] if args.subtopics else []

    db, model = get_clients()

    # Check duplicate
    existing = db.table("syllabus_chunks").select("id").eq("subject", args.subject).eq("topic", args.topic).execute()
    if existing.data:
        log.warning(f"A chunk already exists for [{args.subject}] → {args.topic} (ID: {existing.data[0]['id']})")
        confirm = input("Overwrite it? [y/N]: ").strip().lower()
        if confirm == "y":
            db.table("syllabus_chunks").delete().eq("id", existing.data[0]["id"]).execute()
            log.info("Deleted old chunk.")
        else:
            log.info("Aborted.")
            sys.exit(0)

    log.info("Generating embedding...")
    embed_text = f"{args.subject}. {args.topic}. {content}"
    embedding = model.encode(embed_text, normalize_embeddings=True).tolist()
    log.info(f"Embedding generated ({len(embedding)} dims)")

    result = db.table("syllabus_chunks").insert({
        "subject": args.subject,
        "topic": args.topic,
        "content": content,
        "subtopics": subtopics,
        "embedding": embedding,
    }).execute()

    if result.data:
        log.info(f"✅ Inserted! ID: {result.data[0]['id']}")
        log.info(f"   Subject  : {args.subject}")
        log.info(f"   Topic    : {args.topic}")
        log.info(f"   Content  : {content[:80]}...")
    else:
        log.error("Insert failed. Check Supabase logs.")


def cmd_list(args):
    db, _ = get_clients()
    result = db.table("syllabus_chunks").select("id, subject, topic, subtopics").order("subject").execute()
    rows = result.data or []
    if not rows:
        print("No chunks found.")
        return
    print(f"\n{'ID':<38} {'Subject':<20} {'Topic':<30} Subtopics")
    print("-" * 100)
    for r in rows:
        subs = ", ".join(r.get("subtopics") or [])
        print(f"{r['id']:<38} {r['subject']:<20} {r['topic']:<30} {subs}")
    print(f"\nTotal: {len(rows)} chunks")


def cmd_delete(args):
    db, _ = get_clients()
    result = db.table("syllabus_chunks").delete().eq("id", args.delete).execute()
    if result.data:
        log.info(f"✅ Deleted chunk: {args.delete}")
    else:
        log.error(f"Chunk not found or already deleted: {args.delete}")


def cmd_search(args):
    """Test the vector search for a query."""
    db, model = get_clients()
    embedding = model.encode(args.search, normalize_embeddings=True).tolist()
    result = db.rpc("match_syllabus_chunks", {
        "query_embedding": embedding,
        "match_count": args.top_k,
    }).execute()
    rows = result.data or []
    if not rows:
        print("No results found.")
        return
    print(f"\nTop {len(rows)} results for: '{args.search}'\n")
    for i, r in enumerate(rows, 1):
        print(f"{i}. [{r['subject']}] {r['topic']} — similarity: {r.get('similarity', 0):.4f}")
        print(f"   {r['content'][:150].strip()}...\n")


def main():
    parser = argparse.ArgumentParser(description="Manage GATE DS syllabus chunks in Supabase")
    parser.add_argument("--subject", "-s", help="Subject name")
    parser.add_argument("--topic", "-t", help="Topic name")
    parser.add_argument("--content", "-c", help="Content text (inline)")
    parser.add_argument("--file", "-f", help="Path to .txt file with content")
    parser.add_argument("--subtopics", help="Comma-separated subtopic list")
    parser.add_argument("--list", "-l", action="store_true", help="List all chunks")
    parser.add_argument("--delete", "-d", metavar="ID", help="Delete chunk by ID")
    parser.add_argument("--search", help="Test vector search with this query")
    parser.add_argument("--top-k", type=int, default=3, help="Number of search results")

    args = parser.parse_args()

    if args.list:
        cmd_list(args)
    elif args.delete:
        cmd_delete(args)
    elif args.search:
        cmd_search(args)
    elif args.subject and args.topic:
        cmd_add(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()