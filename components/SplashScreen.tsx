import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden">
      {/* Dynamic gradient background with mesh effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl" style={{animation: 'glowPulse 4s ease-in-out infinite'}}></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-purple-400/15 to-pink-400/15 rounded-full blur-3xl" style={{animation: 'glowPulse 4s ease-in-out infinite', animationDelay: '2s'}}></div>
        </div>
      </div>

      <div className="h-16 w-full"></div>

      <div className="flex flex-col items-center justify-center flex-1 z-10 px-6">
        {/* Enhanced Logo Container with Apple-style animation */}
        <div className="relative mb-10 animate-scaleIn">
          {/* Glow effect */}
          <div className="absolute -inset-16 bg-gradient-to-r from-blue-400/30 via-indigo-400/30 to-purple-400/30 blur-3xl rounded-full" style={{animation: 'glowPulse 3s ease-in-out infinite'}}></div>
          
          {/* Logo card */}
          <div className="relative flex flex-col items-center justify-center" style={{animation: 'logoFloat 3s ease-in-out infinite'}}>
            <div className="relative flex h-36 w-36 items-center justify-center rounded-[32px] shadow-2xl overflow-hidden bg-white/90 backdrop-blur-xl border border-white/50">
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" style={{animation: 'shimmer 3s ease-in-out infinite'}}></div>
              
              {/* Camera icon with gradient */}
              <div className="relative z-10">
                <span className="material-symbols-outlined text-7xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent" style={{fontVariationSettings: '"FILL" 1, "wght" 300, "GRAD" 0, "opsz" 48'}}>
                  photo_camera
                </span>
              </div>
            </div>
            
            {/* Animated dots indicator */}
            <div className="mt-5 flex gap-1.5">
              <div className="h-1.5 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animation: 'progressFlow 1.5s ease-in-out infinite'}}></div>
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400/60"></div>
            </div>
          </div>
        </div>

        {/* Title and tagline with staggered animation */}
        <div className="text-center space-y-3 animate-fadeIn" style={{animationDelay: '200ms'}}>
          <h1 className="text-[40px] font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent leading-tight">
            Photo Suite
          </h1>
          <p className="text-base font-medium text-gray-600/90">
            Capture and manage your assets
          </p>
        </div>

        {/* Modern loading indicator */}
        <div className="mt-20 w-72 space-y-4 animate-fadeIn" style={{animationDelay: '400ms'}}>
          <div className="flex justify-between items-center px-1">
            <p className="text-sm font-semibold text-gray-700">
              Initializing
            </p>
            <div className="flex gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{animation: 'dotBounce 1.4s infinite', animationDelay: '0s'}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{animation: 'dotBounce 1.4s infinite', animationDelay: '0.2s'}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500" style={{animation: 'dotBounce 1.4s infinite', animationDelay: '0.4s'}}></div>
            </div>
          </div>
          
          {/* Enhanced progress bar */}
          <div className="w-full h-1.5 bg-gray-200/60 rounded-full overflow-hidden backdrop-blur-sm">
            <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 rounded-full relative" style={{width: '40%', animation: 'progressFlow 2s ease-in-out infinite'}}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent" style={{animation: 'shimmer 1s ease-in-out infinite'}}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom text with fade in */}
      <div className="safe-pb h-20 flex items-center justify-center text-center px-6 animate-fadeIn" style={{animationDelay: '600ms'}}>
        <p className="text-sm text-gray-500 font-medium tracking-wide">Ready to use</p>
      </div>
    </div>
  );
};

export default SplashScreen;
