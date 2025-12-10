import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, Settings, Menu, PanelLeftClose, Moon, Sun, LogOut, BarChart3, MessageSquare, CreditCard } from 'lucide-react';
import MyReports from './MyReports';
import Tools from './Tools';
import TenantryAI from './TenantryAI';
import RentEstimatorResults from './RentEstimatorResults';
import ValueEstimatorResults from './ValueEstimatorResults';
import ChatWidget from './ChatWidget';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface AppLayoutProps {
  user: User;
}

export default function AppLayout({ user }: AppLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
          {/* Tenantry AI */}
          <button
            onClick={() => navigate('/app/tenantry-ai')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/tenantry-ai')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Tenantry AI</span>
          </button>

          {/* Analysis Tools */}
          <button
            onClick={() => navigate('/app/tools')}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-colors ${
              isActive('/app/tools')
                ? 'bg-brand-500 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span className="text-sm font-medium whitespace-nowrap">Analysis Tools</span>
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

        <div className="border-t border-gray-800 p-3">
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
            onClick={toggleDarkMode}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-900 dark:text-gray-100"
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Navigate to="/app/tenantry-ai" />} />
            <Route path="/my-reports" element={<MyReports userId={user?.id} />} />
            <Route path="/tenantry-ai" element={<TenantryAI user={user} />} />
            <Route path="/tools" element={<Tools userId={user?.id} />} />
            <Route path="/tools/results/:estimateId" element={<RentEstimatorResults userId={user?.id} />} />
            <Route path="/tools/value-results/:estimateId" element={<ValueEstimatorResults userId={user?.id} />} />
            <Route path="/plans" element={<PlansPlaceholder />} />
            <Route path="/settings" element={<SettingsPlaceholder />} />
          </Routes>
        </main>
      </div>

      {/* Chat Widget */}
      <ChatWidget userId={user?.id} />
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

