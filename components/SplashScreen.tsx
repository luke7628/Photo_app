import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between bg-white overflow-hidden">
      {/* Animated gradient background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 -right-40 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-green-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{animationDelay: '2s'}}></div>
      </div>

      <div className="h-16 w-full"></div>

      <div className="flex flex-col items-center justify-center flex-1 z-10 px-6">
        {/* Animated Logo Container */}
        <div className="relative mb-12 animate-slideUp">
          <div className="absolute -inset-12 bg-blue-500/10 blur-2xl rounded-full"></div>
          
          <div className="relative flex h-32 w-32 items-center justify-center rounded-3xl shadow-xl overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100">
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-6xl text-blue-500">
                photo_camera
              </span>
              <div className="mt-3 flex gap-1">
                <div className="h-1 w-6 rounded-full bg-blue-500 animate-pulse"></div>
                <div className="h-1 w-1 rounded-full bg-blue-300"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Title and tagline */}
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 animate-slideUp" style={{animationDelay: '100ms'}}>
            Photo Suite
          </h1>
          <p className="text-sm font-medium text-gray-600 animate-slideUp" style={{animationDelay: '200ms'}}>
            Capture and manage your assets
          </p>
        </div>

        {/* Loading indicator */}
        <div className="mt-16 w-64 space-y-4 animate-slideUp" style={{animationDelay: '300ms'}}>
          <div className="flex justify-between items-center px-1">
            <p className="text-xs font-medium text-gray-600">
              Initializing
            </p>
            <div className="flex gap-1">
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse"></div>
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <div className="w-1 h-1 rounded-full bg-blue-500 animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
          </div>
          <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full w-1/3 bg-blue-500 rounded-full animate-shimmer"></div>
          </div>
        </div>
      </div>

      <div className="safe-pb h-20 flex items-center justify-center text-center px-6">
        <p className="text-xs text-gray-500 font-medium">Ready to use</p>
      </div>
    </div>
  );
};

export default SplashScreen;
