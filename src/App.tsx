import { useState, useEffect } from 'react';
import { Home, Building2, FileText, MessageSquare, Settings, AlertCircle, MessageCircleMore, Menu, X, Moon, Sun, LogOut, TrendingUp, Wrench, MessageCircle, Users, WrenchIcon, Sparkles } from 'lucide-react';
import Dashboard from './components/Dashboard';
import Properties from './components/Properties';
import PropertyDetails from './components/PropertyDetails';
import DocumentVault from './components/DocumentVault';
import AskEmma from './components/AskEmma';
import ChatWidget from './components/ChatWidget';
import Login from './components/Login';
import MarketReports from './components/MarketReports';
import Tools from './components/Tools';
import Tenants from './components/Tenants';
import Maintenance from './components/Maintenance';
import Messages from './components/Messages';
import { supabase } from './lib/supabase';
import type { User } from '@supabase/supabase-js';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [shouldOpenPropertyModal, setShouldOpenPropertyModal] = useState(false);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode.toString());
  }, [darkMode]);

  // Check authentication state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔐 Initial session check:', { session: session?.user?.email || 'No session', error });
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔐 Auth state changed:', event, { user: session?.user?.email || 'No user' });
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleAddPropertyClick = () => {
    setActiveSection('properties');
    setShouldOpenPropertyModal(true);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'ask-emma', label: 'Ask Emma', icon: MessageSquare },
    { id: 'properties', label: 'Properties', icon: Building2 },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'maintenance', label: 'Maintenance', icon: WrenchIcon },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'vault', label: 'Document Vault', icon: FileText },
    { id: 'market-reports', label: 'Market Reports', icon: TrendingUp, pro: true },
    { id: 'tools', label: 'Tools', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handlePropertyClick = (propertyId: string) => {
    setSelectedPropertyId(propertyId);
  };

  const handleBackToProperties = () => {
    setSelectedPropertyId(null);
  };

  const renderContent = () => {
    // If viewing a specific property, show PropertyDetails
    if (activeSection === 'properties' && selectedPropertyId) {
      return (
        <PropertyDetails 
          propertyId={selectedPropertyId}
          onBack={handleBackToProperties}
        />
      );
    }

    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onAddPropertyClick={handleAddPropertyClick} />;
      case 'properties':
        return <Properties 
          shouldOpenModal={shouldOpenPropertyModal}
          onModalOpenChange={setShouldOpenPropertyModal}
          onPropertyClick={handlePropertyClick}
          userId={user?.id}
        />;
      case 'tenants':
        return <Tenants />;
      case 'maintenance':
        return <Maintenance />;
      case 'vault':
        return <DocumentVault />;
      case 'ask-emma':
        return <AskEmma />;
      case 'market-reports':
        return <MarketReports userId={user?.id} onNavigateToEmma={() => setActiveSection('ask-emma')} />;
      case 'messages':
        return <Messages userId={user?.id} />;
      case 'tools':
        return <Tools />;
      case 'settings':
        return (
          <div className="max-w-4xl">
            <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <p className="text-gray-600 dark:text-gray-400">Settings coming soon...</p>
            </div>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <img src="/logo copy.png" alt="Tenantry Logo" className="w-16 h-16 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Sidebar */}
      <aside className={`${
        sidebarOpen ? 'w-64' : 'w-0'
      } flex-shrink-0 bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 overflow-hidden flex flex-col`}>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <img src="/logo copy.png" alt="Tenantry Logo" className="w-8 h-8" />
            <h1 className="text-2xl font-bold text-white">Tenantry</h1>
          </div>
        </div>

        <nav className="flex-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveSection(item.id);
                  setSelectedPropertyId(null); // Reset property selection when changing sections
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
                  activeSection === item.id
                    ? 'bg-brand-500 text-white'
                    : 'text-gray-300 hover:bg-gray-800'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                {item.pro && (
                  <span className="ml-auto text-xs bg-[#FFC857] text-gray-900 px-2 py-0.5 rounded whitespace-nowrap">PRO</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-gray-800 p-3">
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 rounded-lg mb-1 text-sm">
            <AlertCircle className="w-5 h-5" />
            <span>Report Error</span>
          </button>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 rounded-lg mb-1 text-sm">
            <MessageCircleMore className="w-5 h-5" />
            <span>Share Feedback</span>
          </button>
          <button 
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 rounded-lg text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder="Ask Emma anything..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>
          </div>
          <button
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 p-6 overflow-auto">
          {renderContent()}
        </main>
      </div>

      {/* Chat Widget */}
      <ChatWidget userId={user?.id} />
    </div>
  );
}

export default App;
