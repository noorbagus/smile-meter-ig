// src/utils/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Analytics functions
export const trackEvent = async (
  eventType: string,
  metadata?: any,
  userSession?: string
) => {
  try {
    const { data, error } = await supabase
      .from('analytics_events')
      .insert({
        event_type: eventType,
        metadata,
        user_session: userSession || generateSessionId(),
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Analytics tracking error:', error);
  }
};

export const trackPageView = async (
  pagePath: string = '/',
  userSession?: string
) => {
  try {
    const { data, error } = await supabase
      .from('page_views')
      .insert({
        page_path: pagePath,
        user_session: userSession || generateSessionId(),
        ip_address: await getClientIP(),
        user_agent: navigator.userAgent
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Page view tracking error:', error);
  }
};

// Helper functions
const generateSessionId = () => {
  let sessionId = localStorage.getItem('analytics_session');
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('analytics_session', sessionId);
  }
  return sessionId;
};

const getClientIP = async (): Promise<string> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    return '0.0.0.0';
  }
};

// Analytics data retrieval
export const getAnalyticsData = async (dateRange: string = '7d') => {
  const now = new Date();
  let since: string;
  
  switch (dateRange) {
    case '1d':
      since = new Date(now.setDate(now.getDate() - 1)).toISOString();
      break;
    case '7d':
      since = new Date(now.setDate(now.getDate() - 7)).toISOString();
      break;
    case '30d':
      since = new Date(now.setDate(now.getDate() - 30)).toISOString();
      break;
    default:
      since = new Date(now.setDate(now.getDate() - 7)).toISOString();
  }

  try {
    // Get page views
    const { data: pageViews, error: pageViewsError } = await supabase
      .from('page_views')
      .select('*')
      .gte('timestamp', since);

    if (pageViewsError) throw pageViewsError;

    // Get events
    const { data: events, error: eventsError } = await supabase
      .from('analytics_events')
      .select('*')
      .gte('timestamp', since);

    if (eventsError) throw eventsError;

    // Process data
    const eventCounts = events?.reduce((acc: any, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {}) || {};

    return {
      pageViews: pageViews?.length || 0,
      recordingStarted: eventCounts.recording_started || 0,
      recordingCompleted: eventCounts.recording_completed || 0,
      shareAttempt: eventCounts.share_attempt || 0,
      shareCompleted: eventCounts.share_completed || 0,
      videoDownloaded: eventCounts.video_downloaded || 0
    };
  } catch (error) {
    console.error('Analytics data fetch error:', error);
    return {
      pageViews: 0,
      recordingStarted: 0,
      recordingCompleted: 0,
      shareAttempt: 0,
      shareCompleted: 0,
      videoDownloaded: 0
    };
  }
};