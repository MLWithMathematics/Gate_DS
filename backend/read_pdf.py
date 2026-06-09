import sys
import fitz # PyMuPDF

pdf_path = r"d:\gate-da-platform\1.pdf"
try:
    doc = fitz.open(pdf_path)
    with open("pdf_preview.txt", "w", encoding="utf-8") as f:
        f.write(f"Total pages: {len(doc)}\n")
        for i in range(min(2, len(doc))):
            f.write(f"--- Page {i} ---\n")
            text = doc[i].get_text("text")
            f.write(text[:1000] + "\n")
except Exception as e:
    print("Error:", e)
