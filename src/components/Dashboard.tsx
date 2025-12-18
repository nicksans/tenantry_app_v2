import { TrendingUp, MapPin, Building2, FileText, Newspaper, Clock, ArrowUpRight, BarChart3, DollarSign } from 'lucide-react';

interface DashboardProps {
  userId?: string;
}

export default function Dashboard({ userId }: DashboardProps) {
  // Placeholder data - these will be replaced with real data later
  const savedMarkets = [
    { name: 'Wilmington, NC', lastViewed: '2 days ago', trend: '+12.3%' },
    { name: 'Charlotte, NC', lastViewed: '1 week ago', trend: '+8.7%' },
    { name: 'Raleigh, NC', lastViewed: '2 weeks ago', trend: '+15.2%' },
  ];

  const savedProperties = [
    { address: '123 Main St, Wilmington, NC', value: '$425,000', rent: '$2,100/mo' },
    { address: '456 Oak Ave, Charlotte, NC', value: '$385,000', rent: '$1,950/mo' },
  ];

  const recentReports = [
    { title: 'Rental Market Analysis - Wilmington, NC', date: 'Dec 10, 2025', type: 'Market' },
    { title: 'CMA - 123 Main St', date: 'Dec 8, 2025', type: 'Property' },
    { title: 'Rental Market Finder - Southeast', date: 'Dec 5, 2025', type: 'Market' },
  ];

  const quickLinks = [
    { name: 'Market Analysis', icon: MapPin, color: 'bg-blue-500' },
    { name: 'Property Analysis', icon: Building2, color: 'bg-green-500' },
    { name: 'Tenantry AI', icon: BarChart3, color: 'bg-purple-500' },
  ];

  const newsItems = [
    { title: 'Fed Holds Interest Rates Steady for Third Month', time: '2 hours ago' },
    { title: 'Housing Inventory Up 15% Year-Over-Year', time: '5 hours ago' },
    { title: 'Rental Demand Surges in Sunbelt Markets', time: '1 day ago' },
  ];

  const stats = [
    { label: 'Total Reports', value: '12', change: '+3 this month', icon: FileText, color: 'text-blue-600 dark:text-blue-400' },
    { label: 'Saved Markets', value: '8', change: '+2 this week', icon: MapPin, color: 'text-green-600 dark:text-green-400' },
    { label: 'Saved Properties', value: '5', change: '+1 this week', icon: Building2, color: 'text-purple-600 dark:text-purple-400' },
    { label: 'Avg. Market Growth', value: '+12.1%', change: 'YoY', icon: TrendingUp, color: 'text-orange-600 dark:text-orange-400' },
  ];

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome back! Here's an overview of your activity and market insights.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={index}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-2 rounded-lg bg-gray-50 dark:bg-gray-700 ${stat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">{stat.label}</div>
                <div className="text-xs text-gray-500 dark:text-gray-500">{stat.change}</div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Saved Markets */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Saved Markets
              </h2>
              <button className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {savedMarkets.map((market, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100">{market.name}</span>
                    <span className="text-xs font-medium text-green-600 dark:text-green-400">{market.trend}</span>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Last viewed {market.lastViewed}</div>
                </div>
              ))}
              <button className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                + Add Market
              </button>
            </div>
          </div>

          {/* Saved Properties */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Saved Properties
              </h2>
              <button className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {savedProperties.map((property, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-2 text-sm">
                    {property.address}
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Value: {property.value}</span>
                    <span className="text-gray-600 dark:text-gray-400">Rent: {property.rent}</span>
                  </div>
                </div>
              ))}
              <button className="w-full py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
                + Add Property
              </button>
            </div>
          </div>

          {/* Recent Reports */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Recent Reports
              </h2>
              <button className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                View All
              </button>
            </div>
            <div className="space-y-3">
              {recentReports.map((report, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="font-medium text-gray-900 dark:text-gray-100 text-sm flex-1">
                      {report.title}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-500 dark:text-gray-400">{report.date}</span>
                    <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded">
                      {report.type}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily News */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Newspaper className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Daily News
              </h2>
              <button className="text-sm text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300">
                More News
              </button>
            </div>
            <div className="space-y-3">
              {newsItems.map((news, index) => (
                <div
                  key={index}
                  className="pb-3 border-b border-gray-200 dark:border-gray-700 last:border-0 last:pb-0 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded transition-colors cursor-pointer"
                >
                  <div className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">
                    {news.title}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                    <Clock className="w-3 h-3" />
                    {news.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                Quick Tools
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {quickLinks.map((link, index) => {
                const Icon = link.icon;
                return (
                  <button
                    key={index}
                    className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors group"
                  >
                    <div className={`p-2 ${link.color} text-white rounded-lg`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="flex-1 text-left font-medium text-gray-900 dark:text-gray-100">
                      {link.name}
                    </span>
                    <ArrowUpRight className="w-5 h-5 text-gray-400 group-hover:text-brand-600 dark:group-hover:text-brand-400 transition-colors" />
                  </button>
                );
              })}
            </div>

            {/* Chart Placeholder */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Market Performance
              </h3>
              <div className="bg-gradient-to-r from-brand-500/10 to-purple-500/10 dark:from-brand-500/20 dark:to-purple-500/20 rounded-lg p-4 h-32 flex items-end justify-around gap-2">
                {/* Simple bar chart placeholder */}
                {[65, 45, 80, 55, 90, 70, 85].map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 bg-gradient-to-t from-brand-500 to-purple-500 rounded-t opacity-70 hover:opacity-100 transition-opacity"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}



