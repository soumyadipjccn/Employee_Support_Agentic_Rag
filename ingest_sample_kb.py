import os
import sys
from pathlib import Path
from app.core.config import get_settings
from app.services.ingestion import load_file, chunk_documents, SUPPORTED
from app.rag.vectorstore import add_documents

def main():
    settings = get_settings()
    sample_dir = Path(settings.sample_kb_dir)
    
    if not sample_dir.exists():
        print(f"Sample KB directory not found: {sample_dir}")
        sys.exit(1)
        
    files = [f for f in sample_dir.iterdir() if f.suffix.lower() in SUPPORTED]
    if not files:
        print(f"No supported documents found in {sample_dir}")
        return
        
    print(f"Found {len(files)} document(s) in {sample_dir}: {[f.name for f in files]}")
    total_chunks = 0
    
    for file_path in files:
        print(f"Processing {file_path.name}...")
        docs = load_file(file_path)
        chunks = chunk_documents(docs)
        print(f"  Split into {len(chunks)} chunk(s). Adding to vector store...")
        ids = add_documents(chunks)
        total_chunks += len(chunks)
        print(f"  Successfully indexed {len(ids)} chunk(s).")
        
    print(f"\nIngestion completed! Total {total_chunks} chunk(s) indexed using model: {settings.embedding_model}")

if __name__ == "__main__":
    main()
