#!/usr/bin/env python3
"""
Simple script to run the PDF processing and chatbot server
"""

import os
import sys
from pathlib import Path

def check_env_setup():
    """Check if environment is properly configured"""
    print("🔧 Checking environment setup...")
    
    # Check if we're in the right directory
    if not Path('pdf_extractor.py').exists():
        print("❌ pdf_extractor.py not found. Please run this script from the backend directory.")
        return False
    
    # Check for .env file
    env_file = Path('.env')
    if not env_file.exists():
        print("⚠️  .env file not found. Creating example...")
        with open('.env', 'w') as f:
            f.write("""# Google API Key for Gemini AI (required for chatbot and AI features)
GOOGLE_API_KEY=your_google_api_key_here

# Get your API key from: https://makersuite.google.com/app/apikey
""")
        print("✅ Created .env file. Please add your Google API key!")
        return False
    
    # Check if API key is set
    from dotenv import load_dotenv
    load_dotenv()
    
    if not os.getenv('GOOGLE_API_KEY') or os.getenv('GOOGLE_API_KEY') == 'your_google_api_key_here':
        print("⚠️  GOOGLE_API_KEY not configured in .env file")
        print("🔑 Please add your Google API key to enable the chatbot and AI features")
        print("📝 Get your key from: https://makersuite.google.com/app/apikey")
        
        response = input("Continue anyway? The chatbot won't work without the API key. (y/N): ")
        if response.lower() != 'y':
            return False
    else:
        print("✅ Google API key configured")
    
    return True

def start_server():
    """Start the server"""
    print("\n🚀 Starting Adobe Finals AI Server...")
    print("📍 Server URL: http://localhost:8000")
    print("📚 API Docs: http://localhost:8000/docs")
    print("💬 PDF Chatbot endpoint: http://localhost:8000/api/pdf-chat")
    print("\n🌟 Available features:")
    print("  • PDF text extraction and processing")
    print("  • AI-powered PDF chatbot with Gemini")
    print("  • Similarity search across documents")
    print("  • AI insights and analysis")
    print("  • Podcast generation")
    print("  • Vector database management")
    print("\n⏹️  Press Ctrl+C to stop\n")
    
    try:
        import uvicorn
        from pdf_extractor import app
        
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info",
            reload=True
        )
    except KeyboardInterrupt:
        print("\n👋 Server stopped")
    except Exception as e:
        print(f"❌ Error starting server: {e}")

if __name__ == "__main__":
    print("🤖 Adobe Finals - AI-Powered Document Analysis Server")
    print("=" * 55)
    
    if check_env_setup():
        start_server()
    else:
        print("\n❌ Setup incomplete. Please fix the issues above and try again.")
        sys.exit(1)
