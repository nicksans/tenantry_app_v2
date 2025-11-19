import { Upload, Building2, Phone, Banknote, Clock, HomeIcon, File, User, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface DashboardProps {
  onAddPropertyClick?: () => void;
}

interface Article {
  id: string;
  title: string;
  content: string;
  url: string;
  image: string | null;
  published_date: string;
  created_at: string;
}

export default function Dashboard({ onAddPropertyClick }: DashboardProps) {
  const onboardingSteps = [
    { label: 'Confirm your phone number', icon: Phone, completed: false, time: '10s' },
    { label: 'Add a property', icon: Building2, completed: false, time: '15s' },
    { label: 'Add a unit', icon: HomeIcon, completed: false, time: '20s' },
    { label: 'Add a lease', icon: File, completed: false, time: '20s' },
    { label: 'Add a tenant', icon: User, completed: false, time: '20s' },
    { label: 'Connect a mortgage account', icon: Banknote, completed: false, time: '45s' },
    { label: 'Upload a document', icon: Upload, completed: false, time: '30s' },
  ];

  const completedCount = onboardingSteps.filter(step => step.completed).length;
  const progress = Math.round((completedCount / onboardingSteps.length) * 100);

  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneSuccess, setPhoneSuccess] = useState(false);
  const [phoneError, setPhoneError] = useState('');

  useEffect(() => {
    fetchArticles();
  }, []);

  const fetchArticles = async () => {
    try {
      const { data, error } = await supabase
        .from('daily_articles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      if (data) setArticles(data);
    } catch (error) {
      console.error('Error fetching articles:', error);
    } finally {
      setLoadingArticles(false);
    }
  };

  const handleSavePhone = async () => {
    try {
      setSavingPhone(true);
      setPhoneError('');
      setPhoneSuccess(false);
      
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPhoneError('You must be logged in to save your phone number');
        setSavingPhone(false);
        return;
      }

      // Remove all non-numeric characters from the phone number
      const cleanedNumber = phoneNumber.replace(/\D/g, '');
      
      // Check if it's a valid 10-digit US number
      if (cleanedNumber.length !== 10) {
        setPhoneError('Please enter a valid 10-digit phone number');
        setSavingPhone(false);
        return;
      }

      // Format as +1 followed by the 10 digits
      const formattedPhone = `+1${cleanedNumber}`;

      // Update the user's phone number in the user_profiles table
      const { error } = await supabase
        .from('user_profiles')
        .update({ phone: formattedPhone })
        .eq('id', user.id);

      if (error) throw error;

      // Success! Show success message
      setPhoneSuccess(true);
      
      // Auto-close modal after 2 seconds
      setTimeout(() => {
        setShowPhoneModal(false);
        setPhoneNumber('');
        setPhoneSuccess(false);
      }, 2000);
    } catch (error) {
      console.error('Error saving phone number:', error);
      setPhoneError('Failed to save phone number. Please try again.');
    } finally {
      setSavingPhone(false);
    }
  };

  const handleClosePhoneModal = () => {
    setShowPhoneModal(false);
    setPhoneNumber('');
    setPhoneError('');
    setPhoneSuccess(false);
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInDays > 0) {
      return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
    } else if (diffInHours > 0) {
      return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
    } else {
      return 'Just now';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Welcome back, Nick</h1>
        <p className="text-gray-600 dark:text-gray-400">Let's see how your properties are doing.</p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8">
        <div className="flex items-start gap-6">
          <div className="relative w-32 h-32">
            <svg className="transform -rotate-90 w-32 h-32">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                className="text-gray-200 dark:text-gray-700"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                className="text-gray-900 dark:text-brand-400"
                strokeWidth="12"
                fill="none"
                strokeDasharray={`${2 * Math.PI * 56}`}
                strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">{progress}%</span>
            </div>
          </div>

          <div className="flex-1">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-1">You're {progress}% setup! (~2 mins left)</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">Complete these steps to unlock Tenantry's full insights.</p>

            <div className="space-y-2">
              {onboardingSteps.map((step, index) => {
                const Icon = step.icon;
                const isAddPropertyStep = step.label === 'Add a property';
                const isPhoneStep = step.label === 'Confirm your phone number';
                const isClickable = isAddPropertyStep || isPhoneStep;
                
                const handleClick = () => {
                  if (isAddPropertyStep) {
                    onAddPropertyClick?.();
                  } else if (isPhoneStep) {
                    setShowPhoneModal(true);
                  }
                };
                
                return (
                  <div
                    key={index}
                    onClick={isClickable ? handleClick : undefined}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      step.completed ? 'bg-brand-50 dark:bg-brand-900/30' : 'bg-gray-50 dark:bg-gray-700'
                    } ${isClickable ? 'cursor-pointer hover:bg-brand-100 dark:hover:bg-brand-900/40' : ''}`}
                  >
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                      step.completed ? 'bg-brand-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}>
                      {step.completed ? (
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <Icon className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className={`text-sm font-medium flex-1 ${
                      step.completed ? 'text-brand-700 dark:text-brand-400 line-through' : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      {step.label}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Clock className="w-3 h-3" />
                      {step.time}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Daily Real Estate News</h2>
        <div className="space-y-4">
          {loadingArticles ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              Loading latest articles...
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              No articles available yet. Check back soon!
            </div>
          ) : (
            articles.map((article) => (
              <div key={article.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0 pb-4 last:pb-0">
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 hover:opacity-80 transition-opacity"
                >
                  {article.image && (
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-24 h-24 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-1 hover:text-brand-600 dark:hover:text-brand-400">
                      {article.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {article.content}
                    </p>
                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-500">
                      <span>{new URL(article.url).hostname}</span>
                      <span>•</span>
                      <span>{getTimeAgo(article.published_date || article.created_at)}</span>
                    </div>
                  </div>
                </a>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Phone Number Modal */}
      {showPhoneModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Confirm Your Phone Number
              </h3>
              <button
                onClick={handleClosePhoneModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Enter your phone number to text & call Emma, your AI rental property assistant.
            </p>

            {/* Success Message */}
            {phoneSuccess && (
              <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-green-800 dark:text-green-300 text-sm font-medium">
                  ✓ Phone number saved successfully!
                </p>
              </div>
            )}

            {/* Error Message */}
            {phoneError && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-800 dark:text-red-300 text-sm font-medium">
                  {phoneError}
                </p>
              </div>
            )}

            <div className="mb-6">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Phone Number
              </label>
              <div className="flex items-center">
                <span className="inline-flex items-center px-4 py-2 rounded-l-lg border border-r-0 border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium">
                  +1
                </span>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="6315551234"
                  disabled={phoneSuccess}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-r-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Enter your 10-digit US phone number (without +1)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClosePhoneModal}
                disabled={phoneSuccess}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePhone}
                disabled={savingPhone || !phoneNumber.trim() || phoneSuccess}
                className="flex-1 px-4 py-2 bg-gray-900 dark:bg-brand-500 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPhone ? 'Saving...' : 'Save Phone Number'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
