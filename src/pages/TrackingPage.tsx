import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAnalyticsData } from '../utils/supabase'; // Changed from Vercel API

interface AnalyticsData {
  pageViews: number;
  recordingStarted: number;
  recordingCompleted: number;
  shareAttempt: number;
  videoDownloaded: number;
  loading: boolean;
  error: string | null;
}

const TrackingPage: React.FC = () => {
  const [data, setData] = useState<AnalyticsData>({
    pageViews: 0,
    recordingStarted: 0,
    recordingCompleted: 0,
    shareAttempt: 0,
    videoDownloaded: 0,
    loading: true,
    error: null
  });
  
  const [dateRange, setDateRange] = useState<string>('7d');
  const [password, setPassword] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  
  // Check authentication
  useEffect(() => {
    const savedAuth = localStorage.getItem('tracking_authenticated');
    if (savedAuth === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Fetch Supabase analytics data
  useEffect(() => {
    if (isAuthenticated) {
      setData(prev => ({ ...prev, loading: true, error: null }));
      
      const fetchData = async () => {
        try {
          const analyticsData = await getAnalyticsData(dateRange);
          
          setData({
            pageViews: analyticsData.pageViews,
            recordingStarted: analyticsData.recordingStarted,
            recordingCompleted: analyticsData.recordingCompleted,
            shareAttempt: analyticsData.shareAttempt,
            videoDownloaded: analyticsData.videoDownloaded,
            loading: false,
            error: null
          });
          
        } catch (error) {
          console.error('Analytics fetch error:', error);
          setData(prev => ({
            ...prev,
            loading: false,
            error: error instanceof Error ? error.message : 'Failed to fetch analytics data'
          }));
        }
      };
      
      fetchData();
    }
  }, [isAuthenticated, dateRange]);
  
  const handleAuthenticate = () => {
    if (password === '@SmileMeter2025') {
      setIsAuthenticated(true);
      localStorage.setItem('tracking_authenticated', 'true');
    } else {
      setData(prev => ({ ...prev, error: 'Invalid password' }));
    }
  };
  
  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('tracking_authenticated');
  };
  
  if (!isAuthenticated) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-purple-900 to-black flex items-center justify-center p-4">
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 w-full max-w-md text-white">
          <h1 className="text-2xl font-bold mb-6 text-center">
            Web AR Netramaya
            <div className="text-base font-normal text-white/60">Analytics Dashboard</div>
          </h1>
          
          {data.error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3 mb-4 text-sm">
              {data.error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-white/70 mb-1">Password</label>
              <input 
                type="password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                placeholder="Enter dashboard password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
              />
            </div>
            
            <button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
              onClick={handleAuthenticate}
            >
              Access Dashboard
            </button>
            
            <div className="text-center">
              <Link to="/" className="text-sm text-white/60 hover:text-white">
                &larr; Back to Camera
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Calculate conversion rates
  const recordingRate = data.pageViews ? Math.round((data.recordingStarted / data.pageViews) * 100) : 0;
  const completionRate = data.recordingStarted ? Math.round((data.recordingCompleted / data.recordingStarted) * 100) : 0;
  const shareRate = data.recordingCompleted ? Math.round((data.shareAttempt / data.recordingCompleted) * 100) : 0;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 to-black text-white p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">
            Web AR Netramaya
            <span className="block text-sm font-normal text-white/60">Analytics Dashboard</span>
          </h1>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2">
              <select
                className="bg-white/10 border border-white/20 rounded-lg px-3 py-1.5 text-sm"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
              >
                <option value="1d">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <Link to="/" className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors">
                Go to App
              </Link>
              <button 
                onClick={handleLogout}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
        
        {data.loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-white/60">Loading analytics data...</p>
            </div>
          </div>
        ) : (
          <>
            {data.error && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 mb-6 text-sm">
                <strong>Error:</strong> {data.error}
              </div>
            )}
            
            {/* Main stats cards - Changed from 6 to 5 columns */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
              <StatCard
                title="Visitors"
                value={data.pageViews}
                icon="👁️"
                className="bg-gradient-to-br from-blue-600/30 to-blue-800/30"
              />
              <StatCard
                title="Recording Started"
                value={data.recordingStarted}
                icon="🎬"
                className="bg-gradient-to-br from-green-600/30 to-green-800/30"
              />
              <StatCard
                title="Recording Completed"
                value={data.recordingCompleted}
                icon="✅"
                className="bg-gradient-to-br from-yellow-600/30 to-yellow-800/30"
              />
              <StatCard
                title="Share"
                value={data.shareAttempt}
                icon="📤"
                className="bg-gradient-to-br from-purple-600/30 to-purple-800/30"
              />
              <StatCard
                title="Downloads"
                value={data.videoDownloaded}
                icon="💾"
                className="bg-gradient-to-br from-indigo-600/30 to-indigo-800/30"
              />
            </div>
            
            {/* Conversion rates - Removed Share Success Rate */}
            <h2 className="text-xl font-semibold mb-4">Conversion Rates</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <ConversionCard
                title="Visit → Record"
                percentage={recordingRate}
                description={`${data.recordingStarted} of ${data.pageViews} visitors started recording`}
              />
              <ConversionCard
                title="Start → Complete"
                percentage={completionRate}
                description={`${data.recordingCompleted} of ${data.recordingStarted} recordings completed`}
              />
              <ConversionCard
                title="Complete → Share"
                percentage={shareRate}
                description={`${data.shareAttempt} of ${data.recordingCompleted} recordings shared`}
              />
            </div>
            
            {/* Funnel visualization - Updated labels */}
            <h2 className="text-xl font-semibold mb-4">User Journey Funnel</h2>
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6 mb-8">
              <div className="flex flex-col md:flex-row items-stretch gap-2 md:h-32">
                <FunnelStep
                  label="Visitors"
                  value={data.pageViews}
                  percentage={100}
                  color="from-blue-500 to-blue-600"
                />
                <FunnelStep
                  label="Started Recording"
                  value={data.recordingStarted}
                  percentage={(data.recordingStarted / Math.max(data.pageViews, 1)) * 100}
                  color="from-green-500 to-green-600"
                />
                <FunnelStep
                  label="Completed Recording"
                  value={data.recordingCompleted}
                  percentage={(data.recordingCompleted / Math.max(data.pageViews, 1)) * 100}
                  color="from-yellow-500 to-yellow-600"
                />
                <FunnelStep
                  label="Share"
                  value={data.shareAttempt}
                  percentage={(data.shareAttempt / Math.max(data.pageViews, 1)) * 100}
                  color="from-purple-500 to-purple-600"
                />
                <FunnelStep
                  label="Downloaded"
                  value={data.videoDownloaded}
                  percentage={(data.videoDownloaded / Math.max(data.pageViews, 1)) * 100}
                  color="from-indigo-500 to-indigo-600"
                />
              </div>
            </div>
            
            <div className="text-center text-white/50 text-sm mt-16">
              <p>Data range: {dateRange === '1d' ? 'Last 24 hours' : dateRange === '7d' ? 'Last 7 days' : 'Last 30 days'}</p>
              <p className="mt-1">Last updated: {new Date().toLocaleString()}</p>
              <p className="mt-1">Powered by Supabase Analytics</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// Helper components
const StatCard: React.FC<{
  title: string;
  value: number;
  icon: string;
  className?: string;
}> = ({ title, value, icon, className }) => (
  <div className={`rounded-xl p-4 backdrop-blur-md border border-white/10 ${className}`}>
    <div className="text-2xl mb-2">{icon}</div>
    <h3 className="text-sm text-white/70 mb-1">{title}</h3>
    <div className="text-2xl md:text-3xl font-bold">{value.toLocaleString()}</div>
  </div>
);

const ConversionCard: React.FC<{
  title: string;
  percentage: number;
  description: string;
}> = ({ title, percentage, description }) => (
  <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4">
    <h3 className="text-sm text-white/70 mb-1">{title}</h3>
    <div className="text-2xl font-bold mb-1">{percentage}%</div>
    <div className="w-full bg-white/10 rounded-full h-2 mb-2">
      <div 
        className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full"
        style={{ width: `${Math.min(percentage, 100)}%` }}
      ></div>
    </div>
    <p className="text-xs text-white/60">{description}</p>
  </div>
);

const FunnelStep: React.FC<{
  label: string;
  value: number;
  percentage: number;
  color: string;
}> = ({ label, value, percentage, color }) => (
  <div className="flex-1 flex flex-col">
    <div className="text-xs text-white/70 mb-1">{label}</div>
    <div className="text-sm font-medium mb-1">{value.toLocaleString()}</div>
    <div className="flex-1 bg-white/5 rounded-lg overflow-hidden">
      <div
        className={`h-full bg-gradient-to-b ${color} transition-all duration-500`}
        style={{ height: `${Math.max(percentage, 5)}%` }}
      ></div>
    </div>
    <div className="text-xs text-white/60 mt-1">{Math.round(percentage)}%</div>
  </div>
);

export default TrackingPage;