import { useState, useRef, useEffect } from 'react';
import { Send, Plus, History, MessageSquare, ChevronLeft } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface TenantryAIProps {
  user: User;
}

interface ChatSession {
  session_id: string;
  created_at: string;
  preview: string;
}

interface ChatMessage {
  text: string;
  sender: 'user' | 'bot';
}

export default function TenantryAI({ user }: TenantryAIProps) {
  // Current session ID - format: {userId}_{timestamp}
  const [sessionId, setSessionId] = useState<string>(() => {
    // Check if there's a saved session in localStorage
    const savedSession = localStorage.getItem(`tenantry_current_session_${user.id}`);
    if (savedSession) return savedSession;
    // Otherwise create a new session
    return `${user.id}_${Date.now()}`;
  });
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { text: "Hi! I'm Tenantry AI. Ask me anything about rental markets, real estate trends, or your reports.", sender: 'bot' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [visibleChatsCount, setVisibleChatsCount] = useState(10); // Track how many chats to show
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Loading messages that rotate every 8 seconds
  const loadingMessages = [
    "Analyzing your question",
    "Thinking",
    "Finalizing your insights",
    "Almost ready"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Rotate loading messages every 8 seconds
  useEffect(() => {
    if (isLoading) {
      setLoadingMessageIndex(0); // Reset to first message when loading starts
      
      const interval = setInterval(() => {
        setLoadingMessageIndex((prevIndex) => {
          // Stop at the last message (index 3 = "Almost ready")
          if (prevIndex < loadingMessages.length - 1) {
            return prevIndex + 1;
          }
          return prevIndex; // Stay at "Almost ready"
        });
      }, 8000); // Change message every 8 seconds

      return () => clearInterval(interval); // Clean up interval when loading stops
    }
  }, [isLoading]);

  // Save current session to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`tenantry_current_session_${user.id}`, sessionId);
  }, [sessionId, user.id]);

  // Load chat history for current session when component mounts or session changes
  useEffect(() => {
    loadCurrentSessionHistory();
  }, [sessionId]);

  const loadCurrentSessionHistory = async () => {
    try {
      // Query the n8n_chat_histories table for this session
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('*')
        .eq('session_id', sessionId)
        .order('id', { ascending: true });

      if (error) {
        console.error('Error loading chat history:', error);
        return;
      }

      if (data && data.length > 0) {
        // Parse the messages from the database
        // n8n stores messages in a specific format - we need to convert them
        const loadedMessages: ChatMessage[] = [];
        
        for (const row of data) {
          // n8n chat memory stores messages as JSON with type and content
          const message = row.message;
          if (message) {
            // Handle different possible formats from n8n
            if (typeof message === 'object') {
              if (message.type === 'human' || message.type === 'user') {
                let content = message.content || message.text || '';
                
                // Clean up user messages - extract only the actual user question
                // Remove all the metadata like "User name:", "User email:", etc.
                const lines = content.split('\n');
                const cleanLines: string[] = [];
                
                for (const line of lines) {
                  const trimmedLine = line.trim();
                  // Skip metadata lines
                  if (trimmedLine.startsWith('User name:') ||
                      trimmedLine.startsWith('User email:') ||
                      trimmedLine.startsWith('User phone:') ||
                      trimmedLine.startsWith('User company name:') ||
                      trimmedLine.startsWith('Incoming message type:') ||
                      trimmedLine.startsWith('Document summary from user:') ||
                      trimmedLine.startsWith('owner_id:')) {
                    continue;
                  }
                  // Look for "Message from user:" line and extract the actual message
                  if (trimmedLine.startsWith('Message from user:')) {
                    const userMessage = trimmedLine.replace(/^Message from user:\s*/i, '').trim();
                    if (userMessage) {
                      cleanLines.push(userMessage);
                    }
                  } else if (cleanLines.length > 0) {
                    // After we've started collecting the message, include subsequent lines
                    cleanLines.push(trimmedLine);
                  }
                }
                
                const cleanContent = cleanLines.join('\n').trim();
                if (cleanContent) {
                  loadedMessages.push({ text: cleanContent, sender: 'user' });
                }
              } else if (message.type === 'ai' || message.type === 'bot' || message.type === 'assistant') {
                let content = message.content || message.text || '';
                
                // AI messages might have nested JSON like: '{"output":{"message":"..."}}'
                // Try to parse and extract the actual message
                try {
                  if (typeof content === 'string' && content.startsWith('{')) {
                    const parsed = JSON.parse(content);
                    if (parsed.output && parsed.output.message) {
                      content = parsed.output.message;
                    } else if (parsed.message) {
                      content = parsed.message;
                    }
                  }
                } catch {
                  // If parsing fails, use content as-is
                }
                
                if (content) {
                  loadedMessages.push({ text: content, sender: 'bot' });
                }
              }
            }
          }
        }

        if (loadedMessages.length > 0) {
          // Add the welcome message at the start if not already there
          setMessages([
            { text: "Hi! I'm Tenantry AI. Ask me anything about rental markets, real estate trends, or your reports.", sender: 'bot' },
            ...loadedMessages
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const loadPreviousSessions = async () => {
    setIsLoadingSessions(true);
    try {
      console.log('Loading sessions for user:', user.id);
      
      // Query all sessions for this user (session_id starts with user.id)
      // Using .like() with % wildcard to match both exact user ID and user ID with timestamp
      const { data, error } = await supabase
        .from('n8n_chat_histories')
        .select('session_id, id, message')
        .like('session_id', `${user.id}%`)
        .order('id', { ascending: false });

      console.log('Query result:', { data, error });
      
      // Log all unique session_ids found in the data
      if (data) {
        const uniqueSessionIds = new Set(data.map(row => row.session_id));
        console.log('Raw unique session_ids from query:', Array.from(uniqueSessionIds));
      }

      if (error) {
        console.error('Error loading sessions:', error);
        return;
      }

      if (data && data.length > 0) {
        console.log('Found', data.length, 'messages');
        
        // Group by session_id and get the first message as preview
        const sessionMap = new Map<string, ChatSession>();
        
        for (const row of data) {
          if (!sessionMap.has(row.session_id)) {
            // Extract timestamp from session_id (format: userId_timestamp)
            const parts = row.session_id.split('_');
            const timestamp = parts[parts.length - 1];
            
            // Try to parse timestamp, fallback to "Recent" if it fails
            let createdAt = 'Recent';
            const timestampNum = parseInt(timestamp);
            if (!isNaN(timestampNum) && timestampNum > 1000000000000) {
              createdAt = new Date(timestampNum).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              });
            }

            // Get preview from first user message
            let preview = 'New conversation';
            if (row.message) {
              if (typeof row.message === 'object') {
                // Check if it's a human/user message
                if (row.message.type === 'human' || row.message.type === 'user') {
                  let content = row.message.content || row.message.text || '';
                  
                  // Extract clean message from metadata
                  const lines = content.split('\n');
                  for (const line of lines) {
                    const trimmedLine = line.trim();
                    if (trimmedLine.startsWith('Message from user:')) {
                      const userMessage = trimmedLine.replace(/^Message from user:\s*/i, '').trim();
                      if (userMessage) {
                        preview = userMessage.substring(0, 50);
                        if (userMessage.length > 50) preview += '...';
                        break;
                      }
                    }
                  }
                }
              } else if (typeof row.message === 'string') {
                // Sometimes the message might be a JSON string
                try {
                  const parsed = JSON.parse(row.message);
                  if (parsed.type === 'human' || parsed.type === 'user') {
                    let content = parsed.content || parsed.text || '';
                    const lines = content.split('\n');
                    for (const line of lines) {
                      const trimmedLine = line.trim();
                      if (trimmedLine.startsWith('Message from user:')) {
                        const userMessage = trimmedLine.replace(/^Message from user:\s*/i, '').trim();
                        if (userMessage) {
                          preview = userMessage.substring(0, 50);
                          if (userMessage.length > 50) preview += '...';
                          break;
                        }
                      }
                    }
                  }
                } catch {
                  // If parsing fails, use the string as-is
                  preview = row.message.substring(0, 50);
                  if (row.message.length > 50) preview += '...';
                }
              }
            }

            sessionMap.set(row.session_id, {
              session_id: row.session_id,
              created_at: createdAt,
              preview
            });
          }
        }

        // Find actual first user message for each session (going in chronological order)
        for (const row of [...data].reverse()) {
          const session = sessionMap.get(row.session_id);
          if (session && row.message && session.preview === 'New conversation') {
            let messageObj = row.message;
            
            // Handle string messages
            if (typeof messageObj === 'string') {
              try {
                messageObj = JSON.parse(messageObj);
              } catch {
                // Keep as is
              }
            }
            
            if (typeof messageObj === 'object') {
              if (messageObj.type === 'human' || messageObj.type === 'user') {
                let content = (messageObj.content || messageObj.text || '').trim();
                
                // Extract clean message from metadata
                const lines = content.split('\n');
                for (const line of lines) {
                  const trimmedLine = line.trim();
                  if (trimmedLine.startsWith('Message from user:')) {
                    const userMessage = trimmedLine.replace(/^Message from user:\s*/i, '').trim();
                    if (userMessage) {
                      let preview = userMessage.substring(0, 50);
                      if (userMessage.length > 50) preview += '...';
                      session.preview = preview;
                      break;
                    }
                  }
                }
              }
            }
          }
        }

        const sessions = Array.from(sessionMap.values());
        console.log('Found', sessionMap.size, 'unique sessions');
        console.log('Unique session IDs:', Array.from(sessionMap.keys()));
        console.log('Processed sessions:', sessions);
        setChatSessions(sessions);
      } else {
        console.log('No messages found in database');
        setChatSessions([]);
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoadingSessions(false);
    }
  };

  const startNewChat = () => {
    const newSessionId = `${user.id}_${Date.now()}`;
    setSessionId(newSessionId);
    setMessages([
      { text: "Hi! I'm Tenantry AI. Ask me anything about rental markets, real estate trends, or your reports.", sender: 'bot' }
    ]);
    setShowHistory(false);
  };

  const loadSession = async (selectedSessionId: string) => {
    setSessionId(selectedSessionId);
    setShowHistory(false);
    // The useEffect will trigger loadCurrentSessionHistory
  };

  const toggleHistory = () => {
    if (!showHistory) {
      loadPreviousSessions();
      setVisibleChatsCount(10); // Reset to show 10 chats when opening history
    }
    setShowHistory(!showHistory);
  };

  const loadMoreChats = () => {
    setVisibleChatsCount(prev => prev + 10); // Load 10 more chats
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { text: userMessage, sender: 'user' }]);
    setIsLoading(true);

    try {
      // Prepare user information payload with session ID
      const payload = { 
        message: userMessage,
        sessionId: sessionId, // Send the session ID to n8n
        user: {
          id: user.id,
          email: user.email,
          phone: user.phone,
          created_at: user.created_at,
          last_sign_in_at: user.last_sign_in_at,
          confirmed_at: user.confirmed_at,
          first_name: user.user_metadata?.first_name,
          last_name: user.user_metadata?.last_name,
          full_name: user.user_metadata?.full_name,
          avatar_url: user.user_metadata?.avatar_url,
          ...user.user_metadata,
          app_metadata: user.app_metadata,
        }
      };
      
      const response = await fetch('https://tenantry.app.n8n.cloud/webhook/6114eecc-0772-4a74-a4fd-de5a92b839fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const responseText = data.output?.message || data.response || data.message || 'Sorry, I could not process your request.';

      setMessages(prev => [...prev, {
        text: responseText,
        sender: 'bot'
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        text: 'Sorry, I encountered an error. Please try again.',
        sender: 'bot'
      }]);
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

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with New Chat and History buttons */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Tenantry AI</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Ask me anything about rental markets, property analysis, or real estate trends
            </p>
          </div>
          <div className="flex gap-2">
            {/* New Chat Button */}
            <button
              onClick={startNewChat}
              className="flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all"
              title="Start New Chat"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Chat</span>
            </button>
            {/* Chat History Button */}
            <button
              onClick={toggleHistory}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                showHistory 
                  ? 'bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400 border border-brand-300 dark:border-brand-700' 
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
              title="View Chat History"
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline">History</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex gap-4">
          {/* Chat History Sidebar */}
          {showHistory && (
            <div className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 h-[600px] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">Previous Chats</h3>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {isLoadingSessions ? (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-gray-500 dark:text-gray-400">Loading...</div>
                </div>
              ) : chatSessions.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                  <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm">No previous chats found</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Start a conversation and it will appear here</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto space-y-2">
                  {chatSessions.slice(0, visibleChatsCount).map((session) => (
                    <button
                      key={session.session_id}
                      onClick={() => loadSession(session.session_id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        session.session_id === sessionId
                          ? 'bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-700'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <MessageSquare className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {session.preview}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {session.created_at}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  
                  {/* Load More Button */}
                  {chatSessions.length > visibleChatsCount && (
                    <button
                      onClick={loadMoreChats}
                      className="w-full p-3 mt-2 text-center text-sm font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/30 rounded-lg border border-brand-200 dark:border-brand-700 transition-all"
                    >
                      Load more ({chatSessions.length - visibleChatsCount} remaining)
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Chat Area */}
          <div className={`flex-1 ${showHistory ? 'max-w-[calc(100%-21rem)]' : ''}`}>
            {/* Messages Area */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4 min-h-[500px] max-h-[600px] overflow-y-auto mb-6">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.sender === 'user'
                        ? 'bg-brand-500 text-white'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{message.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      {loadingMessages[loadingMessageIndex]}
                      <span className="inline-block animate-[ellipsis_1.4s_infinite]">.</span>
                      <span className="inline-block animate-[ellipsis_1.4s_infinite_0.2s]">.</span>
                      <span className="inline-block animate-[ellipsis_1.4s_infinite_0.4s]">.</span>
                    </p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask anything..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent disabled:bg-gray-100 dark:disabled:bg-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
