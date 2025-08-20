# PDF Chatbot Setup Guide

## 🚀 Quick Start

### 1. Environment Configuration

Create a `.env` file in the `backend` directory with your Google API key:

```env
# Google API Key for Gemini 2.5 Pro
GOOGLE_API_KEY=your_google_api_key_here

# FastAPI Configuration
HOST=127.0.0.1
PORT=8000
RELOAD=true

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### 2. Get Your Google API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key and add it to your `.env` file

### 3. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 4. Start the FastAPI Server

```bash
cd backend
python main.py
```

The server will run on `http://127.0.0.1:8000`

### 5. Test the Chatbot

1. Start your frontend (`npm run dev`)
2. Upload a PDF document in "New Documents"
3. Select the PDF (click the eye icon)
4. Click the floating chat button in bottom right
5. Start chatting with your PDF!

## 🤖 Features

- **PDF-specific responses**: Only answers questions about your selected PDF
- **Glassmorphism UI**: Beautiful glass effect design
- **Smart context**: Shows which PDF you're chatting with
- **Responsive design**: Works on all screen sizes
- **Real-time chat**: Instant responses from Gemini 2.5 Pro

## 🔧 API Endpoints

- `POST /api/pdf-chat` - Main chatbot endpoint
- `GET /health` - Health check
- `POST /api/clear-vector-db` - Clear vector database
- `GET /api/vector-db-stats` - Get database statistics

## 🛠️ Troubleshooting

If the chatbot doesn't work:
1. Check if the backend server is running
2. Verify your Google API key is correct
3. Make sure the PDF content is loaded
4. Check browser console for errors
