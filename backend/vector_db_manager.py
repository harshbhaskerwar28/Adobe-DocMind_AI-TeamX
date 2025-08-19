"""
Vector Database Manager for Document Analysis
Handles document embedding, storage, and similarity search using FAISS
"""

import os
import json
import pickle
import numpy as np
from typing import List, Dict, Any, Tuple, Optional
import faiss
from sentence_transformers import SentenceTransformer
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VectorDBManager:
    def __init__(self, db_path: str = "./vector_db", embedding_model: str = "all-MiniLM-L6-v2"):
        """
        Initialize Vector Database Manager
        
        Args:
            db_path: Path to store vector database files
            embedding_model: SentenceTransformer model name
        """
        self.db_path = db_path
        self.embedding_model_name = embedding_model
        self.embedding_model = None
        self.index = None
        self.documents = []
        self.metadata = []
        
        # Create database directory
        os.makedirs(db_path, exist_ok=True)
        
        # Initialize embedding model
        self._load_embedding_model()
        
        # Load existing database if available
        self._load_database()
    
    def _load_embedding_model(self):
        """Load the sentence transformer model"""
        try:
            logger.info(f"Loading embedding model: {self.embedding_model_name}")
            self.embedding_model = SentenceTransformer(self.embedding_model_name)
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Error loading embedding model: {e}")
            raise
    
    def _load_database(self):
        """Load existing vector database from disk"""
        try:
            index_path = os.path.join(self.db_path, "faiss_index.bin")
            docs_path = os.path.join(self.db_path, "documents.json")
            metadata_path = os.path.join(self.db_path, "metadata.json")
            
            if os.path.exists(index_path) and os.path.exists(docs_path) and os.path.exists(metadata_path):
                # Load FAISS index
                self.index = faiss.read_index(index_path)
                
                # Load documents and metadata
                with open(docs_path, 'r', encoding='utf-8') as f:
                    self.documents = json.load(f)
                
                with open(metadata_path, 'r', encoding='utf-8') as f:
                    self.metadata = json.load(f)
                
                logger.info(f"Loaded existing database with {len(self.documents)} documents")
            else:
                logger.info("No existing database found, creating new one")
                self._initialize_empty_database()
                
        except Exception as e:
            logger.error(f"Error loading database: {e}")
            self._initialize_empty_database()
    
    def _initialize_empty_database(self):
        """Initialize empty FAISS database"""
        try:
            # Get embedding dimension
            sample_embedding = self.embedding_model.encode(["sample text"])
            dimension = sample_embedding.shape[1]
            
            # Create FAISS index (using IndexFlatIP for cosine similarity)
            self.index = faiss.IndexFlatIP(dimension)
            self.documents = []
            self.metadata = []
            
            logger.info(f"Initialized empty database with dimension {dimension}")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise
    
    def _save_database(self):
        """Save vector database to disk"""
        try:
            index_path = os.path.join(self.db_path, "faiss_index.bin")
            docs_path = os.path.join(self.db_path, "documents.json")
            metadata_path = os.path.join(self.db_path, "metadata.json")
            
            # Save FAISS index
            faiss.write_index(self.index, index_path)
            
            # Save documents and metadata
            with open(docs_path, 'w', encoding='utf-8') as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
            
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(self.metadata, f, ensure_ascii=False, indent=2)
            
            logger.info("Database saved successfully")
        except Exception as e:
            logger.error(f"Error saving database: {e}")
            raise
    
    def clear_database(self):
        """
        Clear entire vector database and reset to empty state
        Removes all documents, embeddings, and database files
        """
        try:
            logger.info("🗑️ ===== STARTING VECTOR DATABASE CLEAR OPERATION =====")
            
            # Log current database state
            current_docs = len(self.documents) if self.documents else 0
            current_metadata = len(self.metadata) if self.metadata else 0
            
            if current_docs > 0:
                logger.info(f"🗑️ Current database contains {current_docs} documents and {current_metadata} metadata entries")
                logger.info(f"🗑️ Documents to be removed: {[doc.get('filename', 'Unknown') if isinstance(doc, dict) else 'Unknown' for doc in self.documents[:5]]}{'...' if current_docs > 5 else ''}")
            else:
                logger.info("🗑️ Database is already empty (no documents to clear)")
            
            # Clear in-memory data
            logger.info("🗑️ Clearing in-memory document data...")
            self.documents = []
            self.metadata = []
            logger.info("✅ In-memory data cleared")
            
            # Reinitialize empty FAISS index
            logger.info("🗑️ Reinitializing empty FAISS index...")
            self._initialize_empty_database()
            logger.info("✅ FAISS index reinitialized")
            
            # Remove database files from disk
            logger.info("🗑️ Removing database files from disk...")
            index_path = os.path.join(self.db_path, "faiss_index.bin")
            docs_path = os.path.join(self.db_path, "documents.json")
            metadata_path = os.path.join(self.db_path, "metadata.json")
            
            files_removed = 0
            files_not_found = 0
            
            for file_path in [index_path, docs_path, metadata_path]:
                if os.path.exists(file_path):
                    try:
                        file_size = os.path.getsize(file_path)
                        os.remove(file_path)
                        logger.info(f"✅ Removed file: {os.path.basename(file_path)} ({file_size} bytes)")
                        files_removed += 1
                    except Exception as file_error:
                        logger.error(f"❌ Failed to remove file {file_path}: {file_error}")
                else:
                    logger.info(f"ℹ️ File not found (already cleared): {os.path.basename(file_path)}")
                    files_not_found += 1
            
            logger.info(f"🗑️ Files removed: {files_removed}, Files not found: {files_not_found}")
            
            # Final verification
            new_stats = self.get_database_stats()
            logger.info(f"🗑️ Database stats after clearing: {new_stats}")
            
            logger.info("🎉 ===== VECTOR DATABASE CLEARED SUCCESSFULLY =====")
            logger.info(f"🎉 Summary: Removed {current_docs} documents, {files_removed} files deleted, {files_not_found} files already missing")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ ===== ERROR CLEARING DATABASE =====")
            logger.error(f"❌ Error details: {e}")
            import traceback
            logger.error(f"❌ Traceback: {traceback.format_exc()}")
            return False
    
    def _chunk_text(self, text: str, chunk_size: int = 512, overlap: int = 50) -> List[str]:
        """
        Split text into overlapping chunks for better semantic search
        
        Args:
            text: Text to chunk
            chunk_size: Size of each chunk in characters
            overlap: Overlap between chunks
        
        Returns:
            List of text chunks
        """
        if len(text) <= chunk_size:
            return [text]
        
        chunks = []
        start = 0
        
        while start < len(text):
            end = start + chunk_size
            
            # Try to end at a sentence boundary
            if end < len(text):
                # Look for sentence endings within the last 100 characters
                last_part = text[max(start, end-100):end]
                sentence_endings = ['.', '!', '?', '\n\n']
                
                best_end = end
                for ending in sentence_endings:
                    ending_pos = last_part.rfind(ending)
                    if ending_pos != -1:
                        potential_end = start + max(0, end-100) + ending_pos + 1
                        if potential_end > start + chunk_size * 0.7:  # Don't make chunks too small
                            best_end = potential_end
                            break
                
                end = best_end
            
            chunk = text[start:end].strip()
            if chunk:
                chunks.append(chunk)
            
            start = end - overlap
            if start >= len(text):
                break
        
        return chunks
    
    def add_document(self, document_content: str, filename: str, file_id: str, additional_metadata: Dict[str, Any] = None) -> bool:
        """
        Add a document to the vector database
        
        Args:
            document_content: Full text content of the document
            filename: Name of the document file
            file_id: Unique identifier for the document
            additional_metadata: Additional metadata to store
        
        Returns:
            True if successful, False otherwise
        """
        try:
            logger.info(f"Adding document: {filename}")
            
            # Check if document already exists
            existing_doc = next((i for i, meta in enumerate(self.metadata) if meta.get('file_id') == file_id), None)
            if existing_doc is not None:
                logger.info(f"Document {filename} already exists, skipping")
                return True
            
            # Chunk the document
            chunks = self._chunk_text(document_content)
            logger.info(f"Created {len(chunks)} chunks for {filename}")
            
            # Generate embeddings for each chunk
            embeddings = self.embedding_model.encode(chunks, normalize_embeddings=True)
            
            # Add to FAISS index
            self.index.add(embeddings.astype('float32'))
            
            # Store document chunks and metadata
            for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
                self.documents.append(chunk)
                
                chunk_metadata = {
                    'file_id': file_id,
                    'filename': filename,
                    'chunk_id': f"{file_id}_chunk_{i}",
                    'chunk_index': i,
                    'total_chunks': len(chunks),
                    'timestamp': datetime.now().isoformat(),
                    'content_preview': chunk[:100] + "..." if len(chunk) > 100 else chunk
                }
                
                if additional_metadata:
                    chunk_metadata.update(additional_metadata)
                
                self.metadata.append(chunk_metadata)
            
            # Save database
            self._save_database()
            
            logger.info(f"Successfully added document {filename} with {len(chunks)} chunks")
            return True
            
        except Exception as e:
            logger.error(f"Error adding document {filename}: {e}")
            return False
    
    def search_similar(self, query: str, top_k: int = 10, min_similarity: float = 0.3) -> List[Dict[str, Any]]:
        """
        Search for similar content in the vector database
        
        Args:
            query: Query text to search for
            top_k: Number of top results to return
            min_similarity: Minimum similarity threshold
        
        Returns:
            List of similar documents with metadata
        """
        try:
            if self.index.ntotal == 0:
                logger.warning("No documents in database")
                return []
            
            # Generate query embedding
            query_embedding = self.embedding_model.encode([query], normalize_embeddings=True)
            
            # Search in FAISS index
            similarities, indices = self.index.search(query_embedding.astype('float32'), top_k)
            
            results = []
            for similarity, idx in zip(similarities[0], indices[0]):
                if idx != -1 and similarity >= min_similarity:
                    result = {
                        'content': self.documents[idx],
                        'metadata': self.metadata[idx],
                        'similarity_score': float(similarity),
                        'similarity_percentage': round(float(similarity) * 100, 1)
                    }
                    results.append(result)
            
            # Group results by document and take best chunk from each
            document_results = {}
            for result in results:
                file_id = result['metadata']['file_id']
                if file_id not in document_results or result['similarity_score'] > document_results[file_id]['similarity_score']:
                    document_results[file_id] = result
            
            # Convert back to list and sort by similarity
            final_results = list(document_results.values())
            final_results.sort(key=lambda x: x['similarity_score'], reverse=True)
            
            logger.info(f"Found {len(final_results)} similar documents for query: {query[:50]}...")
            return final_results
            
        except Exception as e:
            logger.error(f"Error searching for similar content: {e}")
            return []
    
    def get_document_context(self, file_id: str, chunk_index: int, context_chunks: int = 2) -> str:
        """
        Get surrounding context for a specific chunk
        
        Args:
            file_id: Document file ID
            chunk_index: Index of the target chunk
            context_chunks: Number of chunks before and after to include
        
        Returns:
            Combined context text
        """
        try:
            # Find all chunks for this document
            doc_chunks = [
                (i, doc, meta) for i, (doc, meta) in enumerate(zip(self.documents, self.metadata))
                if meta.get('file_id') == file_id
            ]
            
            if not doc_chunks:
                return ""
            
            # Sort by chunk index
            doc_chunks.sort(key=lambda x: x[2].get('chunk_index', 0))
            
            # Find the target chunk
            target_idx = None
            for i, (_, _, meta) in enumerate(doc_chunks):
                if meta.get('chunk_index') == chunk_index:
                    target_idx = i
                    break
            
            if target_idx is None:
                return doc_chunks[0][1]  # Return first chunk if target not found
            
            # Get context range
            start_idx = max(0, target_idx - context_chunks)
            end_idx = min(len(doc_chunks), target_idx + context_chunks + 1)
            
            # Combine context chunks
            context_text = ""
            for i in range(start_idx, end_idx):
                if i == target_idx:
                    context_text += f"\n\n>>> HIGHLIGHTED SECTION <<<\n{doc_chunks[i][1]}\n>>> END HIGHLIGHT <<<\n\n"
                else:
                    context_text += doc_chunks[i][1] + "\n\n"
            
            return context_text.strip()
            
        except Exception as e:
            logger.error(f"Error getting document context: {e}")
            return ""
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector database"""
        try:
            unique_documents = len(set(meta.get('file_id', '') for meta in self.metadata))
            total_chunks = len(self.documents)
            
            return {
                'total_documents': unique_documents,
                'total_chunks': total_chunks,
                'database_size_mb': sum(len(doc.encode('utf-8')) for doc in self.documents) / (1024 * 1024),
                'embedding_dimension': self.index.d if self.index else 0,
                'last_updated': datetime.now().isoformat()
            }
        except Exception as e:
            logger.error(f"Error getting database stats: {e}")
            return {}
    
    def remove_document(self, document_name: str = None, document_path: str = None) -> int:
        """
        Remove a document from the vector database
        
        Args:
            document_name: Name of the document to remove
            document_path: Path of the document to remove
        
        Returns:
            Number of chunks removed
        """
        try:
            # Find indices of chunks to remove
            indices_to_remove = []
            for i, meta in enumerate(self.metadata):
                # Match by filename or file_id (which might contain path info)
                filename_match = meta.get('filename') == document_name
                path_match = document_path and (
                    meta.get('file_id') == document_path or 
                    meta.get('filename') == document_path or
                    document_path in meta.get('file_id', '')
                )
                
                if filename_match or path_match:
                    indices_to_remove.append(i)
            
            if not indices_to_remove:
                logger.warning(f"Document {document_name} (path: {document_path}) not found in database")
                return 0
            
            logger.info(f"Found {len(indices_to_remove)} chunks to remove for document {document_name}")
            
            # Remove from documents and metadata (reverse order to maintain indices)
            for idx in reversed(indices_to_remove):
                del self.documents[idx]
                del self.metadata[idx]
            
            # Rebuild FAISS index (necessary for FAISS)
            if self.documents:
                embeddings = self.embedding_model.encode(self.documents, normalize_embeddings=True)
                dimension = embeddings.shape[1]
                self.index = faiss.IndexFlatIP(dimension)
                self.index.add(embeddings.astype('float32'))
            else:
                self._initialize_empty_database()
            
            # Save database
            self._save_database()
            
            logger.info(f"Removed document {document_name} with {len(indices_to_remove)} chunks")
            return len(indices_to_remove)
            
        except Exception as e:
            logger.error(f"Error removing document {document_name}: {e}")
            return 0
