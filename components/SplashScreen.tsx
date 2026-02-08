
import React from 'react';

const SplashScreen: React.FC = () => {
  return (
    <div className="relative flex h-full w-full flex-col items-center justify-between bg-white overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 bg-gradient-soft opacity-60"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[80%] aspect-square bg-primary/10 rounded-full blur-[100px] animate-spin-slow"></div>
      <div className="absolute bottom-[-5%] left-[-5%] w-[60%] aspect-square bg-sage/10 rounded-full blur-[80px] animate-pulse-soft"></div>

      <div className="h-24 w-full"></div>

      <div className="flex flex-col items-center justify-center flex-1 z-10">
        {/* Animated Logo Container */}
        <div className="relative mb-12 animate-in fade-in zoom-in slide-in-from-bottom-8 duration-1000">
          <div className="absolute -inset-10 bg-primary/15 blur-3xl rounded-full animate-pulse"></div>
          <div className="absolute -inset-4 border border-primary/20 rounded-3xl animate-[ping_4s_linear_infinite]"></div>
          
          <div className="glass-effect relative flex h-36 w-36 items-center justify-center rounded-[2.5rem] shadow-2xl overflow-hidden animate-float">
            <div className="flex flex-col items-center">
              <span className="material-symbols-outlined text-7xl text-sage/80 font-extralight">
                print
              </span>
              <div className="mt-2 flex gap-1.5">
                <div className="h-1.5 w-6 rounded-full bg-primary animate-[pulse_2s_infinite]"></div>
                <div className="h-1.5 w-1.5 rounded-full bg-primary/40"></div>
              </div>
            </div>
          </div>
        </div>

        {/* Text Entry Staggered */}
        <div className="text-center px-6 space-y-3">
          <h1 className="text-[#101b0e] text-4xl font-black tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-4 duration-700 stagger-1">
            Dematic
            <span className="block text-primary text-2xl font-bold -mt-1">Printer Photo</span>
          </h1>
          <p className="text-sage text-[11px] font-black tracking-[0.3em] uppercase opacity-70 animate-in fade-in slide-in-from-bottom-4 duration-700 stagger-2">
            Field Technician Suite
          </p>
        </div>

        {/* System Load Indicator */}
        <div className="mt-16 w-56 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700 stagger-3">
          <div className="flex justify-between items-center px-1">
            <p className="text-[#101b0e]/40 text-[9px] font-black tracking-[0.2em] uppercase">
              Initializing Core
            </p>
            <div className="flex gap-1">
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
              <div className="h-1 w-1 rounded-full bg-primary animate-bounce"></div>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-slate-100 p-0.5 overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-sage to-primary rounded-full transition-all duration-[2500ms] w-full ease-out"></div>
          </div>
        </div>
      </div>

      {/* Footer Branded Staggered */}
      <div className="pb-16 flex flex-col items-center gap-6 z-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 stagger-4">
        <div className="flex items-center gap-4">
          <div className="h-px w-8 bg-gradient-to-r from-transparent to-sage/20"></div>
          <p className="text-sage text-[10px] font-black tracking-[0.4em] uppercase">By Dematic</p>
          <div className="h-px w-8 bg-gradient-to-l from-transparent to-sage/20"></div>
        </div>
        <div className="flex gap-2">
          <div className="w-2.5 h-2.5 rounded-sm bg-sage/30 rotate-45"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-primary rotate-45 animate-pulse"></div>
          <div className="w-2.5 h-2.5 rounded-sm bg-sage/30 rotate-45"></div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
