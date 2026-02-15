import React, { useState } from 'react';

interface UserAvatarProps {
  user: {
    name: string;
    email: string;
  };
  onLogout: () => void;
  variant?: 'desktop' | 'mobile';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ 
  user, 
  onLogout,
  variant = 'desktop' 
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    setShowUserMenu(false);
    onLogout();
  };

  if (variant === 'desktop') {
    return (
      <div className="relative">
        <button 
          onClick={() => setShowUserMenu(!showUserMenu)}
          title={user.name}
          className="flex items-center gap-0.5 sm:gap-2 bg-gray-100 hover:bg-gray-200 px-1.5 sm:px-4 py-1 sm:py-2 rounded-lg transition-colors active:scale-95 h-8 sm:h-10"
        >
          <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="hidden sm:inline text-xs font-semibold text-gray-700 truncate max-w-[80px]">
            {user.name.split(' ')[0]}
          </span>
          <span className="material-symbols-outlined text-sm text-gray-600">expand_more</span>
        </button>

        {showUserMenu && (
          <div className="absolute top-full right-0 mt-1 w-48 bg-white shadow-xl rounded-lg border border-gray-200 overflow-hidden z-50 animate-fadeIn">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
              <p className="text-xs font-semibold text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500 truncate mt-0.5">{user.email}</p>
            </div>
            <button
              onClick={handleLogout}
              className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-red-50 text-red-600 transition-colors"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span className="text-xs font-medium">Sign Out</span>
            </button>
          </div>
        )}
      </div>
    );
  }

  // Mobile variant - compact circular button
  return (
    <div className="relative">
      <button 
        onClick={() => setShowUserMenu(!showUserMenu)}
        className="size-10 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-bold active:scale-90 transition-transform"
        title={user.name}
      >
        {user.name.charAt(0).toUpperCase()}
      </button>

      {showUserMenu && (
        <div className="absolute top-12 right-0 w-48 bg-white shadow-2xl rounded-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="text-[11px] font-black text-gray-900 truncate leading-none mb-1">
              {user.name}
            </p>
            <p className="text-[9px] font-bold text-gray-400 truncate leading-none">
              {user.email}
            </p>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full px-4 py-3 text-left flex items-center gap-2 hover:bg-red-50 text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            <span className="text-xs font-bold uppercase tracking-widest">Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
};
