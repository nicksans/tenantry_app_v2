import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Settings, Menu, PanelLeftClose, Moon, Sun, LogOut, BarChart3, MessageSquare, CreditCard, Building2, MapPin, LayoutDashboard, Sparkles, ArrowUp, User as UserIcon, AlertCircle, MessageCircle } from 'lucide-react';
import Dashboard from './Dashboard';
import MyReports from './MyReports';
import Tools from './Tools';
import MarketAnalysis from './MarketAnalysis';
import PropertyAnalysis from './PropertyAnalysis';
import TenantryAI from './TenantryAI';
import RentEstimatorResults from './RentEstimatorResults';
import ValueEstimatorResults from './ValueEstimatorResults';
import ChatWidget from './ChatWidget';
import MapView from './MapView';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AppLayoutProps {
  user: User;
}

export default function AppLayout({ user }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
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

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const toggleAiPanel = () => {
    setAiPanelOpen(!aiPanelOpen);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

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
          {/* Dashboard */}
          <button
            onClick={() => navigate('/app/dashboard')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/dashboard')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Dashboard</span>
          </button>

          {/* Market Analysis */}
          <button
            onClick={() => navigate('/app/market-analysis', { state: { resetTool: true } })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/market-analysis')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Market Analysis</span>
          </button>

          {/* Property Analysis */}
          <button
            onClick={() => navigate('/app/property-analysis', { state: { resetTool: true } })}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/property-analysis')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Property Analysis</span>
          </button>

          {/* My Reports */}
          <button
            onClick={() => navigate('/app/my-reports')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/my-reports')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">My Reports</span>
          </button>

          {/* Plans */}
          <button
            onClick={() => navigate('/app/plans')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/plans')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <CreditCard className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Plans</span>
          </button>

          {/* Settings */}
          <button
            onClick={() => navigate('/app/settings')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/settings')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Settings</span>
          </button>
        </nav>

        <div className="border-t border-gray-800 p-3 space-y-1">
          <button 
            onClick={toggleDarkMode}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 rounded-lg text-sm"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
          </button>
          <button 
            onClick={() => window.open('https://forms.gle/your-report-issue-form', '_blank')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 rounded-lg text-sm"
          >
            <AlertCircle className="w-5 h-5" />
            <span>Report Issue</span>
          </button>
          <button 
            onClick={() => window.open('https://forms.gle/your-feedback-form', '_blank')}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800 rounded-lg text-sm"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Submit Feedback</span>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <button
            onClick={() => navigate('/app/plans')}
            className="flex items-center gap-2 px-3 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors text-sm font-medium"
            aria-label="Upgrade"
          >
            <ArrowUp className="w-4 h-4" />
            <span>Upgrade</span>
          </button>
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
          <button
            onClick={toggleAiPanel}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
              aiPanelOpen 
                ? 'bg-brand-100 dark:bg-brand-900 text-brand-600 dark:text-brand-400' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
            }`}
            aria-label="Toggle Tenantry AI"
          >
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium">Tenantry AI</span>
          </button>
          <div className="h-8 w-px bg-gray-300 dark:bg-gray-600 mx-2" />
          <button
            onClick={() => navigate('/app/settings')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
            aria-label="Profile"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/app/dashboard" />} />
            <Route path="/dashboard" element={<Dashboard userId={user?.id} />} />
            <Route path="/my-reports" element={<MyReports userId={user?.id} />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/market-analysis" element={<MarketAnalysis userId={user?.id} />} />
            <Route path="/property-analysis" element={<PropertyAnalysis userId={user?.id} />} />
            <Route path="/property-analysis/results/:estimateId" element={<RentEstimatorResults userId={user?.id} />} />
            <Route path="/property-analysis/value-results/:estimateId" element={<ValueEstimatorResults userId={user?.id} />} />
            <Route path="/tools" element={<Tools userId={user?.id} />} />
            <Route path="/tools/results/:estimateId" element={<RentEstimatorResults userId={user?.id} />} />
            <Route path="/tools/value-results/:estimateId" element={<ValueEstimatorResults userId={user?.id} />} />
            <Route path="/plans" element={<PlansPlaceholder />} />
            <Route path="/settings" element={<SettingsPlaceholder />} />
          </Routes>
        </main>
      </div>

      {/* Tenantry AI Side Panel */}
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black z-[60] transition-opacity duration-300 ${
          aiPanelOpen ? 'bg-opacity-50' : 'bg-opacity-0 pointer-events-none'
        }`}
        onClick={toggleAiPanel}
      />
      
      {/* Side Panel */}
      <div className={`fixed right-0 top-0 h-full w-[500px] bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out flex flex-col border-l border-gray-200/30 dark:border-gray-700/30 ${
        aiPanelOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <TenantryAI user={user} onClose={toggleAiPanel} isPanel={true} />
      </div>

      {/* Floating Tenantry AI Button - Bottom Right */}
      <button
        onClick={toggleAiPanel}
        className="fixed bottom-6 right-6 z-50 p-4 bg-brand-500 hover:bg-brand-600 text-white rounded-full shadow-lg transition-all transform hover:scale-110 group"
        aria-label="Open Tenantry AI"
      >
        <Sparkles className="w-6 h-6" />
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 dark:bg-gray-700 text-white text-sm px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Ask Tenantry AI
        </span>
      </button>
      
      {/* Chat Widget - Not currently in use */}
      {/* <ChatWidget userId={user?.id} /> */}
    </div>
  );
}

function PlansPlaceholder() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Plans & Usage</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">View your plan details and usage information here.</p>
        </div>
      </div>
    </div>
  );
}

function SettingsPlaceholder() {
  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-8">Settings</h1>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-600 dark:text-gray-400">Settings coming soon...</p>
        </div>
      </div>
    </div>
  );
}

