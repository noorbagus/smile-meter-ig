// src/App.tsx - Complete with lens restart on recording
import React, { useState, useEffect, useCallback } from 'react';
import { 
  CameraProvider, 
  RecordingProvider, 
  useCameraContext, 
  useRecordingContext 
} from './context';
import {
  LoadingScreen,
  ErrorScreen,
  CameraFeed,
  CameraControls,
  RecordingControls,
  VideoPreview,
  SettingsPanel,
  RenderingModal
} from './components';
import { checkAndRedirect, isInstagramBrowser, retryRedirect } from './utils/instagramBrowserDetector';

const CameraApp: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [appReady, setAppReady] = useState<boolean>(false);

  const {
    cameraState,
    currentFacingMode,
    permissionState,
    errorInfo,
    initializeCameraKit,
    switchCamera,
    reloadLens,
    requestCameraStream,
    requestPermission,
    checkCameraPermission,
    cameraFeedRef,
    getCanvas,
    getStream,
    addLog,
    debugLogs,
    exportLogs,
    isReady,
    restoreCameraFeed
  } = useCameraContext();

  const {
    recordingState,
    recordingTime,
    recordedVideo,
    toggleRecording,
    formatTime,
    downloadVideo,
    showPreview,
    setShowPreview,
    processAndShareVideo,
    processingProgress,
    processingMessage,
    processingError,
    showRenderingModal,
    setShowRenderingModal
  } = useRecordingContext();

  // Instagram redirect check
  useEffect(() => {
    const shouldRedirect = checkAndRedirect();
    
    if (shouldRedirect) {
      addLog('📱 Instagram redirect in progress...');
      setTimeout(() => {
        addLog('⏰ Redirect timeout - continuing with app');
        setAppReady(true);
      }, 3000);
    } else {
      addLog('✅ Browser check complete - initializing app');
      setAppReady(true);
    }
  }, [addLog]);

  // Auto-recovery on app focus/visibility
  useEffect(() => {
    const handleFocus = () => {
      if (cameraState === 'ready') {
        addLog('🔄 App focused - checking camera feed...');
        setTimeout(() => restoreCameraFeed(), 200);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && cameraState === 'ready') {
        addLog('👁️ App visible - restoring camera...');
        setTimeout(() => restoreCameraFeed(), 100);
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [cameraState, addLog, restoreCameraFeed]);

  const initializeApp = useCallback(async () => {
    if (cameraState === 'ready') {
      addLog('📱 Camera already ready');
      return;
    }

    try {
      addLog('🎬 Starting app initialization...');
      
      const hasPermission = await checkCameraPermission();
      if (!hasPermission) return;

      const stream = await requestCameraStream(currentFacingMode, true);
      if (!stream) return;

      const audioTracks = stream.getAudioTracks();
      const videoTracks = stream.getVideoTracks();
      addLog(`📊 Camera stream: ${videoTracks.length} video, ${audioTracks.length} audio tracks`);
      
      if (audioTracks.length === 0) {
        addLog('🔇 WARNING: No audio tracks in camera stream - recordings will be silent!');
      }

      const success = await initializeCameraKit(stream, cameraFeedRef);
      if (success) {
        addLog('🎉 App initialization complete');
      }
    } catch (error) {
      addLog(`❌ Initialization failed: ${error}`);
    }
  }, [cameraState, addLog, checkCameraPermission, requestCameraStream, currentFacingMode, initializeCameraKit, cameraFeedRef]);

  const handleSwitchCamera = useCallback(async () => {
    if (!isReady) return;
    
    try {
      addLog('🔄 Switching camera...');
      const newStream = await switchCamera();
      if (newStream) {
        const audioTracks = newStream.getAudioTracks();
        addLog(`✅ Camera switched - Audio tracks: ${audioTracks.length}`);
      }
    } catch (error) {
      addLog(`❌ Camera switch failed: ${error}`);
    }
  }, [isReady, switchCamera, addLog]);

  // MODIFIED: Toggle recording with lens restart
  const handleToggleRecording = useCallback(async () => {
    const canvas = getCanvas();
    const stream = getStream();
    
    if (!canvas) {
      addLog('❌ Canvas not available');
      return;
    }

    if (recordingState === 'recording') {
      // Stop recording normally
      if (recordingTime >= 3) {
        toggleRecording(canvas, stream || undefined);
      } else {
        addLog(`⚠️ Recording too short (${recordingTime}s) - minimum 3 seconds required`);
      }
    } else if (recordingState === 'idle') {
      // RESTART LENS BEFORE RECORDING
      try {
        addLog('🎭 Restarting lens for fresh recording...');
        
        const reloadSuccess = await reloadLens();
        if (reloadSuccess) {
          addLog('✅ Lens restarted successfully');
          // Wait for lens to fully initialize
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          addLog('⚠️ Lens restart failed, continuing with current state');
        }
        
      } catch (error) {
        addLog(`❌ Lens restart error: ${error}, continuing anyway`);
      }

      // Verify stream before recording
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        const videoTracks = stream.getVideoTracks();
        
        addLog(`📊 Pre-recording check: ${videoTracks.length} video, ${audioTracks.length} audio tracks`);
        
        if (audioTracks.length === 0) {
          addLog('🔇 WARNING: No audio tracks - recording will be silent!');
        } else {
          audioTracks.forEach((track, index) => {
            addLog(`🎤 Audio track ${index}: ${track.label || 'Unknown'}, state: ${track.readyState}, enabled: ${track.enabled}`);
            
            if (track.readyState !== 'live' || !track.enabled) {
              addLog(`⚠️ Audio track ${index} not ready for recording`);
            }
          });
        }
      } else {
        addLog('❌ No camera stream available for recording');
        return;
      }

      // Start recording with fresh lens
      toggleRecording(canvas, stream || undefined);
    }
  }, [getCanvas, getStream, toggleRecording, addLog, recordingState, recordingTime, reloadLens]);

  const handleReloadEffect = useCallback(async () => {
    if (!isReady) {
      addLog('❌ Cannot reload - camera not ready');
      return;
    }
    
    try {
      addLog('🔄 Manual lens reload...');
      const success = await reloadLens();
      
      if (success) {
        addLog('✅ Lens reloaded successfully');
      } else {
        addLog('❌ Failed to reload lens');
      }
    } catch (error) {
      addLog(`❌ Reload error: ${error}`);
    }
  }, [isReady, reloadLens, addLog]);

  const handleClosePreview = useCallback(() => {
    setShowPreview(false);
    addLog('📱 Preview closed');
    setTimeout(() => restoreCameraFeed(), 100);
  }, [setShowPreview, addLog, restoreCameraFeed]);

  const handleProcessAndShare = useCallback(() => {
    addLog('🎬 Starting video processing...');
    processAndShareVideo();
  }, [processAndShareVideo, addLog]);

  const handleDownload = useCallback(() => {
    downloadVideo();
    setTimeout(() => {
      setShowPreview(false);
      restoreCameraFeed();
    }, 500);
  }, [downloadVideo, setShowPreview, restoreCameraFeed]);

  // Initialize app when ready
  useEffect(() => {
    if (appReady) {
      addLog('🚀 App initialization starting...');
      initializeApp();
    }
  }, [appReady, initializeApp, addLog]);

  const handleRequestPermission = useCallback(async () => {
    try {
      addLog('🔒 Requesting camera + microphone permission...');
      const stream = await requestPermission();
      if (stream) {
        const audioTracks = stream.getAudioTracks();
        addLog(`✅ Permission granted with ${audioTracks.length} audio tracks`);
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        initializeApp();
      }
    } catch (error) {
      addLog(`❌ Permission failed: ${error}`);
    }
  }, [requestPermission, initializeApp, addLog]);

  const handleRetry = useCallback(() => {
    addLog('🔄 Retrying app initialization...');
    initializeApp();
  }, [initializeApp, addLog]);

  const handleRetryRedirect = useCallback(() => {
    addLog('📱 Manual Instagram redirect retry...');
    retryRedirect();
  }, [addLog]);

  // Show loading while checking/redirecting
  if (!appReady) {
    const isInInstagram = isInstagramBrowser();
    
    if (isInInstagram) {
      return (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
          <div className="text-center text-white p-6">
            <div className="text-6xl mb-6">🚀</div>
            <h2 className="text-2xl font-bold mb-4">Opening in Safari..</h2>
            <p className="text-white/70 mb-6">For the best AR experience</p>
            <button
              onClick={handleRetryRedirect}
              className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg text-white font-medium"
            >
              Try Again
            </button>
            <p className="text-xs text-white/50 mt-4">
              If redirect fails, manually copy URL to Safari
            </p>
          </div>
        </div>
      );
    }
    
    return (
      <LoadingScreen 
        message="Web AR Netramaya"
        subMessage="Checking browser compatibility..."
      />
    );
  }

  // Video preview
  if (showPreview && recordedVideo) {
    return (
      <>
        <VideoPreview
          recordedVideo={recordedVideo}
          onClose={handleClosePreview}
          onDownload={handleDownload}
          onProcessAndShare={handleProcessAndShare}
        />
        
        <RenderingModal
          isOpen={showRenderingModal}
          progress={processingProgress}
          message={processingMessage}
          isComplete={processingProgress === 100 && !processingError}
          hasError={!!processingError}
          onCancel={() => {
            setShowRenderingModal(false);
            addLog('❌ Processing cancelled');
            setTimeout(() => restoreCameraFeed(), 100);
          }}
        />
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <CameraFeed
        cameraFeedRef={cameraFeedRef}
        cameraState={cameraState}
        recordingState={recordingState}
        isFlipped={isFlipped}
      />

      <CameraControls
        onSettings={() => setShowSettings(true)}
        onFlip={() => setIsFlipped(!isFlipped)}
      />

      <RecordingControls
        recordingState={recordingState}
        recordingTime={recordingTime}
        onToggleRecording={handleToggleRecording}
        onGallery={handleReloadEffect}
        onSwitchCamera={handleSwitchCamera}
        formatTime={formatTime}
        disabled={!isReady}
      />

      {cameraState === 'initializing' && (
        <LoadingScreen 
          message="Initializing Web AR Netramaya..."
          subMessage="Setting up camera and AR engine..."
        />
      )}

      {(cameraState === 'error' || cameraState === 'permission_denied' || cameraState === 'https_required') && errorInfo && (
        <ErrorScreen
          errorInfo={errorInfo}
          permissionState={permissionState}
          onRequestPermission={handleRequestPermission}
          onRetry={handleRetry}
          debugInfo={{
            protocol: location.protocol,
            hostname: location.hostname,
            userAgent: navigator.userAgent
          }}
        />
      )}

      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        debugLogs={debugLogs}
        onExportLogs={exportLogs}
      />

      <RenderingModal
        isOpen={showRenderingModal && !showPreview}
        progress={processingProgress}
        message={processingMessage}
        isComplete={processingProgress === 100 && !processingError}
        hasError={!!processingError}
        onCancel={() => {
          setShowRenderingModal(false);
          addLog('❌ Processing cancelled');
          setTimeout(() => restoreCameraFeed(), 100);
        }}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <CameraProvider>
      <RecordingProvider addLog={() => {}}>
        <AppWithContext />
      </RecordingProvider>
    </CameraProvider>
  );
};

const AppWithContext: React.FC = () => {
  const { addLog, restoreCameraFeed } = useCameraContext();
  
  return (
    <RecordingProvider addLog={addLog} restoreCameraFeed={restoreCameraFeed}>
      <CameraApp />
    </RecordingProvider>
  );
};

export default App;