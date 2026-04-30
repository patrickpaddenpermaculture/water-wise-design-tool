"""
rag_server.py — Paddy O RAG API Server
Wraps the Chroma vector DB and exposes endpoints for the Next.js app.

Start with: python rag_server.py
Runs on:    http://localhost:8765
"""

import os
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import chromadb
from chromadb.utils import embedding_functions

# ── Config ───────────────────────────────────────────────────────────────────
CHROMA_DIR = Path(r"C:\Users\ppadd_181oj\Desktop\Permaculture Consulting Business\RAG Source Docs\chroma_db")
EMB_MODEL  = "all-MiniLM-L6-v2"

app = FastAPI(title="Paddy O RAG Server", version="1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Load Chroma collection once at startup ────────────────────────────────────
_chroma_client = None
_collection = None

def get_collection():
    global _chroma_client, _collection
    if _collection is None:
        _chroma_client = chromadb.PersistentClient(path=str(CHROMA_DIR))
        emb_fn = embedding_functions.SentenceTransformerEmbeddingFunction(model_name=EMB_MODEL)
        _collection = _chroma_client.get_collection(
            name="paddy_o",
            embedding_function=emb_fn,
        )
    return _collection


# ── Request models ────────────────────────────────────────────────────────────
class QueryRequest(BaseModel):
    query: str
    n_results: int = 8
    doc_type: Optional[str] = None   # "design", "estimate", "plant", or None for all

class ContextRequest(BaseModel):
    exposure: str = "Full Sun"
    slope: str = "Flat"
    design_focus: str = ""
    aesthetic: str = ""
    edibles: list[str] = []
    native_planting: bool = True
    hardscape: bool = False
    hardscape_material: str = ""
    custom_notes: str = ""
    n_results: int = 12


# ── Helpers ───────────────────────────────────────────────────────────────────
def format_results(results):
    docs   = results["documents"][0]
    metas  = results["metadatas"][0]
    dists  = results["distances"][0]
    items  = []
    for doc, meta, dist in zip(docs, metas, dists):
        items.append({
            "score":   round(1 - dist, 3),
            "client":  meta.get("client", ""),
            "type":    meta.get("doc_type", ""),
            "file":    meta.get("file", ""),
            "page":    meta.get("page", 0),
            "text":    doc,
        })
    return items


# ── Routes ────────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    col = get_collection()
    return {"status": "ok", "chunks": col.count()}


@app.post("/query")
def query(req: QueryRequest):
    """Raw semantic search — returns top matching chunks."""
    col = get_collection()
    where = {"doc_type": req.doc_type} if req.doc_type else None
    results = col.query(
        query_texts=[req.query],
        n_results=req.n_results,
        where=where,
        include=["documents", "metadatas", "distances"],
    )
    return {"results": format_results(results)}


@app.post("/design-context")
def design_context(req: ContextRequest):
    """
    Build a rich design context string from the user's inputs.
    Pulls relevant plant list chunks, design doc chunks, and estimate chunks.
    Returns structured context ready to inject into an LLM prompt.
    """
    col = get_collection()

    # Build semantic search query from inputs
    edibles_str = ", ".join(req.edibles) if req.edibles else ""
    query_parts = [
        req.design_focus,
        req.aesthetic,
        req.exposure,
        req.slope,
        edibles_str,
        "native plants Colorado permaculture" if req.native_planting else "",
        req.hardscape_material if req.hardscape else "",
        req.custom_notes,
    ]
    query_str = " ".join(p for p in query_parts if p).strip()
    if not query_str:
        query_str = "Colorado permaculture landscape design native plants"

    # Pull plant chunks
    plant_results = col.query(
        query_texts=[query_str],
        n_results=6,
        where={"doc_type": "plant"},
        include=["documents", "metadatas", "distances"],
    )
    plant_chunks = format_results(plant_results)

    # Pull design doc chunks
    design_results = col.query(
        query_texts=[query_str],
        n_results=8,
        where={"doc_type": "design"},
        include=["documents", "metadatas", "distances"],
    )
    design_chunks = format_results(design_results)

    # Pull estimate chunks (for pricing context)
    estimate_results = col.query(
        query_texts=[f"installation estimate {req.design_focus} {req.aesthetic}"],
        n_results=4,
        where={"doc_type": "estimate"},
        include=["documents", "metadatas", "distances"],
    )
    estimate_chunks = format_results(estimate_results)

    # Build rich context block
    context_parts = []

    context_parts.append("## Patrick Padden's Past Plant Selections (from real designs):")
    for c in plant_chunks:
        if c["score"] > 0.3:
            context_parts.append(f"[Client: {c['client']}] {c['text'][:400]}")

    context_parts.append("\n## Patrick's Design Notes & Approaches (from real concept designs):")
    for c in design_chunks:
        if c["score"] > 0.3:
            context_parts.append(f"[Client: {c['client']}] {c['text'][:400]}")

    context_parts.append("\n## Pricing Reference (from real installation estimates):")
    for c in estimate_chunks:
        if c["score"] > 0.25:
            context_parts.append(f"[Client: {c['client']}] {c['text'][:300]}")

    context_block = "\n\n".join(context_parts)

    return {
        "query_used": query_str,
        "context": context_block,
        "plant_chunks": plant_chunks,
        "design_chunks": design_chunks,
        "estimate_chunks": estimate_chunks,
    }


if __name__ == "__main__":
    import uvicorn
    print("Starting Paddy O RAG Server on http://localhost:8765")
    print(f"Chroma DB: {CHROMA_DIR}")
    uvicorn.run(app, host="0.0.0.0", port=8765, log_level="info")
