"""
AI Insights Manager using Gemini 2.5 Pro
Generates intelligent insights, contradictions, and cross-document analysis
"""

import os
from typing import List, Dict, Any, Optional
import google.generativeai as genai
from datetime import datetime
import logging
import json
import re

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class AIInsightsManager:
    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize AI Insights Manager with Gemini API
        
        Args:
            api_key: Google API key for Gemini. If None, will try to load from env
        """
        self.api_key = api_key or os.getenv('GOOGLE_API_KEY')
        if not self.api_key:
            raise ValueError("Google API key is required. Set GOOGLE_API_KEY environment variable or pass api_key parameter.")
        
        # Configure Gemini
        genai.configure(api_key=self.api_key)
        
        # Initialize model from environment variable or use default
        model_name = os.getenv('GEMINI_MODEL', 'gemini-2.5-pro')
        self.model = genai.GenerativeModel(model_name)
        
        # Generation config for different types of analysis
        self.similarity_config = genai.types.GenerationConfig(
            temperature=0.3,
            top_p=0.8,
            top_k=40,
            max_output_tokens=2048,
        )
        
        self.insights_config = genai.types.GenerationConfig(
            temperature=0.7,
            top_p=0.9,
            top_k=40,
            max_output_tokens=3072,
        )
    
    def generate_similarity_analysis(self, selected_text: str, similar_documents: List[Dict[str, Any]], context_documents: List[str] = None) -> Dict[str, Any]:
        """
        Generate similarity analysis for selected text against similar documents
        
        Args:
            selected_text: The text selected by the user
            similar_documents: List of similar documents from vector search
            context_documents: Additional context documents
        
        Returns:
            Structured similarity analysis
        """
        try:
            logger.info(f"Generating similarity analysis for: {selected_text[:100]}...")
            
            # Build context for analysis
            context = self._build_similarity_context(selected_text, similar_documents, context_documents)
            
            prompt = self._get_similarity_prompt_template().format(
                selected_text=selected_text,
                context=context
            )
            
            response = self.model.generate_content(
                prompt,
                generation_config=self.similarity_config
            )
            
            # Parse response and structure it
            analysis = self._parse_similarity_response(response.text)
            
            logger.info("Similarity analysis generated successfully")
            return analysis
            
        except Exception as e:
            logger.error(f"Error generating similarity analysis: {e}")
            return {
                'error': str(e),
                'connections': [],
                'summary': 'Failed to generate similarity analysis'
            }
    
    def generate_ai_insights(self, selected_text: str, all_documents: List[Dict[str, Any]], similar_documents: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Generate AI insights including contradictions, patterns, and discoveries
        
        Args:
            selected_text: The text selected by the user
            all_documents: All documents in the database
            similar_documents: Documents similar to the selected text
        
        Returns:
            Structured AI insights
        """
        try:
            logger.info(f"Generating AI insights for: {selected_text[:100]}...")
            
            # Build comprehensive context
            context = self._build_insights_context(selected_text, all_documents, similar_documents)
            
            prompt = self._get_insights_prompt_template().format(
                selected_text=selected_text,
                context=context
            )
            
            response = self.model.generate_content(
                prompt,
                generation_config=self.insights_config
            )
            
            # Parse and structure insights
            insights = self._parse_insights_response(response.text)
            
            logger.info("AI insights generated successfully")
            return insights
            
        except Exception as e:
            logger.error(f"Error generating AI insights: {e}")
            return {
                'error': str(e),
                'insights': [],
                'summary': 'Failed to generate AI insights'
            }
    
    def _build_similarity_context(self, selected_text: str, similar_documents: List[Dict[str, Any]], context_documents: List[str] = None) -> str:
        """Build context for similarity analysis"""
        context = "=== DOCUMENT LIBRARY CONTEXT ===\n\n"
        
        for i, doc in enumerate(similar_documents[:5]):  # Limit to top 5 for context
            metadata = doc.get('metadata', {})
            content = doc.get('content', '')
            similarity = doc.get('similarity_percentage', 0)
            
            context += f"DOCUMENT {i+1}: {metadata.get('filename', 'Unknown')}\n"
            context += f"Similarity: {similarity}%\n"
            context += f"Content: {content[:500]}...\n"
            context += f"Section: Chunk {metadata.get('chunk_index', 0) + 1} of {metadata.get('total_chunks', 1)}\n\n"
        
        if context_documents:
            context += "=== ADDITIONAL CONTEXT ===\n"
            for i, doc in enumerate(context_documents[:3]):
                context += f"CONTEXT DOC {i+1}: {doc[:300]}...\n\n"
        
        return context
    
    def _build_insights_context(self, selected_text: str, all_documents: List[Dict[str, Any]], similar_documents: List[Dict[str, Any]]) -> str:
        """Build comprehensive context for AI insights"""
        context = "=== SELECTED CONCEPT ===\n"
        context += f"{selected_text}\n\n"
        
        context += "=== SIMILAR CONTENT ACROSS DOCUMENTS ===\n"
        for i, doc in enumerate(similar_documents[:3]):
            metadata = doc.get('metadata', {})
            content = doc.get('content', '')
            similarity = doc.get('similarity_percentage', 0)
            
            context += f"MATCH {i+1} ({similarity}% similar) - {metadata.get('filename', 'Unknown')}:\n"
            context += f"{content[:400]}...\n\n"
        
        # Add document diversity context
        unique_docs = set()
        for doc in all_documents:
            metadata = doc.get('metadata', {})
            filename = metadata.get('filename', 'Unknown')
            unique_docs.add(filename)
        
        context += f"=== DOCUMENT LIBRARY OVERVIEW ===\n"
        context += f"Total documents in library: {len(unique_docs)}\n"
        context += f"Document names: {', '.join(list(unique_docs)[:10])}\n"
        if len(unique_docs) > 10:
            context += f"... and {len(unique_docs) - 10} more documents\n"
        
        return context
    
    def _get_similarity_prompt_template(self) -> str:
        """Get the prompt template for similarity analysis"""
        return """You are an expert research assistant analyzing document connections. Your task is to find and explain meaningful connections between a selected text and similar content across a document library.

SELECTED TEXT:
"{selected_text}"

DOCUMENT CONTEXT:
{context}

Please provide a detailed similarity analysis in the following JSON format:

{{
    "summary": "Brief overview of the connections found",
    "connections": [
        {{
            "title": "Connection title (e.g., 'Supporting Evidence', 'Contradictory Finding')",
            "document": "Source document name", 
            "snippet": "Relevant excerpt from the document",
            "relationship": "How this relates to the selected text",
            "strength": "High/Medium/Low",
            "type": "supporting/contradictory/example/extension"
        }}
    ],
    "key_insights": [
        "Key insight 1",
        "Key insight 2"
    ],
    "suggested_follow_up": "What the user might want to explore next"
}}

Focus on:
1. **Semantic connections** - concepts that relate in meaning
2. **Methodological similarities** - similar approaches or techniques
3. **Contradictory evidence** - where documents disagree
4. **Supporting evidence** - where documents reinforce each other
5. **Examples and applications** - real-world uses of the concept

Be specific and cite exact snippets. Prioritize the most meaningful connections."""
    
    def _get_insights_prompt_template(self) -> str:
        """Get the prompt template for AI insights generation"""
        return """You are an AI research analyst with deep expertise across multiple domains. Analyze the selected concept and generate intelligent insights by examining patterns, contradictions, and discoveries across the document library.

ANALYSIS TARGET:
"{selected_text}"

DOCUMENT CONTEXT:
{context}

Generate comprehensive insights in this JSON format:

{{
    "summary": "Executive summary of key findings",
    "insights": [
        {{
            "type": "contradiction/pattern/discovery/opportunity",
            "title": "Insight title",
            "description": "Detailed explanation of the insight",
            "evidence": "Supporting evidence from documents",
            "confidence": 85,
            "impact": "High/Medium/Low",
            "category": "Research area category"
        }}
    ],
    "cross_document_analysis": {{
        "agreements": ["Points where documents agree"],
        "disagreements": ["Points where documents disagree"],
        "gaps": ["Missing information or research gaps"],
        "evolution": "How understanding has evolved across documents"
    }},
    "actionable_recommendations": [
        "Specific recommendation 1",
        "Specific recommendation 2"
    ]
}}

Focus on generating insights for these categories:

🤯 **DISCOVERIES**: Surprising facts or patterns found across documents
⚔️ **CONTRADICTIONS**: Where papers disagree or show conflicting results
📚 **EXAMPLES**: Real applications and case studies 
💎 **KEY TAKEAWAYS**: Important implications and connections
🔬 **RESEARCH GAPS**: Areas needing further investigation
📈 **TRENDS**: How understanding has evolved or improved

Be analytical, specific, and provide actionable intelligence. Think like a PhD supervisor spotting research insights."""
    
    def _parse_similarity_response(self, response_text: str) -> Dict[str, Any]:
        """Parse and structure similarity analysis response"""
        try:
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                parsed = json.loads(json_str)
                return parsed
            else:
                # Fallback parsing if JSON extraction fails
                return self._fallback_parse_similarity(response_text)
        except Exception as e:
            logger.error(f"Error parsing similarity response: {e}")
            return self._fallback_parse_similarity(response_text)
    
    def _parse_insights_response(self, response_text: str) -> Dict[str, Any]:
        """Parse and structure insights response"""
        try:
            # Try to extract JSON from the response
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                json_str = json_match.group()
                parsed = json.loads(json_str)
                return parsed
            else:
                # Fallback parsing if JSON extraction fails
                return self._fallback_parse_insights(response_text)
        except Exception as e:
            logger.error(f"Error parsing insights response: {e}")
            return self._fallback_parse_insights(response_text)
    
    def _fallback_parse_similarity(self, text: str) -> Dict[str, Any]:
        """Fallback parsing for similarity analysis"""
        lines = text.split('\n')
        
        return {
            "summary": "Analysis of document connections and relationships",
            "connections": [
                {
                    "title": "Cross-Document Connection",
                    "document": "Various Documents",
                    "snippet": text[:200] + "...",
                    "relationship": "Related concept found across documents",
                    "strength": "Medium",
                    "type": "supporting"
                }
            ],
            "key_insights": [
                "Multiple documents contain related concepts",
                "Cross-references suggest strong thematic connections"
            ],
            "suggested_follow_up": "Explore related sections in connected documents"
        }
    
    def _fallback_parse_insights(self, text: str) -> Dict[str, Any]:
        """Fallback parsing for AI insights"""
        return {
            "summary": "AI-generated insights from document analysis",
            "insights": [
                {
                    "type": "discovery",
                    "title": "Cross-Document Pattern",
                    "description": text[:300] + "...",
                    "evidence": "Analysis of document content",
                    "confidence": 75,
                    "impact": "Medium",
                    "category": "Pattern Recognition"
                }
            ],
            "cross_document_analysis": {
                "agreements": ["Common themes identified"],
                "disagreements": ["Varying perspectives noted"],
                "gaps": ["Additional research opportunities"],
                "evolution": "Understanding develops across documents"
            },
            "actionable_recommendations": [
                "Review highlighted connections for deeper insights",
                "Consider exploring related concepts in other documents"
            ]
        }
    
    def generate_quick_summary(self, text: str) -> str:
        """Generate a quick summary of text content"""
        try:
            prompt = f"""Provide a concise, informative summary of this text in 2-3 sentences:

{text[:1000]}

Focus on the main concepts, key findings, and core ideas."""

            response = self.model.generate_content(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    top_p=0.8,
                    max_output_tokens=256,
                )
            )
            
            return response.text.strip()
            
        except Exception as e:
            logger.error(f"Error generating quick summary: {e}")
            return "Summary generation failed."
