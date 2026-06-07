from fastapi.staticfiles import StaticFiles
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from typing import Optional
from pydantic import BaseModel

from db import db
from datetime import datetime, timezone

from langchain_text_splitters import RecursiveCharacterTextSplitter

from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma
from auth_utils import hash_password, verify_password

from utils.document_reader import (
    extract_text_from_pdf,
    extract_text_from_image
)

from groq import Groq

from dotenv import load_dotenv

import shutil
import os

# ================= LOAD ENV =================
load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# ================= GROQ =================
client = None
if GROQ_API_KEY:
    client = Groq(
        api_key=GROQ_API_KEY
    )

def call_groq(prompt: str, json_mode: bool = False):
    if not client:
        return None
    try:
        extra_args = {}
        if json_mode:
            extra_args["response_format"] = {"type": "json_object"}

        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            model="llama-3.3-70b-versatile",
            **extra_args
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print("Groq Error:", e)
        return None

# ================= GEMINI =================
def call_gemini(prompt: str, json_mode: bool = False):
    if not GEMINI_API_KEY:
        return None
    try:
        import requests
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={GEMINI_API_KEY}"
        headers = {"Content-Type": "application/json"}
        
        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }
        
        if json_mode:
            payload["generationConfig"] = {
                "responseMimeType": "application/json"
            }
            
        r = requests.post(url, headers=headers, json=payload, timeout=20)
        r.raise_for_status()
        res_json = r.json()
        
        text_content = res_json['candidates'][0]['content']['parts'][0]['text']
        return text_content
    except Exception as e:
        print("Gemini Error:", e)
        return None

# ================= UNIFIED LLM CALL =================
def call_llm(prompt: str, json_mode: bool = False):
    if GEMINI_API_KEY:
        res = call_gemini(prompt, json_mode)
        if res:
            return res
    if GROQ_API_KEY:
        res = call_groq(prompt, json_mode)
        if res:
            return res
    return "AI service unavailable"

# ================= APP =================
app = FastAPI()


@app.exception_handler(PyMongoError)
async def pymongo_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Database connection error. Please ensure MongoDB is running."},
    )


@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal Server Error: {str(exc)}"},
    )

app.mount(
    "/uploads",
    StaticFiles(directory="uploads"),
    name="uploads"
)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex="https?://(localhost|127\\.0\\.0\\.1)(:\\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"

os.makedirs(
    UPLOAD_DIR,
    exist_ok=True
)

# ================= DATABASE =================
def get_db():
    return db

# ================= EMBEDDINGS =================
embeddings = HuggingFaceEmbeddings(
    model_name="all-MiniLM-L6-v2"
)

def get_user_vector_db(user_id: str):

    return Chroma(
        persist_directory=f"chroma_db/user_{user_id}",
        embedding_function=embeddings
    )

# ================= SCHEMAS =================
class TextData(BaseModel):
    text: str
    user_id: str

class Question(BaseModel):
    question: str
    user_id: str
    filename: Optional[str] = None

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

# ================= ROUTES =================

@app.post("/upload-text")
def upload_text(data: TextData):

    if not data.text.strip():

        raise HTTPException(
            status_code=400,
            detail="Text is empty"
        )

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = splitter.split_text(data.text)

    if not chunks:

        raise HTTPException(
            status_code=400,
            detail="No text chunks created"
        )

    vector_db = get_user_vector_db(data.user_id)

    vector_db.add_texts(
        texts=chunks,
        metadatas=[{"filename": "raw_text"} for _ in chunks]
    )

    return {
        "message": "Stored successfully"
    }

# ================= ASK =================

@app.post("/ask")
def ask_question(data: Question):

    vector_db = get_user_vector_db(data.user_id)

    filter_dict = {}
    if data.filename:
        filter_dict["filename"] = data.filename

    docs = vector_db.similarity_search(
        data.question,
        k=3,
        filter=filter_dict if filter_dict else None
    )

    if not docs:

        return {
            "answer": "No relevant document found",
            "quote": ""
        }

    context = "\n".join(
        doc.page_content for doc in docs
    )

    prompt = f"""
You are a legal AI assistant.

Based on the context below, answer the question and extract the exact full text phrase representing the answer to highlight in the PDF. The quote must contain literal word-for-word, case-sensitive substrings from the Context.

If the answer consists of a list of multiple distinct items, projects, dates, or names scattered in different parts of the document, the "quote" MUST be a comma-separated list of those exact phrases (e.g. "Item 1, Item 2, Item 3"). Do not paraphrase or change punctuation.

Respond in JSON format with these exact keys:
{{
  "answer": "your natural language answer here",
  "quote": "the exact full text phrase or comma-separated list of phrases from the context here"
}}

IMPORTANT: The "quote" (or each comma-separated phrase inside it) MUST be a literal word-for-word, case-sensitive substring from the Context below. If any phrase is not in the context, the PDF viewer will fail to highlight it.

Context:
{context}

Question:
{data.question}
"""

    answer_raw = call_llm(prompt, json_mode=True)

    import json
    try:
        data_json = json.loads(answer_raw)
        answer = data_json.get("answer", answer_raw)
        quote = data_json.get("quote", "")
    except Exception:
        answer = answer_raw
        quote = ""

    # Sanitize and ensure the quote parts literally exist in the context with advanced matching
    if quote:
        import re
        parts = [p.strip() for p in quote.split(",") if p.strip()]
        validated_parts = []
        
        for part in parts:
            part_lower = part.lower()
            context_lower = context.lower()
            
            if part_lower in context_lower:
                # Direct exact case-insensitive match: align case with context
                idx = context_lower.find(part_lower)
                validated_parts.append(context[idx:idx+len(part)])
            else:
                # Fuzzy match for this specific part
                clean_words = [re.sub(r'[^\w]', '', w) for w in part.split()]
                clean_words = [w for w in clean_words if w]
                if len(clean_words) >= 2:
                    first_word = clean_words[0]
                    last_word = clean_words[-1]
                    try:
                        pattern = re.compile(
                            re.escape(first_word) + r'.{0,120}?' + re.escape(last_word),
                            re.IGNORECASE | re.DOTALL
                        )
                        match = pattern.search(context)
                        if match:
                            validated_parts.append(match.group(0))
                    except Exception as e:
                        print("Regex match error:", e)
                elif len(clean_words) == 1:
                    single_word = clean_words[0]
                    try:
                        pattern = re.compile(re.escape(single_word), re.IGNORECASE)
                        match = pattern.search(context)
                        if match:
                            validated_parts.append(match.group(0))
                    except Exception as e:
                        print("Regex match error:", e)
        
        if validated_parts:
            quote = ", ".join(validated_parts)
        else:
            quote = ""

    # Increment QnA count for the document in MongoDB
    if data.filename:
        try:
            db.documents.update_one(
                {"user_id": data.user_id, "filename": data.filename},
                {"$inc": {"qna_count": 1}}
            )
        except Exception as e:
            print("Error incrementing qna_count:", e)

    return {
        "answer": answer,
        "quote": quote,
        "context": context
    }

# ================= AUTH =================

@app.post("/signup")
def signup(
    data: SignupRequest,
    db = Depends(get_db)
):

    existing = db.users.find_one({"email": data.email})

    if existing:

        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    user = {
        "name": data.name,
        "email": data.email,
        "password": hash_password(data.password),
        "created_at": datetime.now(timezone.utc)
    }

    db.users.insert_one(user)

    return {
        "message": "Signup successful"
    }

@app.post("/login")
def login(
    data: LoginRequest,
    db = Depends(get_db)
):

    user = db.users.find_one({"email": data.email})

    if not user:

        raise HTTPException(
            status_code=400,
            detail="Invalid credentials"
        )

    if not verify_password(
        data.password,
        user["password"]
    ):

        raise HTTPException(
            status_code=400,
            detail="Invalid credentials"
        )

    return {
        "message": "Login successful",
        "user": {
            "id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"]
        }
    }

# ================= FILE UPLOAD =================

@app.post("/upload")
async def upload_file(
    file: UploadFile = File(...)
):

    file_path = os.path.join(
        UPLOAD_DIR,
        file.filename
    )

    with open(file_path, "wb") as buffer:

        shutil.copyfileobj(
            file.file,
            buffer
        )

    return {
        "message": "File uploaded",
        "filename": file.filename
    }

# ================= INDEX DOCUMENT =================

@app.post("/upload-and-index")
async def upload_and_index(
    filename: str = Body(...),
    user_id: str = Body(...)
):

    file_path = f"uploads/{filename}"

    if not os.path.exists(file_path):

        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # ===== EXTRACT TEXT =====

    if filename.lower().endswith(".pdf"):

        text = extract_text_from_pdf(file_path)

    elif filename.lower().endswith(
        (".png", ".jpg", ".jpeg")
    ):

        text = extract_text_from_image(file_path)

    else:

        with open(
            file_path,
            "r",
            encoding="utf-8"
        ) as f:

            text = f.read()

    # ===== EMPTY TEXT CHECK =====

    if not text or not text.strip():

        raise HTTPException(
            status_code=400,
            detail="Could not extract text from document"
        )

    # ===== CLEAR PREVIOUS USER VECTOR INDEX =====
    db_path = f"chroma_db/user_{user_id}"
    if os.path.exists(db_path):
        try:
            shutil.rmtree(db_path, ignore_errors=True)
        except Exception as e:
            print("Failed to delete chroma_db directory:", e)

    # ===== SPLIT =====

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=500,
        chunk_overlap=50
    )

    chunks = splitter.split_text(text)

    if not chunks:

        raise HTTPException(
            status_code=400,
            detail="No chunks generated"
        )

    # ===== STORE =====

    vector_db = get_user_vector_db(user_id)

    vector_db.add_texts(
        texts=chunks,
        metadatas=[{"filename": filename} for _ in chunks]
    )

    # ===== DOCUMENT CLASSIFICATION AND SAFETY RULES =====
    text_snippet = text[:4000]
    classify_prompt = f"""
Analyze the following document content and classify its type (e.g., Aadhaar Card, PAN Card, Rent Agreement, Non-Disclosure Agreement (NDA), Employment Contract, Invoice, Generic Document, etc.).
Based on the document type, generate rules, regulations, precautions, and a list of "Dos and Don'ts" that the user should be aware of regarding this document (such as data privacy guidelines, legal validity, typical traps, and precautions to take).

Respond STRICTLY in JSON format with these exact keys:
{{
  "document_type": "The classified document type (e.g., Aadhaar Card)",
  "precautions": ["precaution 1", "precaution 2", ...],
  "dos": ["do 1", "do 2", ...],
  "donts": ["dont 1", "dont 2", ...]
}}

Document Text Snippet:
{text_snippet}
"""
    analysis_raw = call_llm(classify_prompt, json_mode=True)
    
    import json
    try:
        analysis = json.loads(analysis_raw)
    except Exception as e:
        print("Failed to parse classification JSON, using fallback:", e)
        analysis = {
            "document_type": "Generic Document",
            "precautions": ["Ensure the source of the document is verified.", "Store the document securely to protect sensitive data."],
            "dos": ["Read all terms carefully before signing or submitting.", "Verify signatures, dates, and names."],
            "donts": ["Do not share with unauthorized individuals.", "Do not ignore hidden clauses or fees."]
        }

    # ===== SAVE METADATA TO MONGODB =====
    try:
        doc_metadata = {
            "user_id": user_id,
            "filename": filename,
            "uploaded_at": datetime.now(timezone.utc),
            "document_type": analysis.get("document_type", "Generic Document"),
            "analysis": analysis,
            "qna_count": 0
        }
        db.documents.update_one(
            {"user_id": user_id, "filename": filename},
            {"$set": doc_metadata},
            upsert=True
        )
    except Exception as e:
        print("Failed to save document metadata in MongoDB:", e)

    return {
        "message": "Document indexed successfully",
        "chunks": len(chunks),
        "analysis": analysis
    }

# ================= HISTORY ENDPOINT =================

@app.get("/history")
def get_history(user_id: str):
    try:
        docs = list(db.documents.find({"user_id": user_id}).sort("uploaded_at", -1))
        serialized_docs = []
        for doc in docs:
            serialized_docs.append({
                "id": str(doc["_id"]),
                "filename": doc["filename"],
                "uploaded_at": doc["uploaded_at"].isoformat() if isinstance(doc["uploaded_at"], datetime) else doc["uploaded_at"],
                "document_type": doc.get("document_type", "Generic Document"),
                "analysis": doc.get("analysis", {}),
                "qna_count": doc.get("qna_count", 0)
            })
        return serialized_docs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================= ANALYTICS ENDPOINT =================

@app.get("/analytics")
def get_analytics(user_id: str):
    try:
        docs = list(db.documents.find({"user_id": user_id}))
        
        total_docs = len(docs)
        total_questions = sum(doc.get("qna_count", 0) for doc in docs)
        
        # Calculate document type distribution
        type_distribution = {}
        for doc in docs:
            doc_type = doc.get("document_type", "Generic Document")
            type_distribution[doc_type] = type_distribution.get(doc_type, 0) + 1
            
        # Compile recent activity (last 5 uploads)
        sorted_docs = sorted(docs, key=lambda x: x.get("uploaded_at", datetime.min), reverse=True)
        recent_activity = []
        for doc in sorted_docs[:5]:
            recent_activity.append({
                "filename": doc["filename"],
                "uploaded_at": doc["uploaded_at"].isoformat() if isinstance(doc["uploaded_at"], datetime) else doc["uploaded_at"],
                "document_type": doc.get("document_type", "Generic Document"),
                "qna_count": doc.get("qna_count", 0)
            })
            
        return {
            "total_documents": total_docs,
            "total_questions": total_questions,
            "type_distribution": type_distribution,
            "recent_activity": recent_activity
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ================= TEST =================

@app.get("/")
def home():

    return {
        "msg": "LexAI backend running"
    }

@app.get("/db-test")
def db_test():

    try:

        db.command("ping")

        return {
            "message": "Database connected"
        }

    except Exception as e:

        return {
            "error": str(e)
        }

@app.get("/test-groq")
def test_groq():

    try:

        reply = call_groq(
            "Say hello"
        )

        return {
            "reply": reply
        }

    except Exception as e:

        return {
            "error": str(e)
        }