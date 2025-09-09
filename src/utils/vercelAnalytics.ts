// src/utils/vercelAnalytics.ts
import { inject } from '@vercel/analytics';

// Initialize Vercel Analytics
inject();

// Interface for analytics data
export interface AnalyticsData {
 pageViews: number;
 recordingStarted: number;
 recordingCompleted: number;
 shareAttempt: number;
 shareCompleted: number;
}

// Fetch analytics data from Vercel API
export async function fetchAnalyticsData(
 dateRange: string = '7d'
): Promise<AnalyticsData> {
 // Get token and project ID from environment variables
 const token = import.meta.env.VITE_VERCEL_ANALYTICS_TOKEN;
 const projectId = import.meta.env.VITE_VERCEL_PROJECT_ID;
 
 if (!token || !projectId) {
   throw new Error('Analytics configuration missing. Check environment variables.');
 }
 
 // Calculate date range
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
   case 'all':
     since = new Date(2020, 0, 1).toISOString();
     break;
   default:
     since = new Date(now.setDate(now.getDate() - 7)).toISOString();
 }
 
 try {
   // Fetch pageviews
   const pageViewsResponse = await fetch(
     `https://api.vercel.com/v1/projects/${projectId}/analytics/pageviews?since=${since}`,
     {
       headers: {
         'Authorization': `Bearer ${token}`
       }
     }
   );
   
   if (!pageViewsResponse.ok) {
     throw new Error(`Pageviews API error: ${pageViewsResponse.status}`);
   }
   
   const pageViewsData = await pageViewsResponse.json();
   
   // Fetch custom events
   const eventsResponse = await fetch(
     `https://api.vercel.com/v1/projects/${projectId}/analytics/events?since=${since}`,
     {
       headers: {
         'Authorization': `Bearer ${token}`
       }
     }
   );
   
   if (!eventsResponse.ok) {
     throw new Error(`Events API error: ${eventsResponse.status}`);
   }
   
   const eventsData = await eventsResponse.json();
   
   // Process the data
   const pageViews = pageViewsData.pageviews || 0;
   
   // Get event counts - handle cases where events might not exist yet
   const events = eventsData.events || [];
   const recordingStarted = events.find((e: any) => e.name === 'recording_started')?.count || 0;
   const recordingCompleted = events.find((e: any) => e.name === 'recording_completed')?.count || 0;
   const shareAttempt = events.find((e: any) => e.name === 'share_attempt')?.count || 0;
   const shareCompleted = events.find((e: any) => e.name === 'share_completed')?.count || 0;
   
   return {
     pageViews,
     recordingStarted,
     recordingCompleted,
     shareAttempt,
     shareCompleted
   };
 } catch (error) {
   console.error('Vercel Analytics API error:', error);
   
   // In development, return mock data
   if (import.meta.env.DEV) {
     return getMockAnalyticsData();
   }
   
   throw error;
 }
}

// Generate mock analytics data for development
export function getMockAnalyticsData(): AnalyticsData {
 return {
   pageViews: Math.floor(Math.random() * 1000) + 500,
   recordingStarted: Math.floor(Math.random() * 400) + 200,
   recordingCompleted: Math.floor(Math.random() * 300) + 100,
   shareAttempt: Math.floor(Math.random() * 150) + 50,
   shareCompleted: Math.floor(Math.random() * 100) + 20
 };
}