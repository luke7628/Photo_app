import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between overflow-hidden">
      {/* Dynamic gradient background with mesh effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-white to-sky-50/50">
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-gradient-to-br from-blue-300/15 to-sky-300/15 rounded-full blur-3xl" style={{animation: 'glowPulse 4s ease-in-out infinite'}}></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gradient-to-tr from-cyan-300/12 to-blue-300/12 rounded-full blur-3xl" style={{animation: 'glowPulse 4s ease-in-out infinite', animationDelay: '2s'}}></div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center flex-1 z-10 px-6 py-8">
        {/* Enhanced Logo Container with Apple-style animation */}
        <div className="relative mb-10 animate-scaleIn">
          {/* Glow effect */}
          <div className="absolute -inset-16 bg-gradient-to-r from-blue-300/25 via-sky-300/25 to-cyan-300/25 blur-3xl rounded-full" style={{animation: 'glowPulse 3s ease-in-out infinite'}}></div>
          
          {/* Logo card */}
          <div className="relative flex flex-col items-center justify-center" style={{animation: 'logoFloat 3s ease-in-out infinite'}}>
            <div className="relative flex h-36 w-36 items-center justify-center rounded-[32px] shadow-2xl overflow-hidden bg-white/95 backdrop-blur-xl border border-blue-100/50">
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/40 to-transparent" style={{animation: 'shimmer 3s ease-in-out infinite'}}></div>
              
              {/* Camera icon with gradient */}
              <div className="relative z-10">
                <span className="material-symbols-outlined text-7xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 bg-clip-text text-transparent" style={{fontVariationSettings: '"FILL" 1, "wght" 300, "GRAD" 0, "opsz" 48'}}>
                  photo_camera
                </span>
              </div>
            </div>
            
            {/* Animated dots indicator */}
            <div className="mt-5 flex gap-1.5">
              <div className="h-1.5 w-8 rounded-full bg-gradient-to-r from-blue-400 to-sky-400 overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animation: 'progressFlow 1.5s ease-in-out infinite'}}></div>
              </div>
              <div className="h-1.5 w-1.5 rounded-full bg-blue-300/70"></div>
            </div>
          </div>
        </div>

        {/* Title and tagline with staggered animation */}
        <div className="text-center space-y-3 animate-fadeIn" style={{animationDelay: '200ms'}}>
          <h1 className="text-[40px] font-bold tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent leading-tight">
            Photo APP
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
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400" style={{animation: 'dotBounce 1.4s infinite', animationDelay: '0s'}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-sky-400" style={{animation: 'dotBounce 1.4s infinite', animationDelay: '0.2s'}}></div>
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" style={{animation: 'dotBounce 1.4s infinite', animationDelay: '0.4s'}}></div>
            </div>
          </div>
          
          {/* Enhanced progress bar */}
          <div className="w-full h-2 bg-gradient-to-r from-blue-100/80 via-sky-100/80 to-blue-100/80 rounded-full overflow-hidden backdrop-blur-sm shadow-inner">
            <div className="h-full bg-gradient-to-r from-blue-400 via-sky-400 to-blue-400 rounded-full relative shadow-lg" style={{width: '45%', animation: 'progressFlow 2.5s ease-in-out infinite'}}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent" style={{animation: 'shimmer 1.2s ease-in-out infinite'}}></div>
              {/* Glow effect */}
              <div className="absolute inset-0 blur-sm bg-gradient-to-r from-blue-300 via-sky-300 to-blue-300 opacity-50"></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default SplashScreen;
