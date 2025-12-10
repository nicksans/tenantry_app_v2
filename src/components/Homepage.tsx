import { ArrowRight, CheckCircle, TrendingUp, FileText, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import CircuitAnimation from './CircuitAnimation';

export default function Homepage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annually'>('annually');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Navigation */}
      <nav className="bg-gray-900 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <img src="/logo copy.png" alt="Tenantry Logo" className="w-8 h-8" />
              <h1 className="text-2xl font-bold text-white">Tenantry</h1>
            </div>
            <div className="flex items-center gap-4">
              <Link
                to="/auth/sign-in"
                className="text-gray-300 hover:text-white font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/auth/sign-up"
                className="bg-brand-500 hover:bg-brand-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="flex flex-col lg:flex-row items-center gap-12">
          {/* Left: headline, text, bullets, CTAs */}
          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-5xl font-bold text-white mb-6">
              Understand Any Rental Market in Seconds.
            </h1>
            <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto lg:mx-0">
            Analyze local real estate markets with AI-powered tools trained on the latest available data from our  <span className="font-bold text-brand-400">140+
            million</span> property dataset.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start mb-8">
              <div className="flex items-center gap-2 text-gray-200">
                <CheckCircle className="w-5 h-5 text-brand-400" />
                <span>CMAs</span>
              </div>
              <div className="flex items-center gap-2 text-gray-200">
                <CheckCircle className="w-5 h-5 text-brand-400" />
                <span>Rental Market Analysis</span>
              </div>
              <div className="flex items-center gap-2 text-gray-200">
                <CheckCircle className="w-5 h-5 text-brand-400" />
                <span>Market Finder</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start items-center">
              <Link
                to="/auth/sign-up"
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => window.open('#', '_blank')}
                className="inline-flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-lg font-medium text-lg transition-colors border border-gray-600"
              >
                <FileText className="w-5 h-5" />
                View Sample Reports
              </button>
            </div>
          </div>

          {/* Right: logo animation */}
          <div className="flex-1 flex justify-center">
            <CircuitAnimation />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-12">
          Why Choose Tenantry?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <div className="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-brand-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Deep Market Insights
            </h3>
            <p className="text-gray-300">
              Get comprehensive insights into any rental market (state, city, or zip) with accurate, up-to-date data
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <div className="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-brand-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Professional CMAs
            </h3>
            <p className="text-gray-300">
              Generate professional CMAs for any address, without needing a realtor or the MLS
            </p>
          </div>
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-6">
            <div className="w-12 h-12 bg-brand-900/30 rounded-lg flex items-center justify-center mb-4">
              <Search className="w-6 h-6 text-brand-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">
              Discover Emerging Markets
            </h3>
            <p className="text-gray-300">
              Find emerging rental markets that meet your criteria for cashflow and appreciation.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-gray-800 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white text-center mb-12">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Select Report Type
              </h3>
              <p className="text-gray-300">
                Choose the type of market report you need - CMA, Rental Market Analysis, or Market Finder
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Enter Location Details
              </h3>
              <p className="text-gray-300">
                Provide the state, city, zip code, or address you want to analyze
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                Get Your Report
              </h3>
              <p className="text-gray-300">
                Receive a comprehensive, downloadable PDF with deep market insights in ~2 minutes
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-white text-center mb-8">
          Simple, Transparent Pricing
        </h2>

        {/* Billing Toggle */}
        <div className="flex justify-center items-center gap-4 mb-12">
          <button
            onClick={() => setBillingPeriod('monthly')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors ${
              billingPeriod === 'monthly'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingPeriod('annually')}
            className={`px-6 py-3 rounded-lg font-semibold transition-colors relative ${
              billingPeriod === 'annually'
                ? 'bg-brand-500 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Annually
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">
              Best Value
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Free Plan */}
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8 flex flex-col">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">Free</h3>
              <div className="text-5xl font-bold text-white mb-2">$0</div>
            </div>
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-200">Access to Tenantry AI</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div className="text-gray-200">
                  <div>Access to Quick Tools</div>
                  <ul className="ml-4 mt-2 space-y-1 text-sm text-gray-400">
                    <li>• Rent Estimator</li>
                    <li>• Property Value Estimator</li>
                    <li>• Rehab Estimator</li>
                    <li>• Market Finder</li>
                    <li>• Rental Property Calculator</li>
                    <li>• Fix & Flip Calculator</li>
                    <li>• Mortgage Calculator</li>
                  </ul>
                </div>
              </li>
            </ul>
            <Link
              to="/auth/sign-up"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-center px-6 py-3 rounded-lg font-medium transition-colors border border-gray-600"
            >
              Try for Free
            </Link>
          </div>

          {/* Basic Plan */}
          <div className="bg-gray-800 rounded-lg shadow-sm border-2 border-brand-500 p-8 relative flex flex-col">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
              <span className="bg-brand-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                MOST POPULAR
              </span>
            </div>
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">Basic</h3>
              {billingPeriod === 'annually' ? (
                <>
                  <div className="text-gray-400 line-through text-2xl mb-1">$19/mo</div>
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-white">$15</span>
                    <span className="text-xl text-gray-300">/mo</span>
                  </div>
                  <div className="text-sm text-brand-400 font-semibold mt-1">Billed annually ($180/year)</div>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-white">$19</span>
                    <span className="text-xl text-gray-300">/mo</span>
                  </div>
                </>
              )}
            </div>
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-200">
                  {billingPeriod === 'annually' ? '480' : '40'} Tenantry AI credits
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div className="text-gray-200">
                  <div>{billingPeriod === 'annually' ? '60' : '5'} Pro Tool credits</div>
                  <ul className="ml-4 mt-2 space-y-1 text-sm text-gray-400">
                    <li>• Rental Market Analysis (RMA)</li>
                    <li>• Comparative Market Analysis (CMA)</li>
                    <li>• Rental Market Finder</li>
                  </ul>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div className="text-gray-200">
                  <div>{billingPeriod === 'annually' ? '480' : '40'} Quick Tool credits</div>
                  <ul className="ml-4 mt-2 space-y-1 text-sm text-gray-400">
                    <li>• Rent Estimator</li>
                    <li>• Property Value Estimator</li>
                    <li>• Rehab Estimator</li>
                    <li>• Market Finder</li>
                    <li>• Rental Property Calculator</li>
                    <li>• Fix & Flip Calculator</li>
                    <li>• Mortgage Calculator</li>
                  </ul>
                </div>
              </li>
            </ul>
            <Link
              to="/auth/sign-up"
              className="block w-full bg-brand-500 hover:bg-brand-600 text-white text-center px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Buy Now
            </Link>
          </div>

          {/* Advanced Plan */}
          <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-8 flex flex-col">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-white mb-4">Advanced</h3>
              {billingPeriod === 'annually' ? (
                <>
                  <div className="text-gray-400 line-through text-2xl mb-1">$39/mo</div>
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-white">$32</span>
                    <span className="text-xl text-gray-300">/mo</span>
                  </div>
                  <div className="text-sm text-brand-400 font-semibold mt-1">Billed annually ($384/year)</div>
                </>
              ) : (
                <>
                  <div className="mb-2">
                    <span className="text-5xl font-bold text-white">$39</span>
                    <span className="text-xl text-gray-300">/mo</span>
                  </div>
                </>
              )}
            </div>
            <ul className="space-y-3 mb-8 flex-grow">
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <span className="text-gray-200">
                  {billingPeriod === 'annually' ? '960' : '80'} Tenantry AI credits
                </span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div className="text-gray-200">
                  <div>{billingPeriod === 'annually' ? '120' : '10'} Pro Tool credits</div>
                  <ul className="ml-4 mt-2 space-y-1 text-sm text-gray-400">
                    <li>• Rental Market Analysis (RMA)</li>
                    <li>• Comparative Market Analysis (CMA)</li>
                    <li>• Rental Market Finder</li>
                  </ul>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-brand-400 flex-shrink-0 mt-0.5" />
                <div className="text-gray-200">
                  <div>{billingPeriod === 'annually' ? '960' : '80'} Quick Tool credits</div>
                  <ul className="ml-4 mt-2 space-y-1 text-sm text-gray-400">
                    <li>• Rent Estimator</li>
                    <li>• Property Value Estimator</li>
                    <li>• Rehab Estimator</li>
                    <li>• Market Finder</li>
                    <li>• Rental Property Calculator</li>
                    <li>• Fix & Flip Calculator</li>
                    <li>• Mortgage Calculator</li>
                  </ul>
                </div>
              </li>
            </ul>
            <Link
              to="/auth/sign-up"
              className="block w-full bg-gray-700 hover:bg-gray-600 text-white text-center px-6 py-3 rounded-lg font-medium transition-colors border border-gray-600"
            >
              Buy Now
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-white py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-3 mb-4 md:mb-0">
              <img src="/logo copy.png" alt="Tenantry Logo" className="w-8 h-8" />
              <span className="text-xl font-bold">Tenantry</span>
            </div>
            <div className="text-gray-400">
              © {new Date().getFullYear()} Tenantry. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

