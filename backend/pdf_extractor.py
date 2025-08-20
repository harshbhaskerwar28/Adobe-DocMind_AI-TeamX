from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from pydantic import BaseModel, Field
import fitz
import os
import tempfile
from typing import List, Dict, Any, Optional
import json
from dotenv import load_dotenv
import uuid
import shutil
from datetime import datetime
import google.generativeai as genai
import re
from pathlib import Path

# Import our custom modules
from vector_db_manager import VectorDBManager
from ai_insights_manager import AIInsightsManager

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize services on startup"""
    print("🚀 Starting Adobe Finals AI-Powered Document Analysis API")
    
    # Create static directory if it doesn't exist
    static_dir = Path("static")
    static_dir.mkdir(exist_ok=True)
    print(f"📁 Static directory: {'Created' if not static_dir.exists() else 'Exists'} - {static_dir.absolute()}")
    
    print(f"📊 Vector Database: {vector_db.get_database_stats()}")
    print(f"🤖 AI Insights: {'Available' if ai_insights else 'Not Available (missing GOOGLE_API_KEY)'}")
    yield
    print("🛑 Shutting down Adobe Finals API")

app = FastAPI(
    title="Adobe Finals AI-Powered Document Analysis API", 
    version="1.0.0",
    lifespan=lifespan
)

# CORS for frontend - More robust configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173", 
        "http://localhost:8080",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:8080"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Accept", "Accept-Language", "Content-Language", "Content-Type"],
)

# Serve static files for audio and frontend
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

# Create static directory if it doesn't exist
static_dir = Path("static")
static_dir.mkdir(exist_ok=True)

# Mount static files for audio and other assets
app.mount("/static", StaticFiles(directory="static"), name="static")

# Serve frontend static files
@app.get("/")
async def serve_frontend():
    """Serve the frontend index.html file"""
    index_path = Path("static/index.html")
    if index_path.exists():
        return FileResponse(index_path)
    else:
        return {"message": "Frontend not found. Please ensure the frontend is built and copied to static/ directory."}

@app.get("/{path:path}")
async def serve_frontend_routes(path: str):
    """Serve frontend routes and static files"""
    # Check if it's an API route
    if path.startswith("api/") or path.startswith("health"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Try to serve static files
    static_path = Path("static") / path
    if static_path.exists() and static_path.is_file():
        return FileResponse(static_path)
    
    # For SPA routing, serve index.html
    index_path = Path("static/index.html")
    if index_path.exists():
        return FileResponse(index_path)
    
    raise HTTPException(status_code=404, detail="File not found")

# Initialize AI components
vector_db = VectorDBManager()
ai_insights = None

# Initialize AI Insights Manager with error handling
try:
    ai_insights = AIInsightsManager()
    print("✅ AI Insights Manager initialized successfully")
except Exception as e:
    print(f"⚠️ Warning: AI Insights Manager failed to initialize: {e}")
    print("📝 Make sure to set GOOGLE_API_KEY environment variable for AI features")

# Root endpoint is now handled by serve_frontend()

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "backend is running"}

@app.post("/extract-pdf")
async def extract_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        # Read file content
        content = await file.read()
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_file:
            temp_file.write(content)
            temp_path = temp_file.name
        
        try:
            # Extract text using PyMuPDF
            doc = fitz.open(temp_path)
            full_text = ""
            
            for page_num in range(doc.page_count):
                page = doc[page_num]
                page_text = page.get_text()
                full_text += page_text + "\n\n"
            
            result = {
                "filename": file.filename,
                "page_count": doc.page_count,
                "text": full_text.strip()
            }
            
            # Auto-add to vector database for similarity search
            try:
                file_id = str(uuid.uuid4())
                success = vector_db.add_document(
                    document_content=full_text.strip(),
                    filename=file.filename,
                    file_id=file_id,
                    additional_metadata={
                        "upload_timestamp": datetime.now().isoformat(),
                        "pages": doc.page_count,
                        "extraction_method": "upload"
                    }
                )
                if success:
                    result["vector_db_added"] = True
                    result["file_id"] = file_id
                    print(f"✅ Document {file.filename} added to vector database")
                else:
                    result["vector_db_added"] = False
                    print(f"⚠️ Failed to add {file.filename} to vector database")
            except Exception as e:
                print(f"⚠️ Error adding to vector database: {e}")
                result["vector_db_added"] = False
            
            doc.close()
            return result
            
        finally:
            os.unlink(temp_path)
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")

# Pydantic models for API requests
class PDFPathRequest(BaseModel):
    file_path: str

class SimilaritySearchRequest(BaseModel):
    query_text: str
    top_k: int = 10
    min_similarity: float = 0.3
    request_type: Optional[str] = "similarity_search"
    source: Optional[str] = "unknown"
    timestamp: Optional[str] = None

class AIInsightsRequest(BaseModel):
    selected_text: str
    context: Optional[str] = None
    request_type: Optional[str] = "ai_insights"
    source: Optional[str] = "unknown"
    timestamp: Optional[str] = None

class DocumentUploadRequest(BaseModel):
    filename: str
    content: str
    file_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class PodcastRequest(BaseModel):
    selected_text: str
    context: Optional[str] = None
    request_type: str = "podcast_generation"
    source: str = "text_selection"
    timestamp: str = Field(default_factory=lambda: datetime.now().isoformat())

# PDF Chatbot request/response models
class PDFChatRequest(BaseModel):
    question: str
    pdf_content: str
    pdf_name: str

class PDFChatResponse(BaseModel):
    answer: str
    confidence: float
    is_relevant: bool
    context_used: Optional[str] = None

class RemoveDocumentRequest(BaseModel):
    document_name: str
    document_path: str

class RemoveDocumentResponse(BaseModel):
    success: bool
    message: str
    removed_count: int

class PodcastRecommendation(BaseModel):
    title: str
    description: str
    duration: str
    category: str
    script: str
    key_topics: List[str]
    target_audience: str

class PodcastRecommendationsResponse(BaseModel):
    recommendations: List[PodcastRecommendation]
    based_on_documents: int
    generation_timestamp: str
    summary: str

@app.post("/extract-pdf-path")
async def extract_pdf_path(data: PDFPathRequest):
    file_path = data.file_path
    print(f"DEBUG: Received file path: {file_path}")
    print(f"DEBUG: File exists: {os.path.exists(file_path)}")
    
    if not file_path:
        raise HTTPException(status_code=400, detail="No file path provided")
    
    if not os.path.exists(file_path):
        # Try to find the file in common locations
        possible_paths = [
            file_path,
            os.path.join(os.getcwd(), file_path),
            os.path.join(os.getcwd(), "data", file_path),
            os.path.join(os.getcwd(), "..", file_path)
        ]
        
        found_path = None
        for path in possible_paths:
            if os.path.exists(path):
                found_path = path
                break
        
        if not found_path:
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
        
        file_path = found_path
        print(f"DEBUG: Using found path: {file_path}")
    
    if not file_path.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    try:
        print(f"DEBUG: Starting PDF extraction for: {file_path}")
        
        # Extract text using PyMuPDF
        doc = fitz.open(file_path)
        print(f"DEBUG: Opened PDF successfully, page count: {doc.page_count}")
        
        full_text = ""
        
        # Limit to prevent infinite loops on corrupted PDFs
        max_pages = min(doc.page_count, 100)  # Limit to 100 pages max
        
        for page_num in range(max_pages):
            print(f"DEBUG: Processing page {page_num + 1}/{max_pages}")
            try:
                page = doc[page_num]
                page_text = page.get_text()
                full_text += page_text + "\n\n"
            except Exception as page_error:
                print(f"DEBUG: Error on page {page_num + 1}: {page_error}")
                continue
        
        filename = os.path.basename(file_path)
        
        result = {
            "filename": filename,
            "page_count": doc.page_count,
            "text": full_text.strip() if full_text.strip() else "No text content found in PDF"
        }
        
        print(f"DEBUG: Successfully extracted {len(full_text)} characters")
        doc.close()
        return result
        
    except Exception as e:
        print(f"DEBUG: Exception during PDF extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error extracting PDF: {str(e)}")

# ============ AI-POWERED ENDPOINTS ============

@app.post("/similarity-search")
async def similarity_search(request: SimilaritySearchRequest):
    """
    Find similar content across all documents in the vector database
    """
    try:
        print(f"\n🔍 ===== SIMILARITY SEARCH REQUEST =====")
        print(f"🔍 Query text: {request.query_text}")
        print(f"🔍 Query length: {len(request.query_text)}")
        print(f"🔍 Request type: {request.request_type}")
        print(f"🔍 Source: {request.source}")
        print(f"🔍 Timestamp: {request.timestamp}")
        print(f"🔍 Top K: {request.top_k}")
        print(f"🔍 Min similarity: {request.min_similarity}")
        print(f"🔍 Vector DB stats: {vector_db.get_database_stats()}")
        print(f"🔍 ===================================")
        
        results = vector_db.search_similar(
            query=request.query_text,
            top_k=request.top_k,
            min_similarity=request.min_similarity
        )
        
        print(f"🔍 Search completed - found {len(results)} results")
        
        response = {
            "query": request.query_text,
            "results": results,
            "total_found": len(results),
            "search_timestamp": datetime.now().isoformat()
        }
        
        print(f"🔍 Returning response with {len(results)} results")
        return response
        
    except Exception as e:
        print(f"❌ Error in similarity search: {e}")
        print(f"❌ Error type: {type(e)}")
        import traceback
        print(f"❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Similarity search failed: {str(e)}")

@app.post("/ai-insights")
async def generate_ai_insights(request: AIInsightsRequest):
    """
    Generate AI-powered insights using Gemini 2.5 Pro
    """
    try:
        print(f"\n🧠 ===== AI INSIGHTS REQUEST =====")
        print(f"🧠 Selected text: {request.selected_text}")
        print(f"🧠 Text length: {len(request.selected_text)}")
        print(f"🧠 Request type: {request.request_type}")
        print(f"🧠 Source: {request.source}")
        print(f"🧠 Timestamp: {request.timestamp}")
        print(f"🧠 Context: {request.context}")
        print(f"🧠 AI Service available: {ai_insights is not None}")
        print(f"🧠 Vector DB stats: {vector_db.get_database_stats()}")
        print(f"🧠 ==============================")
        
        if not ai_insights:
            print(f"🧠 ❌ AI Insights service not available - missing GOOGLE_API_KEY")
            raise HTTPException(
                status_code=503, 
                detail="AI Insights service is not available. Please configure GOOGLE_API_KEY."
            )
        
        print(f"🧠 Starting similar documents search...")
        # First, find similar documents
        similar_docs = vector_db.search_similar(
            query=request.selected_text,
            top_k=10,
            min_similarity=0.2
        )
        print(f"🧠 Found {len(similar_docs)} similar documents")
        
        # Get all documents for comprehensive analysis
        all_docs = []
        if vector_db.documents:
            for i, (doc, meta) in enumerate(zip(vector_db.documents[:50], vector_db.metadata[:50])):
                all_docs.append({
                    'content': doc,
                    'metadata': meta
                })
        print(f"🧠 Using {len(all_docs)} documents for analysis")
        
        print(f"🧠 Calling AI insights generation...")
        # Generate insights
        insights_result = ai_insights.generate_ai_insights(
            selected_text=request.selected_text,
            all_documents=all_docs,
            similar_documents=similar_docs
        )
        print(f"🧠 AI insights generation completed successfully")
        
        response = {
            "selected_text": request.selected_text,
            "insights": insights_result,
            "related_documents": len(similar_docs),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
        print(f"🧠 Returning AI insights response")
        return response
        
    except Exception as e:
        print(f"🧠 ❌ Error generating AI insights: {e}")
        print(f"🧠 ❌ Error type: {type(e)}")
        import traceback
        print(f"🧠 ❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"AI insights generation failed: {str(e)}")

@app.post("/similarity-analysis")
async def generate_similarity_analysis(request: AIInsightsRequest):
    """
    Generate detailed similarity analysis with AI explanations
    """
    try:
        if not ai_insights:
            raise HTTPException(
                status_code=503, 
                detail="AI Analysis service is not available. Please configure GOOGLE_API_KEY."
            )
        
        print(f"🔗 Generating similarity analysis for: {request.selected_text[:100]}...")
        
        # Find similar documents
        similar_docs = vector_db.search_similar(
            query=request.selected_text,
            top_k=8,
            min_similarity=0.25
        )
        
        if not similar_docs:
            return {
                "selected_text": request.selected_text,
                "analysis": {
                    "summary": "No similar content found in the document library.",
                    "connections": [],
                    "key_insights": ["This appears to be unique content"],
                    "suggested_follow_up": "Consider uploading more related documents to find connections"
                },
                "similar_documents": 0,
                "analysis_timestamp": datetime.now().isoformat()
            }
        
        # Generate AI analysis
        context_docs = [request.context] if request.context else None
        analysis_result = ai_insights.generate_similarity_analysis(
            selected_text=request.selected_text,
            similar_documents=similar_docs,
            context_documents=context_docs
        )
        
        return {
            "selected_text": request.selected_text,
            "analysis": analysis_result,
            "similar_documents": len(similar_docs),
            "analysis_timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error generating similarity analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Similarity analysis failed: {str(e)}")

@app.post("/add-document")
async def add_document_to_vector_db(request: DocumentUploadRequest):
    """
    Manually add a document to the vector database
    """
    try:
        file_id = request.file_id or str(uuid.uuid4())
        
        success = vector_db.add_document(
            document_content=request.content,
            filename=request.filename,
            file_id=file_id,
            additional_metadata=request.metadata or {}
        )
        
        if success:
            return {
                "success": True,
                "file_id": file_id,
                "filename": request.filename,
                "message": "Document added to vector database successfully"
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to add document to vector database")
            
    except Exception as e:
        print(f"❌ Error adding document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to add document: {str(e)}")

@app.get("/vector-db-stats")
async def get_vector_db_stats():
    """
    Get statistics about the vector database
    """
    try:
        stats = vector_db.get_database_stats()
        return {
            "status": "healthy",
            "stats": stats,
            "ai_available": ai_insights is not None
        }
    except Exception as e:
        print(f"❌ Error getting database stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get database stats: {str(e)}")

@app.delete("/remove-document/{file_id}")
async def remove_document_from_vector_db(file_id: str):
    """
    Remove a document from the vector database
    """
    try:
        success = vector_db.remove_document(file_id)
        
        if success:
            return {
                "success": True,
                "file_id": file_id,
                "message": "Document removed from vector database successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Document not found in vector database")
            
    except Exception as e:
        print(f"❌ Error removing document: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to remove document: {str(e)}")

@app.post("/quick-summary")
async def generate_quick_summary(content: Dict[str, str]):
    """
    Generate a quick summary of text content
    """
    try:
        if not ai_insights:
            raise HTTPException(
                status_code=503, 
                detail="AI service is not available. Please configure GOOGLE_API_KEY."
            )
        
        text = content.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text provided for summary")
        
        summary = ai_insights.generate_quick_summary(text)
        
        return {
            "original_length": len(text),
            "summary": summary,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        print(f"❌ Error generating summary: {e}")
        raise HTTPException(status_code=500, detail=f"Summary generation failed: {str(e)}")

@app.post("/generate-podcast-recommendations")
async def generate_podcast_recommendations() -> PodcastRecommendationsResponse:

    try:
        print(f"\n🎙️ ===== PODCAST RECOMMENDATIONS REQUEST =====")
        start_time = datetime.now()
        print(f"🎙️ Request received at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Check if AI service is available
        if not ai_insights:
            print(f"🎙️ ❌ AI service not available - missing GOOGLE_API_KEY")
            raise HTTPException(
                status_code=503, 
                detail="AI Podcast service not available. Please check API key configuration."
            )
        
        # Get database stats and document content
        db_stats = vector_db.get_database_stats()
        total_documents = db_stats.get('total_documents', 0)
        print(f"🎙️ Database contains {total_documents} documents")
        
        if total_documents == 0:
            # Return default recommendations if no documents
            default_recommendations = [
                {
                    "title": "Getting Started with Document Analysis",
                    "description": "An introduction to AI-powered document analysis and how to make the most of your research workflow.",
                    "duration": "15 min",
                    "category": "Tutorial",
                    "script": """Welcome to DocMind AI Podcasts! I'm excited to help you get started with intelligent document analysis.

Today, we'll explore how AI can transform your research and learning experience. Whether you're a student working on assignments, a researcher analyzing papers, or a professional reviewing documents, AI-powered analysis can help you discover insights you might have missed.

We'll cover three key areas:

First, semantic similarity - how AI can find connections between different documents and ideas, even when they don't use the same exact words.

Second, cross-document analysis - identifying patterns, contradictions, and trends across your entire document collection.

Third, intelligent summarization - getting the key points from complex documents in seconds, not hours.

Upload your first PDF document to begin your journey with AI-powered insights. The system will automatically analyze it and help you discover connections you never knew existed.

Ready to transform how you work with documents? Let's get started!""",
                    "key_topics": ["AI Analysis", "Document Management", "Research Workflow"],
                    "target_audience": "New Users"
                },
                {
                    "title": "Maximizing Research Efficiency",
                    "description": "Advanced tips and techniques for using AI to accelerate your research and discover hidden insights.",
                    "duration": "22 min", 
                    "category": "Research Tips",
                    "script": """Welcome back to DocMind AI! Today we're diving deep into advanced research techniques that can 10x your productivity.

Research used to mean spending hours reading through papers, taking notes, and trying to remember where you saw that important detail. Not anymore.

Let me share three game-changing strategies:

Strategy 1: The Semantic Web Approach
Instead of searching for exact keywords, let AI find conceptually related content. Upload papers on machine learning, and discover connections to neuroscience, cognitive psychology, and even philosophy of mind.

Strategy 2: The Contradiction Detective
Use AI to identify conflicting viewpoints in your research. This is gold for literature reviews and helps you understand debates in your field.

Strategy 3: The Pattern Hunter
Look for trends across time periods, authors, and institutions. AI can spot patterns that take humans months to discover.

Pro tip: Always ask 'What am I missing?' AI excels at finding the papers and insights hiding in your blind spots.

Your research is about to become much more powerful. Let's unlock those insights together!""",
                    "key_topics": ["Research Methods", "AI Tools", "Productivity"],
                    "target_audience": "Researchers"
                },
                {
                    "title": "The Future of Learning with AI",
                    "description": "Exploring how artificial intelligence is revolutionizing education and personalized learning experiences.",
                    "duration": "28 min",
                    "category": "Future Tech", 
                    "script": """Welcome to a special episode about the future of learning! I'm your host, and today we're exploring how AI is fundamentally changing how we learn, study, and discover knowledge.

Imagine having a personal tutor who knows exactly what you understand and what you're struggling with, available 24/7, never gets tired, and can explain concepts in infinite different ways until it clicks for you.

That's not science fiction - it's happening right now.

We're seeing three major shifts:

Shift 1: From One-Size-Fits-All to Personalized Learning
AI can analyze your learning patterns and adapt content to your pace and style. Visual learner? You get diagrams. Prefer hands-on? Interactive examples appear.

Shift 2: From Passive Consumption to Active Discovery  
Instead of just reading textbooks, you're having conversations with content, asking questions, and exploring tangents that interest you most.

Shift 3: From Isolated Study to Connected Understanding
AI helps you see how everything connects - how your biology class relates to your chemistry course, how historical events connect to current events.

The future of learning isn't about replacing teachers - it's about amplifying human potential.

Ready to experience the future of learning? Upload your study materials and let AI be your learning companion!""",
                    "key_topics": ["Future of Education", "AI in Learning", "Personalization"],
                    "target_audience": "Students & Educators"
                }
            ]
            
            return PodcastRecommendationsResponse(
                recommendations=[PodcastRecommendation(**rec) for rec in default_recommendations],
                based_on_documents=0,
                generation_timestamp=datetime.now().isoformat(),
                summary="Default podcast recommendations for new users. Upload documents to get personalized recommendations!"
            )
        
        # Get document content for analysis (sample from different documents)
        sample_documents = []
        unique_files = {}
        
        # Get diverse content from different documents
        for i, (doc_content, doc_meta) in enumerate(zip(vector_db.documents, vector_db.metadata)):
            if len(sample_documents) >= 15:  # Limit to avoid token limits
                break
                
            filename = doc_meta.get('filename', f'Document_{i}')
            
            # Only include one chunk per document to get diversity
            if filename not in unique_files:
                unique_files[filename] = True
                sample_documents.append({
                    'filename': filename,
                    'content': doc_content[:800],  # Truncate to manage token limits
                    'metadata': doc_meta
                })
        
        print(f"🎙️ Analyzing {len(sample_documents)} document samples for recommendations")
        
        # Create comprehensive prompt for podcast generation
        documents_text = "\n\n".join([
            f"**{doc['filename']}:**\n{doc['content']}"
            for doc in sample_documents[:10]  # Use top 10 for prompt
        ])
        
        podcast_prompt = f"""You are an expert podcast content creator specializing in educational and research-focused content. Based on the user's document library, create 3 highly engaging, personalized podcast recommendations.

**User's Document Library ({total_documents} documents):**
{documents_text}

**Your Task:**
Generate exactly 3 unique podcast recommendations that would genuinely interest someone with this document collection. Each podcast should be:
1. Highly engaging and conversational
2. Based on patterns, themes, or insights from their documents
3. Educational yet entertaining
4. Different from each other in focus and style

**IMPORTANT: Format the script in proper Markdown with:**
- Use **bold** for host names, emphasis, and important points
- Use proper line breaks and paragraphs
- Use markdown formatting for better readability
- Make it look professional when rendered

**Output Format (JSON):**
{{
    "recommendation_1": {{
        "title": "Creative, engaging title (not generic)",
        "description": "Compelling 2-sentence description that hooks the listener",
        "duration": "Realistic duration (15-45 min)",
        "category": "Specific category based on content",
        "script": "Complete, engaging podcast script (400-600 words) in MARKDOWN format with **bold** text, proper paragraphs, and natural conversational flow. Write as if you're actually recording this podcast. Use markdown formatting like **Host:** for speaker names.",
        "key_topics": ["3-5 specific topics covered"],
        "target_audience": "Who would benefit most"
    }},
    "recommendation_2": {{ ... }},
    "recommendation_3": {{ ... }}
}}

**Guidelines:**
- Make titles creative and specific, not generic
- Scripts should be in MARKDOWN format with **bold** text and proper paragraphs
- Reference insights that could come from their specific documents
- Each podcast should have a different angle/perspective
- Be conversational, engaging, and educational
- Include specific examples and actionable advice
- Make it feel personalized to their interests
- Use **Host:** and **Co-host:** formatting for speaker names

Generate the JSON now:"""

        print(f"🎙️ Sending prompt to Gemini for podcast generation...")
        
        # Use more creative config for podcast generation
        creative_config = genai.types.GenerationConfig(
            temperature=0.8,  # Higher temperature for creativity
            top_p=0.9,
            top_k=40,
            max_output_tokens=4096,  # Longer responses for scripts
        )
        
        response = ai_insights.model.generate_content(
            podcast_prompt,
            generation_config=creative_config
        )
        
        if not response or not response.text:
            raise Exception("AI model returned empty response")
        
        response_text = response.text.strip()
        print(f"🎙️ Received response from Gemini ({len(response_text)} characters)")
        
        # Parse JSON response
        try:
            # Clean up the response to extract JSON
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end]
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.rfind("```")
                response_text = response_text[json_start:json_end]
            
            response_text = response_text.strip()
            podcast_data = json.loads(response_text)
            
            # Convert to our format
            recommendations = []
            for i in range(1, 4):
                rec_key = f"recommendation_{i}"
                if rec_key in podcast_data:
                    rec = podcast_data[rec_key]
                    recommendations.append(PodcastRecommendation(
                        title=rec.get('title', f'Podcast Recommendation {i}'),
                        description=rec.get('description', 'AI-generated podcast based on your documents'),
                        duration=rec.get('duration', '25 min'),
                        category=rec.get('category', 'General'),
                        script=rec.get('script', 'Podcast script will be generated here...'),
                        key_topics=rec.get('key_topics', []),
                        target_audience=rec.get('target_audience', 'General Audience')
                    ))
            
        except json.JSONDecodeError as e:
            print(f"🎙️ ❌ Failed to parse JSON response: {e}")
            print(f"🎙️ Raw response: {response_text[:500]}...")
            
            # Fallback to regex parsing if JSON fails
            recommendations = []
            title_matches = re.findall(r'"title":\s*"([^"]+)"', response_text)
            desc_matches = re.findall(r'"description":\s*"([^"]+)"', response_text)
            script_matches = re.findall(r'"script":\s*"([^"]+)"', response_text, re.DOTALL)
            
            for i in range(min(3, len(title_matches))):
                recommendations.append(PodcastRecommendation(
                    title=title_matches[i] if i < len(title_matches) else f"AI Podcast {i+1}",
                    description=desc_matches[i] if i < len(desc_matches) else "AI-generated podcast recommendation",
                    duration="25 min",
                    category="AI Generated",
                    script=script_matches[i] if i < len(script_matches) else "Podcast script based on your document analysis...",
                    key_topics=["AI Analysis", "Document Insights"],
                    target_audience="Document Researchers"
                ))
        
        if not recommendations:
            raise Exception("Failed to generate valid podcast recommendations")
        
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"🎙️ ✅ Generated {len(recommendations)} podcast recommendations")
        print(f"🎙️ Processing completed in {duration:.2f} seconds")
        print(f"🎙️ ==========================================")
        
        return PodcastRecommendationsResponse(
            recommendations=recommendations,
            based_on_documents=total_documents,
            generation_timestamp=datetime.now().isoformat(),
            summary=f"AI-generated podcast recommendations based on analysis of {total_documents} documents from your library. Each recommendation is tailored to your interests and research focus."
        )
        
    except Exception as e:
        print(f"🎙️ ❌ Error generating podcast recommendations: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Podcast generation failed: {str(e)}")

@app.delete("/clear-vector-db")
async def clear_vector_database():
    """
    Clear entire vector database and reset to empty state
    This will remove all previously uploaded documents from the vector database
    """
    start_time = datetime.now()
    try:
        print(f"\n🗑️ ===== CLEAR VECTOR DATABASE API REQUEST =====")
        print(f"🗑️ Request received at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Get current stats before clearing
        current_stats = vector_db.get_database_stats()
        print(f"🗑️ Database stats BEFORE clearing: {current_stats}")
        
        # Extract current document count for logging
        current_docs = current_stats.get('total_documents', 0)
        if current_docs > 0:
            print(f"🗑️ About to clear {current_docs} documents from vector database")
        else:
            print(f"🗑️ Database is already empty (no documents to clear)")
        
        print(f"🗑️ Starting vector database clear operation...")
        
        # Clear the vector database
        success = vector_db.clear_database()
        
        if success:
            # Get new stats after clearing
            new_stats = vector_db.get_database_stats()
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            print(f"🎉 ===== VECTOR DATABASE CLEAR COMPLETED =====")
            print(f"🎉 Database stats AFTER clearing: {new_stats}")
            print(f"🎉 Documents removed: {current_docs}")
            print(f"🎉 Operation completed in: {duration:.2f} seconds")
            print(f"🎉 Completed at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return {
                "message": "Vector database cleared successfully",
                "previous_documents_removed": True,
                "documents_cleared": current_docs,
                "operation_duration_seconds": duration,
                "stats_before": current_stats,
                "stats_after": new_stats,
                "timestamp": end_time.isoformat()
            }
        else:
            print(f"❌ ===== VECTOR DATABASE CLEAR FAILED =====")
            print(f"❌ The clear operation returned False")
            raise HTTPException(status_code=500, detail="Failed to clear vector database - operation returned False")
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"❌ ===== VECTOR DATABASE CLEAR ERROR =====")
        print(f"❌ Error occurred at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"❌ Operation duration before error: {duration:.2f} seconds")
        print(f"❌ Error details: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        
        import traceback
        print(f"❌ Full traceback:")
        print(f"❌ {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=500, 
            detail=f"Vector database clear failed: {str(e)} (Duration: {duration:.2f}s)"
        )

@app.post("/generate-podcast")
async def generate_podcast(request: PodcastRequest):
    """
    Generate a 2-person podcast script based on selected text
    Focus on the selected text but can reference previous documents from vector DB
    """
    start_time = datetime.now()
    try:
        print(f"\n🎙️ ===== PODCAST GENERATION REQUEST =====")
        print(f"🎙️ Request received at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🎙️ Selected text length: {len(request.selected_text)} characters")
        print(f"🎙️ Selected text preview: {request.selected_text[:200]}...")
        print(f"🎙️ Request type: {request.request_type}")
        print(f"🎙️ Source: {request.source}")
        
        if not request.selected_text or len(request.selected_text.strip()) < 10:
            raise HTTPException(status_code=400, detail="Selected text is too short for podcast generation (minimum 10 characters)")
        
        if not ai_insights:
            raise HTTPException(status_code=500, detail="AI Insights not available. Please configure GOOGLE_API_KEY.")
        
        # Step 1: Get related content from vector database
        print(f"🎙️ Step 1: Searching for related content in vector database...")
        related_documents = []
        
        try:
            similar_results = vector_db.search_similar(request.selected_text, k=3)
            print(f"🎙️ Found {len(similar_results)} related documents from vector DB")
            
            for result in similar_results:
                if result.get('similarity_score', 0) > 0.3:  # Only include relevant results
                    related_documents.append({
                        'content': result.get('content', ''),
                        'filename': result.get('filename', 'Unknown'),
                        'similarity': result.get('similarity_score', 0)
                    })
                    
            print(f"🎙️ Using {len(related_documents)} related documents for context")
            
        except Exception as search_error:
            print(f"🎙️ Warning: Vector search failed: {search_error}")
            print(f"🎙️ Continuing with podcast generation using only selected text")
            
        # Step 2: Create context for AI
        context_info = f"Selected text for podcast: {request.selected_text}\n\n"
        
        if related_documents:
            context_info += "Related content from previous documents:\n"
            for i, doc in enumerate(related_documents[:2], 1):  # Limit to top 2 related docs
                context_info += f"\n{i}. From {doc['filename']} (similarity: {doc['similarity']:.2f}):\n"
                context_info += f"{doc['content'][:500]}...\n"
        
        # Step 3: Generate podcast script using AI
        print(f"🎙️ Step 2: Generating podcast script with AI...")
        
        podcast_prompt = f"""
Create a 2-minute podcast script between two people discussing the given topic. Make it engaging, conversational, and educational.

IMPORTANT REQUIREMENTS:
- Focus primarily on the selected text provided
- Use the related documents only as supporting context if relevant
- Create natural dialogue between Alex (Host) and Jamie (Expert)
- Keep it exactly 2 minutes (approximately 300-350 words)
- Make it sound like a real podcast conversation
- Include transitions, questions, and natural flow
- End with a clear conclusion

SELECTED TEXT TO FOCUS ON:
{request.selected_text}

{context_info if related_documents else ""}

Generate the podcast script in this exact format:
🎙️ **[PODCAST TITLE]**

**Alex (Host):** [Opening statement]

**Jamie (Expert):** [Response]

**Alex:** [Follow-up question]

**Jamie:** [Detailed explanation]

[Continue the conversation naturally for 2 minutes]

**Alex:** [Closing remarks]

**Jamie:** [Final thoughts]

---
**Duration:** ~2 minutes
**Focus:** [Main topic from selected text]
"""

        try:
            # Use the AI model directly for podcast generation
            print(f"🎙️ Calling Gemini AI model for podcast generation...")
            response = ai_insights.model.generate_content(
                podcast_prompt,
                generation_config=ai_insights.insights_config
            )
            
            if not response or not response.text:
                raise Exception("AI model returned empty response")
                
            podcast_script = response.text.strip()
            
            if len(podcast_script) < 50:
                raise Exception(f"AI model returned very short response: {podcast_script}")
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            print(f"🎙️ ===== PODCAST GENERATION COMPLETED =====")
            print(f"🎙️ Script generated successfully")
            print(f"🎙️ Script length: {len(podcast_script)} characters")
            print(f"🎙️ Script preview: {podcast_script[:200]}...")
            print(f"🎙️ Operation completed in: {duration:.2f} seconds")
            print(f"🎙️ Completed at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
            
            return {
                "podcast_script": podcast_script,
                "duration_seconds": duration,
                "selected_text_length": len(request.selected_text),
                "related_documents_used": len(related_documents),
                "timestamp": end_time.isoformat(),
                "estimated_duration": "~2 minutes"
            }
            
        except Exception as ai_error:
            print(f"❌ AI podcast generation failed: {ai_error}")
            print(f"❌ AI error type: {type(ai_error).__name__}")
            raise HTTPException(status_code=500, detail=f"AI podcast generation failed: {str(ai_error)}")
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        end_time = datetime.now()
        duration = (end_time - start_time).total_seconds()
        
        print(f"❌ ===== PODCAST GENERATION ERROR =====")
        print(f"❌ Error occurred at: {end_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"❌ Operation duration before error: {duration:.2f} seconds")
        print(f"❌ Error details: {str(e)}")
        print(f"❌ Error type: {type(e).__name__}")
        
        import traceback
        print(f"❌ Full traceback:")
        print(f"❌ {traceback.format_exc()}")
        
        raise HTTPException(
            status_code=500,
            detail=f"Podcast generation failed: {str(e)} (Duration: {duration:.2f}s)"
        )

# ============ REMOVE DOCUMENT ENDPOINT ============

@app.post("/api/remove-document", response_model=RemoveDocumentResponse)
async def remove_document(request: RemoveDocumentRequest):
    """
    Remove a specific document from the vector database
    """
    try:
        print(f"\n🗑️ ===== REMOVE DOCUMENT REQUEST =====")
        print(f"🗑️ Document name: {request.document_name}")
        print(f"🗑️ Document path: {request.document_path}")
        print(f"🗑️ Vector DB stats before: {vector_db.get_database_stats()}")
        print(f"🗑️ ====================================")
        
        # Remove document from vector database
        removed_count = vector_db.remove_document(request.document_name, request.document_path)
        
        stats_after = vector_db.get_database_stats()
        print(f"🗑️ Vector DB stats after: {stats_after}")
        print(f"🗑️ Documents removed: {removed_count}")
        
        if removed_count > 0:
            message = f"Successfully removed {removed_count} document chunks from vector database"
            print(f"🗑️ ✅ {message}")
        else:
            message = "No matching documents found to remove"
            print(f"🗑️ ⚠️ {message}")
        
        return RemoveDocumentResponse(
            success=True,
            message=message,
            removed_count=removed_count
        )
        
    except Exception as e:
        error_msg = f"Failed to remove document: {str(e)}"
        print(f"🗑️ ❌ {error_msg}")
        import traceback
        print(f"🗑️ ❌ Traceback: {traceback.format_exc()}")
        return RemoveDocumentResponse(
            success=False,
            message=error_msg,
            removed_count=0
        )

# ============ PDF CHATBOT ENDPOINT ============

@app.post("/api/pdf-chat", response_model=PDFChatResponse)
async def pdf_chat(request: PDFChatRequest):
    """
    Chat with PDF content using Gemini 2.5 Pro
    Only answers questions related to the PDF content
    """
    try:
        print(f"\n💬 ===== PDF CHAT REQUEST =====")
        print(f"💬 Question: {request.question}")
        print(f"💬 PDF: {request.pdf_name}")
        print(f"💬 Content length: {len(request.pdf_content)} characters")
        print(f"💬 AI Service available: {ai_insights is not None}")
        print(f"💬 ==============================")
        
        if not ai_insights:
            print(f"💬 ❌ AI service not available - missing GOOGLE_API_KEY")
            raise HTTPException(
                status_code=503, 
                detail="AI service not available. Please check API key configuration."
            )
        
        # Create context-aware prompt for PDF-specific chat
        chat_prompt = f"""You are a helpful AI assistant specialized in answering questions about PDF documents. You have been provided with the content of a specific PDF document.

**PDF Document:** {request.pdf_name}

**PDF Content:**
{request.pdf_content[:4000]}  # Limit content to avoid token limits

**User Question:** {request.question}

**Instructions:**
1. Be friendly and helpful in your responses
2. If the user is ONLY greeting you (simple "hi", "hello", "hey", etc. without asking for content), respond warmly and remind them you're here to help with questions about the PDF
3. For ANY content questions (including summaries, explanations, questions about the PDF), base your answers ONLY on the information provided in the PDF content above
4. If a content question can't be answered from the PDF, say so clearly and suggest what you can help with
5. Be concise but comprehensive in your responses
6. Quote specific parts of the document when relevant
7. You can use markdown formatting like **bold** for emphasis

**Response Guidelines:**
- If it's ONLY a simple greeting (no content request): Respond warmly and mention you're here to help with questions about the PDF document  
- If question asks for summary, explanation, or any PDF content: Provide a detailed, accurate answer based on the document
- If question is NOT about the PDF and not a simple greeting: Politely redirect them to ask about the document content
- Always be helpful, friendly, and professional

Please answer the user's question now:"""

        # Generate response using the existing Gemini model
        print(f"💬 Generating response with Gemini...")
        response = ai_insights.model.generate_content(
            chat_prompt,
            generation_config=ai_insights.similarity_config  # Use existing config
        )
        
        if not response or not response.text:
            raise Exception("AI model returned empty response")
        
        answer_text = response.text.strip()
        
        # Simple relevance check based on response content
        # Only consider pure greetings, not questions with greeting words
        question_lower = request.question.lower().strip()
        greeting_keywords = ["hi", "hello", "hey", "greetings", "good morning", "good afternoon", "good evening"]
        
        # Check if it's ONLY a greeting (not a question about content)
        is_pure_greeting = (
            question_lower in greeting_keywords or
            question_lower in [f"{word}!" for word in greeting_keywords] or
            question_lower in [f"{word}." for word in greeting_keywords] or
            len(question_lower.split()) <= 3 and any(keyword in question_lower for keyword in greeting_keywords) and 
            not any(content_word in question_lower for content_word in ["summary", "summarize", "pdf", "document", "content", "about", "what", "how", "where", "when", "why", "tell", "explain", "describe"])
        )
        
        print(f"💬 Greeting detection - Question: '{question_lower}'")
        print(f"💬 Greeting detection - Is pure greeting: {is_pure_greeting}")
        
        # Consider pure greetings as relevant, and check for rejection phrases otherwise
        is_relevant = is_pure_greeting or not any(phrase in answer_text.lower() for phrase in [
            "i can only answer questions about",
            "not related to the pdf", 
            "please ask me something related",
            "cannot answer questions outside",
            "politely redirect"
        ])
        
        # Calculate confidence based on response quality
        if is_pure_greeting:
            confidence = 0.9  # High confidence for pure greetings
        else:
            confidence = 0.85 if is_relevant else 0.2
            if len(answer_text) > 50 and is_relevant:
                confidence = min(0.95, confidence + 0.1)
        
        print(f"💬 ✅ Response generated successfully")
        print(f"💬 Answer length: {len(answer_text)} characters")
        print(f"💬 Is pure greeting: {is_pure_greeting}")
        print(f"💬 Relevant: {is_relevant}, Confidence: {confidence}")
        
        return PDFChatResponse(
            answer=answer_text,
            confidence=confidence,
            is_relevant=is_relevant,
            context_used=request.pdf_name if is_relevant else None
        )
        
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        print(f"💬 ❌ Error in PDF chat: {e}")
        print(f"💬 ❌ Error type: {type(e).__name__}")
        import traceback
        print(f"💬 ❌ Traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate response: {str(e)}"
        )

class SimilarityMatch(BaseModel):
    concept: str = Field(..., description="The similar concept or idea found")
    description: str = Field(..., description="Description of the similarity")
    source_document: str = Field(..., description="Source document name")
    target_document: str = Field(..., description="Target document name")
    similarity_score: float = Field(..., description="Similarity score between 0 and 1")
    key_phrases: List[str] = Field(..., description="Key phrases that match")

class SimilarityResponse(BaseModel):
    similarities: List[SimilarityMatch]
    total_comparisons: int
    message: str

@app.post("/generate-similarities")
async def generate_similarities() -> SimilarityResponse:
    """
    Generate semantic similarity matches between documents in the vector database
    """
    try:
        print(f"\n🔍 ===== SIMILARITY ANALYSIS REQUEST =====")
        start_time = datetime.now()
        print(f"🔍 Request received at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Get database stats and document content
        db_stats = vector_db.get_database_stats()
        total_documents = db_stats.get('total_documents', 0)
        print(f"🔍 Database contains {total_documents} documents")
        
        if total_documents < 2:
            return SimilarityResponse(
                similarities=[],
                total_comparisons=0,
                message="Need at least 2 documents to find similarities"
            )
        
        # Get document content from vector database
        all_documents = []
        try:
            # Get unique documents from the vector database
            unique_docs = set()
            for i in range(len(vector_db.documents)):
                # Get proper document name from metadata
                doc_name = vector_db.metadata[i].get('filename', 
                          vector_db.metadata[i].get('document_name', f'Document_{i}'))
                
                # Remove file extension for cleaner display
                if doc_name.endswith('.pdf'):
                    doc_name = doc_name[:-4]
                
                if doc_name not in unique_docs:
                    unique_docs.add(doc_name)
                    doc_content = vector_db.documents[i][:1500]  # Increased to 1500 chars for better analysis
                    all_documents.append({
                        'name': doc_name,
                        'content': doc_content,
                        'metadata': vector_db.metadata[i]
                    })
            
            print(f"🔍 Analyzing {len(all_documents)} unique documents for similarities")
            
        except Exception as e:
            print(f"🔍 Error accessing vector database: {e}")
            return SimilarityResponse(
                similarities=[],
                total_comparisons=0,
                message="Error accessing document database"
            )
        
        # Create prompt for AI to find similarities
        documents_text = "\n\n".join([
            f"**Document: {doc['name']}**\n{doc['content']}"
            for doc in all_documents[:10]  # Limit to 10 docs for prompt
        ])
        
        similarity_prompt = f"""You are an expert at finding semantic similarities and connections between documents. Analyze the following documents and find the top 6 most interesting semantic similarities, connections, or related concepts.

**Documents to analyze:**
{documents_text}

**Your task:**
Find semantic similarities, related concepts, thematic connections, or complementary ideas between these documents. Look for:
- Similar topics discussed in different documents
- Complementary concepts that build on each other
- Related methodologies or approaches
- Overlapping themes or ideas
- Connected research areas

**Output exactly 6 similarities in JSON format:**
{{
    "similarity_1": {{
        "concept": "Brief, engaging title for the similarity/connection",
        "description": "2-3 sentence explanation of how the documents are similar or connected",
        "source_document": "Name of first document",
        "target_document": "Name of second document", 
        "similarity_score": 0.85,
        "key_phrases": ["phrase1", "phrase2", "phrase3"]
    }},
    "similarity_2": {{ ... }},
    "similarity_3": {{ ... }},
    "similarity_4": {{ ... }},
    "similarity_5": {{ ... }},
    "similarity_6": {{ ... }}
}}

**Guidelines:**
- Focus on meaningful, interesting connections
- Vary the types of similarities (topical, methodological, thematic)
- Make descriptions engaging and informative
- Use realistic similarity scores (0.6-0.95)
- Include 2-4 key phrases that demonstrate the connection
- Make each similarity unique and valuable

Generate the JSON now:"""

        print(f"🔍 Sending similarity analysis prompt to AI...")
        
        # Use a balanced config for similarity analysis
        similarity_config = genai.types.GenerationConfig(
            temperature=0.7,
            top_p=0.8,
            top_k=40,
            max_output_tokens=2048,
        )
        
        if not ai_insights:
            raise HTTPException(
                status_code=503,
                detail="AI service not available. Please check API key configuration."
            )
        
        response = ai_insights.model.generate_content(
            similarity_prompt,
            generation_config=similarity_config
        )
        
        if not response or not response.text:
            raise Exception("AI model returned empty response")
        
        response_text = response.text.strip()
        print(f"🔍 Received response from AI ({len(response_text)} characters)")
        
        # Parse JSON response
        try:
            # Clean up the response to extract JSON
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end]
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.rfind("```")
                response_text = response_text[json_start:json_end]
            
            response_text = response_text.strip()
            similarity_data = json.loads(response_text)
            
            # Convert to our format
            similarities = []
            for i in range(1, 7):  # Try to get 6 similarities
                sim_key = f"similarity_{i}"
                if sim_key in similarity_data:
                    sim = similarity_data[sim_key]
                    similarities.append(SimilarityMatch(
                        concept=sim.get('concept', f'Similarity {i}'),
                        description=sim.get('description', 'Similar concepts found between documents'),
                        source_document=sim.get('source_document', 'Document A'),
                        target_document=sim.get('target_document', 'Document B'),
                        similarity_score=float(sim.get('similarity_score', 0.75)),
                        key_phrases=sim.get('key_phrases', [])
                    ))
            
            print(f"🔍 Successfully generated {len(similarities)} similarity matches")
            
            return SimilarityResponse(
                similarities=similarities,
                total_comparisons=len(all_documents) * (len(all_documents) - 1) // 2,
                message=f"Found {len(similarities)} semantic similarities across {len(all_documents)} documents"
            )
            
        except json.JSONDecodeError as e:
            print(f"🔍 ❌ Failed to parse JSON response: {e}")
            print(f"🔍 Raw response: {response_text[:500]}...")
            
            # Fallback: try regex parsing
            try:
                concept_matches = re.findall(r'"concept":\s*"([^"]+)"', response_text)
                desc_matches = re.findall(r'"description":\s*"([^"]+)"', response_text)
                source_matches = re.findall(r'"source_document":\s*"([^"]+)"', response_text)
                target_matches = re.findall(r'"target_document":\s*"([^"]+)"', response_text)
                
                similarities = []
                for i in range(min(len(concept_matches), len(desc_matches), 6)):
                    similarities.append(SimilarityMatch(
                        concept=concept_matches[i][:100],
                        description=desc_matches[i][:200],
                        source_document=source_matches[i] if i < len(source_matches) else "Document A",
                        target_document=target_matches[i] if i < len(target_matches) else "Document B", 
                        similarity_score=0.75,
                        key_phrases=["similarity", "connection"]
                    ))
                
                if similarities:
                    return SimilarityResponse(
                        similarities=similarities,
                        total_comparisons=len(all_documents),
                        message=f"Found {len(similarities)} similarities (parsed with fallback)"
                    )
            except Exception as regex_error:
                print(f"🔍 Regex fallback also failed: {regex_error}")
            
            raise Exception(f"Failed to parse AI response: {str(e)}")
        
    except Exception as e:
        print(f"🔍 ❌ Error generating similarities: {e}")
        raise HTTPException(status_code=500, detail=f"Similarity analysis failed: {str(e)}")

class AIInsight(BaseModel):
    title: str = Field(..., description="The insight title")
    description: str = Field(..., description="Detailed description of the insight")
    category: str = Field(..., description="Category of the insight")
    confidence: int = Field(..., description="Confidence score 0-100")
    impact: str = Field(..., description="Impact level: Low, Medium, High, Critical, Strategic")
    source: str = Field(..., description="Source of the insight")
    implications: List[str] = Field(..., description="Key implications and opportunities")
    recommendations: List[str] = Field(..., description="Actionable recommendations")

class AIInsightsResponse(BaseModel):
    insights: List[AIInsight]
    total_documents_analyzed: int
    generation_timestamp: str
    summary: str

@app.post("/generate-ai-insights")
async def generate_ai_insights() -> AIInsightsResponse:
    """
    Generate AI-powered insights from document analysis
    """
    try:
        print(f"\n🧠 ===== AI INSIGHTS ANALYSIS REQUEST =====")
        start_time = datetime.now()
        print(f"🧠 Request received at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        
        # Get database stats and document content
        db_stats = vector_db.get_database_stats()
        total_documents = db_stats.get('total_documents', 0)
        print(f"🧠 Database contains {total_documents} documents")
        
        if total_documents == 0:
            return AIInsightsResponse(
                insights=[],
                total_documents_analyzed=0,
                generation_timestamp=datetime.now().isoformat(),
                summary="No documents available for analysis. Upload documents to generate insights."
            )
        
        # Get document content from vector database
        all_documents = []
        try:
            # Get unique documents from the vector database
            unique_docs = set()
            for i in range(len(vector_db.documents)):
                # Get proper document name from metadata
                doc_name = vector_db.metadata[i].get('filename', 
                          vector_db.metadata[i].get('document_name', f'Document_{i}'))
                
                # Remove file extension for cleaner display
                if doc_name.endswith('.pdf'):
                    doc_name = doc_name[:-4]
                
                if doc_name not in unique_docs:
                    unique_docs.add(doc_name)
                    doc_content = vector_db.documents[i][:1200]  # 1200 chars for insights
                    all_documents.append({
                        'name': doc_name,
                        'content': doc_content,
                        'metadata': vector_db.metadata[i]
                    })
            
            print(f"🧠 Analyzing {len(all_documents)} unique documents for insights")
            
        except Exception as e:
            print(f"🧠 Error accessing vector database: {e}")
            return AIInsightsResponse(
                insights=[],
                total_documents_analyzed=0,
                generation_timestamp=datetime.now().isoformat(),
                summary="Error accessing document database"
            )
        
        # Create prompt for AI to generate insights
        documents_text = "\n\n".join([
            f"**Document: {doc['name']}**\n{doc['content']}"
            for doc in all_documents[:8]  # Limit to 8 docs for prompt
        ])
        
        insights_prompt = f"""You are an expert AI analyst specializing in extracting strategic insights and hidden patterns from document collections. Analyze the following documents and generate exactly 6 high-quality, actionable insights.

**Documents to analyze:**
{documents_text}

**Your task:**
Generate 6 strategic insights that reveal:
- Hidden patterns and trends across documents
- Strategic opportunities and threats
- Knowledge gaps and areas for growth
- Cross-domain applications and connections
- Performance optimization opportunities
- Future trends and implications

**Output exactly 6 insights in JSON format:**
{{
    "insight_1": {{
        "title": "Concise, compelling insight title (max 50 characters)",
        "description": "Detailed 2-3 sentence explanation of the insight and why it matters",
        "category": "One of: Technology, Strategy, Performance, Innovation, Risk, Opportunity",
        "confidence": 85,
        "impact": "One of: Low, Medium, High, Critical, Strategic",
        "source": "Brief description of where this insight comes from",
        "implications": ["Key implication 1", "Key implication 2", "Key implication 3"],
        "recommendations": ["Actionable recommendation 1", "Actionable recommendation 2"]
    }},
    "insight_2": {{ ... }},
    "insight_3": {{ ... }},
    "insight_4": {{ ... }},
    "insight_5": {{ ... }},
    "insight_6": {{ ... }}
}}

**Guidelines:**
- Make insights specific and actionable, not generic
- Focus on patterns that span multiple documents
- Include concrete implications and recommendations
- Use confidence scores 70-95 (higher for stronger evidence)
- Vary impact levels and categories for diversity
- Make titles engaging and professional
- Ground insights in actual document content

Generate the JSON now:"""

        print(f"🧠 Sending insights analysis prompt to AI...")
        
        # Use a creative config for insight generation
        insights_config = genai.types.GenerationConfig(
            temperature=0.8,
            top_p=0.9,
            top_k=40,
            max_output_tokens=3000,
        )
        
        if not ai_insights:
            raise HTTPException(
                status_code=503,
                detail="AI service not available. Please check API key configuration."
            )
        
        response = ai_insights.model.generate_content(
            insights_prompt,
            generation_config=insights_config
        )
        
        if not response or not response.text:
            raise Exception("AI model returned empty response")
        
        response_text = response.text.strip()
        print(f"🧠 Received response from AI ({len(response_text)} characters)")
        
        # Parse JSON response
        try:
            # Clean up the response to extract JSON
            if "```json" in response_text:
                json_start = response_text.find("```json") + 7
                json_end = response_text.find("```", json_start)
                response_text = response_text[json_start:json_end]
            elif "```" in response_text:
                json_start = response_text.find("```") + 3
                json_end = response_text.rfind("```")
                response_text = response_text[json_start:json_end]
            
            response_text = response_text.strip()
            insights_data = json.loads(response_text)
            
            # Convert to our format
            insights = []
            for i in range(1, 7):  # Try to get 6 insights
                insight_key = f"insight_{i}"
                if insight_key in insights_data:
                    insight = insights_data[insight_key]
                    insights.append(AIInsight(
                        title=insight.get('title', f'Insight {i}'),
                        description=insight.get('description', 'Strategic insight generated from document analysis'),
                        category=insight.get('category', 'Strategy'),
                        confidence=int(insight.get('confidence', 80)),
                        impact=insight.get('impact', 'Medium'),
                        source=insight.get('source', 'Document analysis'),
                        implications=insight.get('implications', []),
                        recommendations=insight.get('recommendations', [])
                    ))
            
            print(f"🧠 Successfully generated {len(insights)} AI insights")
            
            end_time = datetime.now()
            duration = (end_time - start_time).total_seconds()
            
            print(f"🧠 ✅ Generated {len(insights)} AI insights")
            print(f"🧠 Processing completed in {duration:.2f} seconds")
            print(f"🧠 ==========================================")
            
            return AIInsightsResponse(
                insights=insights,
                total_documents_analyzed=len(all_documents),
                generation_timestamp=datetime.now().isoformat(),
                summary=f"AI-generated strategic insights based on analysis of {len(all_documents)} documents from your library. Insights reveal patterns, opportunities, and actionable recommendations."
            )
            
        except json.JSONDecodeError as e:
            print(f"🧠 ❌ Failed to parse JSON response: {e}")
            print(f"🧠 Raw response: {response_text[:500]}...")
            
            # Fallback: try regex parsing
            try:
                title_matches = re.findall(r'"title":\s*"([^"]+)"', response_text)
                desc_matches = re.findall(r'"description":\s*"([^"]+)"', response_text)
                category_matches = re.findall(r'"category":\s*"([^"]+)"', response_text)
                
                insights = []
                for i in range(min(len(title_matches), len(desc_matches), 6)):
                    insights.append(AIInsight(
                        title=title_matches[i][:50],
                        description=desc_matches[i][:200],
                        category=category_matches[i] if i < len(category_matches) else "Strategy",
                        confidence=80,
                        impact="Medium", 
                        source="Document analysis",
                        implications=["Strategic opportunity identified"],
                        recommendations=["Further analysis recommended"]
                    ))
                
                if insights:
                    return AIInsightsResponse(
                        insights=insights,
                        total_documents_analyzed=len(all_documents),
                        generation_timestamp=datetime.now().isoformat(),
                        summary=f"Generated {len(insights)} insights (parsed with fallback)"
                    )
            except Exception as regex_error:
                print(f"🧠 Regex fallback also failed: {regex_error}")
            
            raise Exception(f"Failed to parse AI response: {str(e)}")
        
    except Exception as e:
        print(f"🧠 ❌ Error generating AI insights: {e}")
        raise HTTPException(status_code=500, detail=f"AI insights generation failed: {str(e)}")

# ============ TTS PODCAST GENERATION ============
import io
import json as json_lib
from dataclasses import dataclass
from typing import List

# Azure OpenAI TTS Configuration - Load from environment variables
AZURE_OPENAI_API_KEY = os.getenv('AZURE_TTS_KEY')
AZURE_OPENAI_ENDPOINT = os.getenv('AZURE_TTS_ENDPOINT')
AZURE_OPENAI_DEPLOYMENT = os.getenv('AZURE_TTS_DEPLOYMENT', 'tts')
AZURE_OPENAI_API_VERSION = "2025-03-01-preview"

# Try to import OpenAI for TTS
try:
    from openai import AzureOpenAI
    TTS_AVAILABLE = True
    print("🎙️ ✅ TTS Available - Azure OpenAI package loaded")
except ImportError:
    TTS_AVAILABLE = False
    AzureOpenAI = None
    print("🎙️ ❌ TTS Not Available - openai package missing")

# Check if TTS environment variables are configured
if TTS_AVAILABLE and (not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_ENDPOINT):
    print("🎙️ ⚠️ TTS package available but missing environment variables")
    print("🎙️ ⚠️ Set AZURE_TTS_KEY and AZURE_TTS_ENDPOINT for TTS functionality")
    TTS_AVAILABLE = False

@dataclass
class TTSSegment:
    speaker: str
    text: str

class TTSPodcastRequest(BaseModel):
    selected_text: str = Field(..., description="The text selected by the user")
    context: str = Field(default="TTS_PODCAST_REQUEST", description="Request context")

class TTSPodcastResponse(BaseModel):
    audio_url: str = Field(..., description="URL to the generated MP3 file")
    title: str = Field(..., description="Podcast title")
    duration_seconds: float = Field(..., description="Audio duration in seconds")
    segments_count: int = Field(..., description="Number of dialogue segments")
    generation_timestamp: str = Field(..., description="When the podcast was generated")
    file_size_mb: float = Field(..., description="File size in MB")

def build_tts_prompt(selected_text: str) -> str:
    """Build prompt for TTS podcast generation focused on selected text"""
    header = f"""
You are a senior podcast writer. Create a natural, engaging **two-speaker** podcast conversation about the user's selected text.

*** IMPORTANT: This will be converted to speech with REAL VOICES - Female Host (coral) and Male Guest (onyx) ***
*** Make it sound like a REAL conversation between two people discussing the content ***

SELECTED TEXT TO FOCUS ON:
"{selected_text}"

<!-- Natural Conversation Guidelines -->
- Create authentic dialogue between Sarah (female host) and Mike (male guest)
- Make it sound like two real people having an interesting conversation
- Use natural speech patterns, interruptions, agreements, and reactions
- Include conversational fillers: "um," "ah," "you know," "I mean," "actually," "so," "right," "hmm," "well"
- Add natural reactions: "Oh wow," "That's interesting," "Exactly," "Right," "I see"
- Make speakers build on each other's points naturally
- Include brief pauses and transitions

<!-- Speaker Personalities -->
Sarah (Female Host - coral voice):
- Curious and engaging interviewer style
- Asks thoughtful follow-up questions
- Relates content to broader implications
- Friendly and approachable tone

Mike (Male Guest - onyx voice):
- Knowledgeable and explanatory
- Provides insights and analysis
- Uses relatable examples and analogies
- Enthusiastic about sharing knowledge

<!-- Content Focus -->
- Stay focused on the selected text content
- Break down complex ideas into digestible parts
- Use real-world examples and analogies
- Make technical content accessible
- Keep the conversation flowing naturally

<!-- Technical Requirements -->
- Duration: 2-3 minutes of natural conversation
- Alternate speakers naturally (not rigidly)
- Start with Sarah introducing the topic
- End with a natural conclusion
- NO speaker labels will be read aloud - just pure dialogue

CRITICAL: Output ONLY valid JSON with this exact structure:

{{
  "title": "Natural podcast title about the selected content",
  "segments": [
    {{"speaker": "host", "text": "Sarah's natural opening dialogue"}},
    {{"speaker": "guest", "text": "Mike's natural response"}},
    {{"speaker": "host", "text": "Sarah's follow-up"}},
    {{"speaker": "guest", "text": "Mike's explanation"}},
    {{"speaker": "host", "text": "Sarah's question or comment"}},
    {{"speaker": "guest", "text": "Mike's detailed response"}},
    {{"speaker": "host", "text": "Sarah's closing thoughts"}}
  ]
}}

Create 6-10 segments alternating between speakers for natural flow.
"""
    return header

def generate_tts_script_with_gemini(selected_text: str) -> dict:
    """Generate podcast script using Gemini focused on selected text"""
    if not ai_insights or not ai_insights.model:
        raise HTTPException(status_code=503, detail="AI service not available")
    
    print(f"🎙️ Generating TTS script for selected text: {selected_text[:100]}...")
    
    prompt = build_tts_prompt(selected_text)
    
    # Use creative config for podcast generation
    creative_config = genai.types.GenerationConfig(
        temperature=0.9,
        top_p=0.95,
        top_k=40,
        max_output_tokens=2000,
    )
    
    try:
        response = ai_insights.model.generate_content(prompt, generation_config=creative_config)
        text = (response.text or "").strip()
        
        print(f"🎙️ Raw Gemini response: {text[:200]}...")
        
        # Clean up the response text
        if text.startswith("```"):
            text = text.strip("`")
            text = "\n".join(line for line in text.splitlines() if not line.lower().startswith("json"))
        
        # Try to parse JSON
        data = None
        try:
            data = json_lib.loads(text)
        except json_lib.JSONDecodeError:
            # Try to find JSON between braces
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1 and end > start:
                json_text = text[start:end+1]
                data = json_lib.loads(json_text)
        
        if not data:
            raise Exception("Failed to parse JSON from Gemini response")
        
        segments = data.get("segments", [])
        cleaned_segments = []
        
        for seg in segments:
            speaker = (seg.get("speaker", "")).strip().lower()
            if speaker not in ("host", "guest"):
                speaker = "host" if "host" in speaker else "guest"
            
            text_content = (seg.get("text", "")).strip()
            if text_content:
                cleaned_segments.append(TTSSegment(speaker=speaker, text=text_content))
        
        title = data.get("title", "Podcast About Your Selection")
        print(f"🎙️ Generated {len(cleaned_segments)} segments for '{title}'")
        
        return {"title": title, "segments": [s.__dict__ for s in cleaned_segments]}
        
    except Exception as e:
        print(f"🎙️ ❌ Error generating script: {e}")
        raise Exception(f"Script generation failed: {str(e)}")

def get_azure_tts_client():
    """Get Azure OpenAI client for TTS"""
    if not TTS_AVAILABLE:
        raise HTTPException(status_code=503, detail="TTS service not available - openai package required")
    
    if not AZURE_OPENAI_API_KEY or not AZURE_OPENAI_ENDPOINT:
        raise HTTPException(status_code=503, detail="TTS service not available - missing AZURE_TTS_KEY or AZURE_TTS_ENDPOINT")
    
    return AzureOpenAI(
        api_key=AZURE_OPENAI_API_KEY,
        api_version=AZURE_OPENAI_API_VERSION,
        azure_endpoint=AZURE_OPENAI_ENDPOINT,
    )

def synthesize_tts_segment(client, text: str, voice: str) -> bytes:
    """Synthesize a single text segment to audio - returns raw MP3 bytes"""
    print(f"🎙️ Synthesizing with {voice} voice: {text[:50]}...")
    
    try:
        response = client.audio.speech.create(
            model=AZURE_OPENAI_DEPLOYMENT,
            voice=voice,
            input=text
        )
        
        if hasattr(response, "read"):
            audio_bytes = response.read()
        else:
            audio_bytes = getattr(response, "content", None) or bytes(response)
        
        print(f"🎙️ Generated {len(audio_bytes)} bytes of MP3 audio")
        return audio_bytes
        
    except Exception as e:
        print(f"🎙️ ❌ TTS synthesis error: {e}")
        raise Exception(f"TTS synthesis failed: {str(e)}")

def estimate_audio_duration(text: str) -> float:
    """Estimate audio duration based on text length (words per minute)"""
    words = len(text.split())
    # Average speaking rate: 150-160 words per minute
    # Using 140 WPM for more natural pace with pauses
    duration_minutes = words / 140.0
    return duration_minutes * 60.0  # Convert to seconds

def combine_mp3_files(audio_segments: List[bytes]) -> bytes:
    """Simple MP3 concatenation without FFmpeg - basic approach"""
    print(f"🎙️ Combining {len(audio_segments)} MP3 segments...")
    
    # For basic MP3 concatenation, we can simply join the bytes
    # This is a simplified approach that works for most MP3 files
    combined = b''
    
    for i, segment in enumerate(audio_segments):
        if i == 0:
            # First segment - include full MP3 header
            combined += segment
        else:
            # Subsequent segments - skip some header info for smoother transition
            # Find the audio data start (after ID3 tag and MP3 header)
            if len(segment) > 1024:  # Ensure segment is long enough
                # Simple approach: skip first 1024 bytes which typically contain headers
                combined += segment[1024:]
            else:
                combined += segment
    
    print(f"🎙️ Combined MP3 size: {len(combined)} bytes")
    return combined

def synthesize_full_podcast(segments: List[TTSSegment]) -> tuple[bytes, float]:
    """Synthesize complete podcast with alternating male/female voices"""
    client = get_azure_tts_client()
    
    # Voice assignments (alternating for natural conversation)
    host_voice = "coral"  # Female voice for host
    guest_voice = "onyx"  # Male voice for guest
    
    print(f"🎙️ Generating {len(segments)} segments with alternating voices...")
    
    audio_segments = []
    total_text_length = 0
    
    for i, segment in enumerate(segments):
        voice = host_voice if segment.speaker == "host" else guest_voice
        speaker_name = "Female Host" if segment.speaker == "host" else "Male Guest"
        
        print(f"🎙️ [{i+1}/{len(segments)}] {speaker_name} ({voice}): {segment.text[:50]}...")
        
        # Generate audio for this segment (WITHOUT reading speaker labels)
        audio_bytes = synthesize_tts_segment(client, segment.text, voice)
        audio_segments.append(audio_bytes)
        total_text_length += len(segment.text)
        
        # Add a small pause between segments (silence)
        if i < len(segments) - 1:
            # Create a tiny MP3 silence (approximately 0.5 seconds)
            pause_text = "."  # Very short pause
            pause_audio = synthesize_tts_segment(client, pause_text, voice)
            audio_segments.append(pause_audio)
    
    # Combine all audio segments
    print(f"🎙️ Combining {len(audio_segments)} audio pieces...")
    combined_audio = combine_mp3_files(audio_segments)
    
    # Estimate duration based on total text length
    estimated_duration = estimate_audio_duration(" ".join([seg.text for seg in segments]))
    
    print(f"🎙️ ✅ Podcast generated: {len(combined_audio)} bytes, ~{estimated_duration:.1f}s estimated")
    print(f"🎙️ Used {host_voice} (female) and {guest_voice} (male) voices")
    
    return combined_audio, estimated_duration

@app.post("/generate-tts-podcast")
async def generate_tts_podcast(request: TTSPodcastRequest) -> TTSPodcastResponse:
    """
    Generate TTS podcast from selected text
    """
    try:
        print(f"\n🎙️ ===== TTS PODCAST GENERATION REQUEST =====")
        start_time = datetime.now()
        print(f"🎙️ Request received at: {start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"🎙️ Selected text length: {len(request.selected_text)} characters")
        print(f"🎙️ Selected text preview: {request.selected_text[:200]}...")
        
        if not TTS_AVAILABLE:
            raise HTTPException(status_code=503, detail="TTS service not available - missing dependencies")
        
        if len(request.selected_text.strip()) < 50:
            raise HTTPException(status_code=400, detail="Selected text too short for podcast generation (minimum 50 characters)")
        
        # Step 1: Generate script with Gemini
        print(f"🎙️ [1/3] Generating podcast script with Gemini...")
        script_data = generate_tts_script_with_gemini(request.selected_text)
        title = script_data["title"]
        segments = [TTSSegment(**seg) for seg in script_data["segments"]]
        
        if not segments:
            raise HTTPException(status_code=500, detail="No dialogue segments generated")
        
        print(f"🎙️ Generated {len(segments)} dialogue segments")
        
        # Step 2: Synthesize audio (FFmpeg-free)
        print(f"🎙️ [2/3] Synthesizing audio with Azure OpenAI TTS...")
        audio_bytes, estimated_duration = synthesize_full_podcast(segments)
        
        # Step 3: Save MP3 file
        print(f"🎙️ [3/3] Saving MP3 file...")
        
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"podcast_{timestamp}.mp3"
        filepath = static_dir / filename
        
        # Save raw MP3 bytes directly
        with open(filepath, "wb") as f:
            f.write(audio_bytes)
        
        file_size_mb = filepath.stat().st_size / (1024 * 1024)
        
        # Use estimated duration
        duration_seconds = estimated_duration
        
        end_time = datetime.now()
        generation_time = (end_time - start_time).total_seconds()
        
        print(f"🎙️ ✅ TTS podcast generated successfully!")
        print(f"🎙️ Title: {title}")
        print(f"🎙️ Duration: {duration_seconds:.1f} seconds")
        print(f"🎙️ Segments: {len(segments)}")
        print(f"🎙️ File size: {file_size_mb:.2f} MB")
        print(f"🎙️ Generation time: {generation_time:.2f} seconds")
        print(f"🎙️ File saved: {filepath}")
        print(f"🎙️ ==========================================")
        
        # Return response with audio URL
        audio_url = f"/static/{filename}"
        
        return TTSPodcastResponse(
            audio_url=audio_url,
            title=title,
            duration_seconds=duration_seconds,
            segments_count=len(segments),
            generation_timestamp=datetime.now().isoformat(),
            file_size_mb=file_size_mb
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"🎙️ ❌ Error generating TTS podcast: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"TTS podcast generation failed: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
