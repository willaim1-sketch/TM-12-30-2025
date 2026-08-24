import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import axios from "axios";

const API = process.env.REACT_APP_BACKEND_URL;

// Mascot for chatbot
const CHATBOT_AVATAR = "https://customer-assets-0z36b82j.emergentagent.net/job_df175a16-41d0-451b-88d8-ff076a4b992e/artifacts/c57qdrk8_photo_2026-08-23_11-38-48.jpg";

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEnabled, setIsEnabled] = useState(true);
  const [greeting, setGreeting] = useState("Hey there! 👋 I'm Nic, your BBQ buddy! I can help you with our menu, hours, ordering, catering, and more. What can I help you with today?");
  const [sessionId] = useState(() => `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Fetch chatbot settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await axios.get(`${API}/api/chatbot/settings`);
        setIsEnabled(response.data.enabled);
        if (response.data.greeting) {
          setGreeting(response.data.greeting);
        }
        // Set initial greeting message
        setMessages([{
          role: "assistant",
          content: response.data.greeting || greeting,
        }]);
      } catch (error) {
        console.error("Failed to fetch chatbot settings:", error);
        // Set default greeting
        setMessages([{
          role: "assistant",
          content: greeting,
        }]);
      }
    };
    fetchSettings();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await axios.post(`${API}/api/chatbot/message`, {
        message: userMessage,
        session_id: sessionId,
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.data.response },
      ]);
    } catch (error) {
      console.error("Chatbot error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Oops! I'm having trouble right now. Please try again or contact us directly at info@nicnackablesbbq.com",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickQuestions = [
    "What's on the menu?",
    "Do you cater events?",
    "What are your hours?",
    "How do I order?",
  ];

  // Don't render if chatbot is disabled
  if (!isEnabled) {
    return null;
  }

  return (
    <>
      {/* Chat Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-red-700 shadow-lg shadow-red-500/30 flex items-center justify-center hover:scale-110 transition-transform ${isOpen ? "hidden" : ""}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        data-testid="chatbot-toggle"
      >
        <img 
          src={CHATBOT_AVATAR}
          alt="Chat with Nic"
          className="w-12 h-12 rounded-full object-cover border-2 border-white/20"
        />
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-[#0D0D0D]" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] h-[550px] max-h-[calc(100vh-100px)] bg-[#0D0D0D] rounded-2xl shadow-2xl border border-white/10 flex flex-col overflow-hidden"
            data-testid="chatbot-window"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-red-600 to-red-700 p-4 flex items-center gap-3">
              <div className="relative">
                <img 
                  src={CHATBOT_AVATAR}
                  alt="Nic"
                  className="w-12 h-12 rounded-full object-cover border-2 border-white/30"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-red-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold">Nic - BBQ Assistant</h3>
                <p className="text-white/70 text-sm">Ask me anything!</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                data-testid="chatbot-close"
              >
                <X size={18} className="text-white" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center ${
                    msg.role === "user" 
                      ? "bg-red-500/20" 
                      : "bg-yellow-500/20"
                  }`}>
                    {msg.role === "user" ? (
                      <User size={16} className="text-red-400" />
                    ) : (
                      <img 
                        src={CHATBOT_AVATAR}
                        alt="Nic"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                  </div>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-red-600 text-white rounded-br-sm"
                        : "bg-[#1A1A1A] text-white/90 rounded-bl-sm border border-white/10"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex-shrink-0 overflow-hidden">
                    <img 
                      src={CHATBOT_AVATAR}
                      alt="Nic"
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  </div>
                  <div className="bg-[#1A1A1A] rounded-2xl rounded-bl-sm px-4 py-3 border border-white/10">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2 h-2 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Questions */}
            {messages.length <= 2 && (
              <div className="px-4 pb-2">
                <p className="text-white/50 text-xs mb-2">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(q);
                        setTimeout(() => sendMessage(), 0);
                      }}
                      className="text-xs bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-3 py-1.5 rounded-full border border-white/10 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 input-dark text-sm"
                  disabled={isLoading}
                  data-testid="chatbot-input"
                />
                <Button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="btn-primary px-4"
                  data-testid="chatbot-send"
                >
                  {isLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Send size={18} />
                  )}
                </Button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
