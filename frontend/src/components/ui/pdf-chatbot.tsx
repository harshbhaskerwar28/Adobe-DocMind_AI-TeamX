import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, FileText, Bot, User, Loader2, Brush } from 'lucide-react';
import { Button } from './button';
import { Input } from './input';
import { ScrollArea } from './scroll-area';
import { Badge } from './badge';
import { useDocuments } from '@/contexts/DocumentContext';
import { useNotifications } from '@/hooks/use-notifications';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  type: 'user' | 'bot';
  content: string;
  timestamp: Date;
}

interface ChatbotProps {
  className?: string;
}

export function PDFChatbot({ className }: ChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { currentFiles, selectedFile } = useDocuments();
  const { showError, showWarning } = useNotifications();

  // Get the selected PDF from current files (new documents only)
  const selectedPDF = selectedFile && currentFiles.find(file => file.id === selectedFile.id) 
    ? selectedFile 
    : null;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Initialize with welcome message when PDF is selected
  useEffect(() => {
    if (selectedPDF && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now().toString(),
        type: 'bot' as const,
        content: `Hello! I'm here to help you ask questions related to your selected PDF: **${selectedPDF.name}**\n\nFeel free to ask me anything about this document! 📚`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [selectedPDF?.id]); // Use selectedPDF.id to avoid unnecessary re-renders

  const sendMessage = async () => {
    if (!inputValue.trim()) return;
    
    if (!selectedPDF) {
      showWarning(
        "No PDF Selected",
        "Please select a PDF from 'New Documents' first to start chatting."
      );
      return;
    }

    if (!selectedPDF.content) {
      showError(
        "PDF Not Ready",
        "The selected PDF content is still being processed. Please wait a moment and try again."
      );
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Import the chat API utility
      const { sendChatMessage } = await import('@/utils/chatApi');
      
      const data = await sendChatMessage({
        question: userMessage.content,
        pdf_content: selectedPDF.content,
        pdf_name: selectedPDF.name
      });
      
      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: data.answer || "I couldn't generate a response. Please try again.",
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      showError(
        "Chat Error",
        "Failed to get response. Please make sure the backend server is running."
      );
      
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        content: "Sorry, I encountered an error while processing your question. Please make sure the backend server is running and try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (selectedPDF) {
      const welcomeMessage = {
        id: Date.now().toString(),
        type: 'bot' as const,
        content: `Chat cleared! I'm here to help you ask questions related to your selected PDF: **${selectedPDF.name}**\n\nFeel free to ask me anything about this document! 📚`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } else {
      setMessages([]);
    }
  };

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50", className)}>
        <Button
          onClick={() => setIsOpen(true)}
          className="h-12 w-12 sm:h-16 sm:w-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl hover:bg-white/20 hover:shadow-white/25 transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50", className)}>
      <div className="w-72 sm:w-80 lg:w-96 h-[400px] sm:h-[500px] bg-white/10 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl transition-all duration-300 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex flex-row items-center justify-between p-3 border-b border-white/20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div>
              <h3 className="text-white text-sm font-medium">PDF Assistant</h3>
              {selectedPDF ? (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-slate-300 truncate max-w-[180px]" title={selectedPDF.name}>
                    {selectedPDF.name}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full"></div>
                  <span className="text-xs text-red-400">No PDF Selected</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={clearChat}
              disabled={!selectedPDF || messages.length === 0}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Clear chat"
            >
              <Brush className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6 p-0 text-slate-400 hover:text-white hover:bg-white/10"
              title="Close chat"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[280px] sm:h-[360px] p-4">
            <div className="space-y-4">
              {!selectedPDF ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-slate-300">
                    Select a PDF from "New Documents" first to start chatting
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-8">
                  <Bot className="h-12 w-12 text-white mx-auto mb-3 opacity-50" />
                  <p className="text-sm text-slate-300">
                    Ask me anything about your PDF document
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.type === "user" ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[85%]", message.type === "user" ? "order-2" : "order-1")}>
                      <div className={cn(
                        "flex items-start gap-2",
                        message.type === "user" ? "flex-row-reverse" : "flex-row"
                      )}>
                        <div className="p-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/20 flex-shrink-0">
                          {message.type === "user" ? (
                            <User className="h-3 w-3 text-white" />
                          ) : (
                            <Bot className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="p-2.5 rounded-lg bg-white/10 border border-white/20 text-white backdrop-blur-sm min-w-0">
                          <div className="text-xs leading-relaxed whitespace-pre-line break-words">
                            {message.content.split('\n').map((line, index) => {
                              // Simple markdown rendering for bold text
                              const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
                              return (
                                <span key={index}>
                                  <span dangerouslySetInnerHTML={{ __html: formattedLine }} />
                                  {index < message.content.split('\n').length - 1 && <br />}
                                </span>
                              );
                            })}
                          </div>
                          <div className="text-xs opacity-60 mt-1">
                            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                    <div className="bg-white/10 border border-white/20 backdrop-blur-sm p-2 rounded-lg">
                      <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-white/20">
          <div className="flex items-center gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={selectedPDF ? "Ask about this PDF..." : "Select a PDF first"}
              disabled={!selectedPDF || isLoading}
              className="flex-1 bg-white/10 border border-white/20 text-white placeholder:text-slate-400 rounded-lg backdrop-blur-sm focus:bg-white/15 text-sm h-8"
            />
            <Button
              onClick={sendMessage}
              disabled={!inputValue.trim() || !selectedPDF || isLoading}
              className="bg-white/10 hover:bg-white/20 text-white rounded-lg shadow-lg hover:shadow-white/25 disabled:opacity-50 h-8 w-8 p-0 backdrop-blur-sm border border-white/20"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Send className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}