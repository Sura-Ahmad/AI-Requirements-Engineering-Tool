# to store uploaded pdf files from admins (break it into pieces,embidding and store in qdrant)
# for semantic similarity search 
import logging
import uuid  # create ID for each chunck
import os    # to deal with windows system (paths-instead or writing the whole path/ only file name)
import pdfplumber # extract text from pdf files
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue, PayloadSchemaType
from app.core.config import settings
from sentence_transformers import SentenceTransformer #library to transform texts into embeddings

logger = logging.getLogger("requirements_ai")

COLLECTION_NAME = "knowledge_base" #Table name inside qdrant
CHUNK_SIZE = 500 #maximum number of words in each chunck
VECTOR_SIZE = 384 # size of the embedding vector produced by "all-MiniLM-L6-v2" model (384 dimensions)

_qdrant_client = None #for everything that uses ai
_model = None #for SentenceTransform


def _get_qdrant_client() -> QdrantClient:
    global _qdrant_client
    if _qdrant_client is None:
        _qdrant_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY) #create qdrant object
    try:
        _qdrant_client.get_collections() #to make sure the connection is still alive
    except Exception:
        logger.warning("Qdrant connection lost — reconnecting")
        _qdrant_client = QdrantClient(url=settings.QDRANT_URL, api_key=settings.QDRANT_API_KEY)
    return _qdrant_client


def _get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model


def _kb_path() -> str:
    return settings.KNOWLEDGE_BASE_PATH


def text_to_embedding(text: str) -> list:
    return _get_model().encode(text).tolist()


def ensure_collection():  #to make sure collection exist before using it , and if not to create new one
    client = _get_qdrant_client()
    existing = [c.name for c in client.get_collections().collections]
    if COLLECTION_NAME not in existing:
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=VectorParams(size=VECTOR_SIZE, distance=Distance.COSINE),
        )
    for field in ("domain", "country", "entry_id"):
        try:
            client.create_payload_index(
                collection_name=COLLECTION_NAME,
                field_name=field,
                field_schema=PayloadSchemaType.KEYWORD,
            )
        except Exception:
            pass


def retrieve_context(domain: str, query: str, limit: int = 5, country: str = "") -> str:
    try:
        embedding = text_to_embedding(query)
        must_conditions = [{"key": "domain", "match": {"value": domain}}]
        if country:
            must_conditions.append({"key": "country", "match": {"value": country}})
        results = _get_qdrant_client().query_points(
            collection_name=COLLECTION_NAME,
            query=embedding,
            query_filter={"must": must_conditions},
            limit=limit,
        ).points
        sources = [r.payload.get("source", "?") for r in results]
        logger.info("KB retrieve: domain=%s country=%s → %d chunks found: %s", domain, country, len(results), sources)
        return "\n\n".join([r.payload["text"] for r in results]) if results else ""
    except Exception:
        logger.exception("Qdrant search error for domain: %s", domain)
        return ""


def chunk_text(text: str, chunk_size: int = CHUNK_SIZE) -> list:
    words = text.split()
    return [
        " ".join(words[i : i + chunk_size])
        for i in range(0, len(words), chunk_size)
        if " ".join(words[i : i + chunk_size]).strip()
    ]


def load_pdf(file_path: str, domain: str, country: str = "JO", entry_id: str = "") -> int:
    """Extract text from a PDF, embed it, and upsert into Qdrant. Returns chunk count."""
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            text += page.extract_text() or "" #gathering the texts (if blank page also so the app wont breakdown)

    if not text.strip():
        return 0

    chunks = chunk_text(text)
    points = [
        PointStruct(
            id=str(uuid.uuid4()),
            vector=text_to_embedding(chunk),
            payload={ #the data we want to store in qdrant for each chunk (Metadat)
                "text": chunk,
                "domain": domain,
                "country": country,
                "entry_id": entry_id,
                "source": os.path.basename(file_path),
            },
        )
        for chunk in chunks
    ]

    if points:
        _get_qdrant_client().upsert(collection_name=COLLECTION_NAME, points=points)
        # upsert (update+insert / if new insert and if exist update) - safety even if every chunck has unique ID

    return len(points)


def _delete_from_qdrant(entry_id: str):
    _get_qdrant_client().delete(
        collection_name=COLLECTION_NAME,
        points_selector=Filter(
            must=[
                FieldCondition(key="entry_id", match=MatchValue(value=entry_id)),
            ]
        ),
    )
