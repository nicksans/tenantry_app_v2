import { useState, useEffect } from 'react';
import { MessageSquare, Plus, Search, Filter, ChevronDown, Phone, Video, MoreVertical, Send, Paperclip, Smile, ArrowUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'landlord' | 'tenant' | 'emma';
  content: string;
  timestamp: Date;
  read: boolean;
}

interface Conversation {
  id: string;
  participantName: string;
  participantType: 'tenant' | 'emma';
  conversationType: 'landlord-tenant' | 'landlord-emma' | 'tenant-emma';
  propertyName: string;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
}

interface MessagesProps {
  userId?: string;
}

export default function Messages({ userId }: MessagesProps) {
  const [selectedPropertyFilter, setSelectedPropertyFilter] = useState<string>('all');
  const [selectedTenantFilter, setSelectedTenantFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<string | null>('emma-chat');
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [displayedMessages, setDisplayedMessages] = useState(5);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [allEmmaMessages, setAllEmmaMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);

  // Mock data for demonstration
  const properties = [
    { id: '1', name: '123 Main Street' },
    { id: '2', name: '456 Oak Avenue' },
    { id: '3', name: '789 Pine Road' }
  ];

  const tenants = [
    { id: '1', name: 'John Smith', propertyId: '1' },
    { id: '2', name: 'Sarah Johnson', propertyId: '1' },
    { id: '3', name: 'Mike Davis', propertyId: '2' },
    { id: '4', name: 'Emma Wilson', propertyId: '3' }
  ];

  // Fetch Emma chat messages from Supabase
  useEffect(() => {
    console.log('Messages component userId:', userId);
    if (!userId) {
      console.log('No userId provided, skipping fetch');
      setIsLoadingMessages(false);
      return;
    }
    
    const fetchMessages = async () => {
      setIsLoadingMessages(true);
      try {
        console.log('Fetching messages for session_id:', userId);
        
        // First, let's see ALL messages to debug
        const { data: allData, error: allError } = await supabase
          .from('n8n_chat_histories')
          .select('*')
          .limit(10);
        
        console.log('All messages in table (first 10):', allData);
        
        const { data, error } = await supabase
          .from('n8n_chat_histories')
          .select('*')
          .eq('session_id', userId)
          .order('created_at', { ascending: true });

        console.log('Query result - data:', data, 'error:', error);

        if (error) {
          console.error('Error fetching messages:', error);
          return;
        }

        if (data) {
          console.log('Raw chat data from Supabase:', data);
          
          // Transform the data to match our Message interface
          const transformedMessages: Message[] = data.map((msg: any) => {
            // The message field is already an object, not a JSON string
            let messageContent = '';
            let senderType: 'landlord' | 'emma' = 'emma';
            
            const messageObj = msg.message;
            
            if (typeof messageObj === 'object' && messageObj !== null) {
              console.log('Processing message object:', messageObj);
              
              if (messageObj.type === 'human') {
                // Human message - extract only the actual message from user
                let rawContent = messageObj.content || '';
                
                // Check if content has "Message from user:" pattern
                if (rawContent.includes('Message from user:')) {
                  // Extract text after "Message from user:" and before next line break or "Document summary"
                  const match = rawContent.match(/Message from user:\s*([^\n]+)/);
                  if (match && match[1]) {
                    messageContent = match[1].trim();
                  } else {
                    messageContent = rawContent;
                  }
                } else {
                  messageContent = rawContent;
                }
                
                senderType = 'landlord';
              } else if (messageObj.type === 'ai') {
                // AI message - content might be a JSON string with output.message
                let aiContent = messageObj.content;
                
                // If content is a string, try to parse it for the output.message
                if (typeof aiContent === 'string') {
                  try {
                    const parsedContent = JSON.parse(aiContent);
                    messageContent = parsedContent.output?.message || parsedContent.message || aiContent;
                  } catch (e) {
                    messageContent = aiContent;
                  }
                } else if (typeof aiContent === 'object') {
                  messageContent = aiContent.output?.message || aiContent.message || JSON.stringify(aiContent);
                } else {
                  messageContent = String(aiContent || '');
                }
                senderType = 'emma';
              }
            } else if (typeof messageObj === 'string') {
              // Fallback: if it's a string, use it directly
              messageContent = messageObj;
            }

            return {
              id: msg.id.toString(),
              senderId: senderType === 'landlord' ? userId : 'emma',
              senderName: senderType === 'landlord' ? 'You' : 'Emma AI',
              senderType: senderType,
              content: messageContent,
              timestamp: new Date(msg.created_at),
              read: true
            };
          });

          console.log('Transformed messages:', transformedMessages);
          setAllEmmaMessages(transformedMessages);
        }
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        setIsLoadingMessages(false);
      }
    };

    fetchMessages();
  }, [userId]);

  // Get last message from Emma chat for the conversation list
  const lastEmmaMessage = allEmmaMessages.length > 0 ? allEmmaMessages[allEmmaMessages.length - 1] : null;
  
  // Safely get last message preview
  const getLastMessagePreview = () => {
    if (!lastEmmaMessage || !lastEmmaMessage.content) return 'No messages yet';
    const content = String(lastEmmaMessage.content);
    return content.length > 50 ? content.substring(0, 50) + '...' : content;
  };

  const mockConversations: Conversation[] = [
    {
      id: 'emma-chat',
      participantName: 'Emma AI',
      participantType: 'emma',
      conversationType: 'landlord-emma',
      propertyName: 'All Properties',
      lastMessage: getLastMessagePreview(),
      lastMessageTime: lastEmmaMessage?.timestamp || new Date(),
      unreadCount: 0
    },
    {
      id: '1',
      participantName: 'John Smith',
      participantType: 'tenant',
      conversationType: 'landlord-tenant',
      propertyName: '123 Main Street',
      lastMessage: 'Thanks for fixing the heater so quickly!',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
      unreadCount: 2
    },
    {
      id: '3',
      participantName: 'Emma → Sarah Johnson',
      participantType: 'tenant',
      conversationType: 'tenant-emma',
      propertyName: '123 Main Street',
      lastMessage: 'Emma: Your maintenance request has been received...',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
      unreadCount: 0
    },
    {
      id: '4',
      participantName: 'Mike Davis',
      participantType: 'tenant',
      conversationType: 'landlord-tenant',
      propertyName: '456 Oak Avenue',
      lastMessage: 'When is the rent due this month?',
      lastMessageTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * 4), // 4 days ago
      unreadCount: 1
    }
  ];

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const formatMessageTime = (date: Date) => {
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });

    if (isToday) return time;
    if (isYesterday) return `Yesterday ${time}`;
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${time}`;
  };

  const filteredConversations = mockConversations
    .filter(conv => {
      if (selectedPropertyFilter !== 'all' && conv.propertyName !== properties.find(p => p.id === selectedPropertyFilter)?.name) {
        return false;
      }
      if (searchQuery && !conv.participantName.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      return true;
    })
    .sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime());

  const currentConversation = mockConversations.find(c => c.id === selectedConversation);
  
  // Get messages for Emma chat (show only last N messages)
  const getDisplayedEmmaMessages = () => {
    const totalMessages = allEmmaMessages.length;
    const startIndex = Math.max(0, totalMessages - displayedMessages);
    return allEmmaMessages.slice(startIndex);
  };
  
  const hasMoreMessages = displayedMessages < allEmmaMessages.length;
  
  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Simulate loading delay
    setTimeout(() => {
      setDisplayedMessages(prev => Math.min(prev + 10, allEmmaMessages.length));
      setIsLoadingMore(false);
    }, 500);
  };

  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversation(conversationId);
    // Reset displayed messages count when switching to Emma chat
    if (conversationId === 'emma-chat') {
      setDisplayedMessages(5);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Messages</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Start new conversations and view all message history between you, your tenants, and Emma.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        {/* Conversations List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Header with New Message Button */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowNewMessageModal(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium mb-4"
              >
                <Plus className="w-4 h-4" />
                New Message
              </button>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>

              {/* Filters */}
              <div className="space-y-2">
                <div className="relative">
                  <select
                    value={selectedPropertyFilter}
                    onChange={(e) => setSelectedPropertyFilter(e.target.value)}
                    className="w-full appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="all">All Properties</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Conversations List */}
            <div className="overflow-y-auto max-h-[600px]">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                  <p>No conversations found</p>
                </div>
              ) : (
                filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => handleConversationSelect(conversation.id)}
                    className={`w-full p-4 border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left ${
                      selectedConversation === conversation.id ? 'bg-brand-50 dark:bg-brand-900/30' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Avatar */}
                      <div 
                        className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold ${
                          conversation.participantType !== 'emma' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : ''
                        }`}
                        style={conversation.participantType === 'emma' ? { background: 'linear-gradient(135deg, #0D98BA, #7928CA)' } : {}}
                      >
                        {conversation.participantType === 'emma' ? 'E' : conversation.participantName.charAt(0)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between mb-1">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {conversation.participantName}
                            </h3>
                            {conversation.conversationType === 'landlord-emma' ? (
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: 'linear-gradient(135deg, #0D98BA, #7928CA)' }}>
                                You ↔ Emma
                              </span>
                            ) : conversation.conversationType === 'tenant-emma' ? (
                              <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium text-white" style={{ background: 'linear-gradient(135deg, #0D98BA, #7928CA)' }}>
                                Tenant ↔ Emma
                              </span>
                            ) : (
                              <span className="flex-shrink-0 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium">
                                You ↔ Tenant
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 flex-shrink-0">
                            {formatTimestamp(conversation.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                          {conversation.propertyName}
                        </p>
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                            {conversation.lastMessage}
                          </p>
                          {conversation.unreadCount > 0 && (
                            <span className="ml-2 flex-shrink-0 bg-brand-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {conversation.unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Message Thread */}
        <div className="lg:col-span-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[700px] flex flex-col">
            {!currentConversation ? (
              // Empty state
              <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" />
                  <p className="text-lg font-medium mb-2">Select a conversation</p>
                  <p className="text-sm">Choose a conversation from the list to view messages</p>
                </div>
              </div>
            ) : (
              <>
                {/* Thread Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                        currentConversation.participantType !== 'emma' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : ''
                      }`}
                      style={currentConversation.participantType === 'emma' ? { background: 'linear-gradient(135deg, #0D98BA, #7928CA)' } : {}}
                    >
                      {currentConversation.participantType === 'emma' ? 'E' : currentConversation.participantName.charAt(0)}
                    </div>
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-gray-100">
                        {currentConversation.participantName}
                      </h2>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {currentConversation.propertyName}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentConversation.participantType === 'tenant' && (
                      <>
                        <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Phone className="w-5 h-5" />
                        </button>
                        <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                          <Video className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {/* Loading State */}
                  {isLoadingMessages ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-gray-500 dark:text-gray-400">Loading messages...</div>
                    </div>
                  ) : allEmmaMessages.length === 0 ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="text-center text-gray-500 dark:text-gray-400">
                        <MessageSquare className="w-12 h-12 mx-auto mb-2 text-gray-400 dark:text-gray-600" />
                        <p>No messages yet</p>
                        <p className="text-sm mt-1">Start a conversation with Emma using the chat widget!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Load More Button for Emma Chat */}
                      {currentConversation.id === 'emma-chat' && hasMoreMessages && (
                    <div className="flex justify-center mb-4">
                      <button
                        onClick={handleLoadMore}
                        disabled={isLoadingMore}
                        className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ArrowUp className="w-4 h-4" />
                        {isLoadingMore ? 'Loading...' : `Show Previous Messages (${allEmmaMessages.length - displayedMessages} older)`}
                      </button>
                    </div>
                  )}

                  {/* Render messages */}
                  {(currentConversation.id === 'emma-chat' ? getDisplayedEmmaMessages() : []).map((message, index, arr) => {
                    const isCurrentUser = message.senderType === 'landlord';
                    const showTimestamp = index === 0 || 
                      (arr[index - 1].timestamp.getTime() - message.timestamp.getTime() > 1000 * 60 * 60);

                    return (
                      <div key={message.id}>
                        {showTimestamp && (
                          <div className="flex justify-center mb-4">
                            <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                              {formatMessageTime(message.timestamp)}
                            </span>
                          </div>
                        )}
                        <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex items-end gap-2 max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}>
                            {!isCurrentUser && (
                              <div 
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 ${
                                  message.senderType !== 'emma' ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : ''
                                }`}
                                style={message.senderType === 'emma' ? { background: 'linear-gradient(135deg, #0D98BA, #7928CA)' } : {}}
                              >
                                {message.senderType === 'emma' ? 'E' : message.senderName.charAt(0)}
                              </div>
                            )}
                            <div>
                              {!isCurrentUser && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 px-1">
                                  {message.senderName}
                                </p>
                              )}
                              <div 
                                className={`rounded-2xl px-4 py-2 ${
                                  isCurrentUser 
                                    ? 'bg-brand-500 text-white' 
                                    : message.senderType === 'emma'
                                    ? 'text-gray-900 dark:text-gray-100'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                                }`}
                                style={!isCurrentUser && message.senderType === 'emma' ? { 
                                  background: 'linear-gradient(135deg, rgba(13, 152, 186, 0.15), rgba(121, 40, 202, 0.15))'
                                } : {}}
                              >
                                <p className="text-sm">{message.content}</p>
                              </div>
                              {!message.read && !isCurrentUser && (
                                <p className="text-xs text-brand-600 dark:text-brand-400 mt-1 px-1 font-medium">
                                  New
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                    </>
                  )}
                </div>

                {/* Message Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-end gap-2">
                    <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <div className="flex-1 relative">
                      <textarea
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        placeholder="Type a message..."
                        rows={1}
                        className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            // Handle send message
                            setMessageInput('');
                          }
                        }}
                      />
                      <button className="absolute right-3 bottom-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <Smile className="w-5 h-5" />
                      </button>
                    </div>
                    <button className="p-3 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors">
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMessageModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                New Message
              </h3>
              <button
                onClick={() => setShowNewMessageModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <span className="text-2xl">&times;</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Property
                </label>
                <div className="relative">
                  <select className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="">Choose a property</option>
                    {properties.map(prop => (
                      <option key={prop.id} value={prop.id}>{prop.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Tenant
                </label>
                <div className="relative">
                  <select className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="">Choose a tenant</option>
                    {tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  placeholder="Type your message..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowNewMessageModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    // Handle send
                    setShowNewMessageModal(false);
                  }}
                  className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors font-medium"
                >
                  Send Message
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

