import { Send, Sparkles, BookOpen } from 'lucide-react';
import { useState } from 'react';

export default function AskEmma() {
  const [message, setMessage] = useState('');
  const [knowledgeInput, setKnowledgeInput] = useState('');
  const [savedMessage, setSavedMessage] = useState('');

  const suggestedQuestions = [
    'What is the current market rent for 2BR units in my area?',
    'How is my property performing compared to market averages?',
    'When should I consider raising rent for my tenants?',
    'What are the tax implications of selling one of my properties?',
    'How can I improve my cash flow?',
  ];

  const handleSaveKnowledge = () => {
    if (knowledgeInput.trim()) {
      // TODO: Save to database/backend
      console.log('Saving knowledge:', knowledgeInput);
      setSavedMessage('Saved! I\'ll remember this information.');
      setTimeout(() => {
        setSavedMessage('');
        setKnowledgeInput('');
      }, 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img src="/Emma_Tenantry.png" alt="Emma" className="w-12 h-12 rounded-full" />
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100">Hey, Nick</h1>
            <p className="text-gray-600 dark:text-gray-400">How can I help you today?</p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          I can help you analyze your property's performance, track rental expenses, and provide market insights. What would you like to explore today?
        </p>

        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Suggested questions:</p>
          {suggestedQuestions.map((question, index) => (
            <button
              key={index}
              onClick={() => setMessage(question)}
              className="w-full text-left p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
            >
              <p className="text-sm text-gray-700 dark:text-gray-300">{question}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-5 h-5" style={{ 
            background: 'linear-gradient(135deg, #0D98BA, #7928CA)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }} />
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Add to Emma's Knowledge</h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Is there anything specific I should know about your properties or tenants? Enter it here and I'll remember it moving forward!
        </p>
        <textarea
          value={knowledgeInput}
          onChange={(e) => setKnowledgeInput(e.target.value)}
          placeholder="e.g., Property at 123 Main St has a new roof installed in 2024, Tenant John prefers email communication, HOA fees increase annually in January..."
          className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none"
          rows={4}
          style={{
            boxShadow: 'none',
            outline: 'none',
          }}
          onFocus={(e) => {
            e.target.style.boxShadow = '0 0 0 2px #0D98BA, 0 0 0 4px #7928CA40';
          }}
          onBlur={(e) => {
            e.target.style.boxShadow = 'none';
          }}
        />
        <div className="flex items-center justify-between mt-3">
          <div className="flex-1">
            {savedMessage && (
              <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                {savedMessage}
              </p>
            )}
          </div>
          <button
            onClick={handleSaveKnowledge}
            disabled={!knowledgeInput.trim()}
            className="px-6 py-2 text-white rounded-lg transition-all disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: !knowledgeInput.trim() ? undefined : 'linear-gradient(135deg, #0D98BA, #7928CA)',
            }}
          >
            <BookOpen className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">Chat with Emma</h3>
        </div>

        <div className="h-96 p-6 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="flex items-start gap-3 mb-4">
            <img src="/Emma_Tenantry.png" alt="Emma" className="w-8 h-8 rounded-full flex-shrink-0" />
            <div className="bg-white dark:bg-gray-700 rounded-lg p-4 shadow-sm max-w-lg">
              <p className="text-gray-700 dark:text-gray-300">
                Hello Nick! I'm Emma, your rental property assistant. I'm here to help you manage your properties, understand market trends, and make informed decisions. Feel free to ask me anything about your rental portfolio!
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              style={{
                boxShadow: 'none',
                outline: 'none',
              }}
              onFocus={(e) => {
                e.target.style.boxShadow = '0 0 0 2px #0D98BA, 0 0 0 4px #7928CA40';
              }}
              onBlur={(e) => {
                e.target.style.boxShadow = 'none';
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  console.log('Send message:', message);
                }
              }}
            />
            <button 
              className="px-6 py-3 text-white rounded-lg transition-all flex items-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #0D98BA, #7928CA)',
              }}
            >
              <Send className="w-4 h-4" />
              <span>Send</span>
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Press Enter to send • Emma is powered by AI and may make mistakes
          </p>
        </div>
      </div>
    </div>
  );
}
