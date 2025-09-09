// src/components/video/VideoPreview.tsx - Fixed download tracking
import React from 'react';
import { X, Download, Send } from 'lucide-react';
import { ControlButton } from '../ui';
import { trackEvent } from '../../utils/supabase';
import { checkSocialMediaCompatibility } from '../../utils/androidRecorderFix';

interface VideoPreviewProps {
  recordedVideo: Blob | File;
  onClose: () => void;
  onProcessAndShare: () => void;
  addLog: (message: string) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  recordedVideo,
  onClose,
  onProcessAndShare,
  addLog
}) => {
  const isAndroidRecording = (recordedVideo as any).isAndroidRecording;
  const isiOSRecording = (recordedVideo as any).isiOSRecording;
  const duration = (recordedVideo as any).recordingDuration;
  const compatibility = checkSocialMediaCompatibility(recordedVideo as File);
  const platform = isAndroidRecording ? 'Android' : isiOSRecording ? 'iPhone' : 'Desktop';

  // Get session ID for tracking
  const getSessionId = () => {
    let sessionId = localStorage.getItem('analytics_session');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('analytics_session', sessionId);
    }
    return sessionId;
  };

  const handleShare = () => {
    onProcessAndShare();
    onClose();
  };

  const handleDownload = async () => {
    try {
      // Track download immediately when button clicked
      const sessionId = getSessionId();
      await trackEvent('video_downloaded', {
        videoDuration: duration || 0,
        videoFormat: recordedVideo.type.includes('mp4') ? 'mp4' : 'webm',
        platform: platform,
        fileSize: recordedVideo.size
      }, sessionId);
      
      addLog(`📊 Download tracked: ${duration}s ${platform} video`);
      
      // Download the file
      const url = URL.createObjectURL(recordedVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ar-video-${Date.now()}${recordedVideo.type.includes('mp4') ? '.mp4' : '.webm'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLog('💾 Video download initiated');
      
      // Close preview after short delay
      setTimeout(() => {
        onClose();
      }, 500);
      
    } catch (error) {
      addLog(`❌ Download tracking failed: ${error}`);
      
      // Still download the file even if tracking fails
      const url = URL.createObjectURL(recordedVideo);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ar-video-${Date.now()}${recordedVideo.type.includes('mp4') ? '.mp4' : '.webm'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setTimeout(() => {
        onClose();
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/50 to-transparent z-20">
        <div className="flex justify-between items-center">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h2 className="text-white font-semibold">Preview</h2>
            {duration && (
              <div className="text-xs text-white/70 mt-1">
                {duration}s • {platform} Ready
              </div>
            )}
          </div>
          
          <div className="w-10" />
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 flex items-center justify-center">
        <video
          src={URL.createObjectURL(recordedVideo)}
          controls
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="w-full h-full object-cover"
        />
      </div>

      {/* Bottom Controls - Two buttons centered */}
      <div className="absolute bottom-0 inset-x-0 p-6 bg-gradient-to-t from-black/50 to-transparent z-20">
        <div className="flex items-center justify-center space-x-6">
          <ControlButton 
            icon={Send} 
            onClick={handleShare} 
            label="Share"
            size="lg"
          />
          
          <ControlButton 
            icon={Download} 
            onClick={handleDownload} 
            label="Download"
            size="lg"
          />
        </div>
      </div>
    </div>
  );
};