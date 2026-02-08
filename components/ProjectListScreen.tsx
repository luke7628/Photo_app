
import React, { useState } from 'react';
import { Project, GoogleUser } from '../types';

interface ProjectListScreenProps {
  projects: Project[];
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenSettings: () => void;
  user: GoogleUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

const ProjectListScreen: React.FC<ProjectListScreenProps> = ({ 
  projects, onSelectProject, onCreateProject, onRenameProject, onDeleteProject, onOpenSettings, user, onLogin, onLogout
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
      {/* Top Header */}
      <header className="safe-pt flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 bg-white border-b border-gray-200 shrink-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
              <span className="material-symbols-outlined text-lg sm:text-2xl text-blue-500">folder_open</span>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">Project Hub</h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-gray-500">Asset Suite</p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 ml-4 flex-shrink-0">
          {user ? (
            <button 
              onClick={onLogout} 
              title={user.name}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 px-3 sm:px-4 py-2 rounded-lg transition-colors active:scale-95"
            >
              <img src={user.photoUrl} className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover" alt="User" />
              <span className="hidden sm:inline text-xs font-semibold text-gray-700 truncate max-w-[80px]">{user.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-1.5 sm:gap-2 bg-blue-500 hover:bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg text-xs font-semibold transition-colors active:scale-95"
            >
               <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="G" />
               <span className="hidden sm:inline">Sign In</span>
            </button>
          )}
          <button 
            onClick={onOpenSettings}
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors active:scale-90"
            title="Settings"
          >
            <span className="material-symbols-outlined text-xl sm:text-2xl">settings</span>
          </button>
        </div>
      </header>

      {/* Projects Grid */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
          
          {/* Create New Project Card */}
          <button 
            onClick={() => setShowCreateModal(true)}
            className="aspect-square flex flex-col items-center justify-center gap-2 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl hover:bg-blue-100 active:scale-95 transition-all group"
          >
            <span className="material-symbols-outlined text-3xl sm:text-4xl text-blue-400 group-hover:text-blue-500 transition-colors">add</span>
            <span className="text-xs font-bold text-blue-600 text-center">New Project</span>
          </button>

          {/* Project Cards */}
          {projects.map((project) => (
            <div key={project.id} className="relative group">
              <button 
                onClick={() => onSelectProject(project.id)}
                className="w-full aspect-square bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 active:scale-95 transition-all p-3 sm:p-4 flex flex-col text-left"
              >
                <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 mb-auto rounded-lg bg-blue-50 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm text-blue-500">folder</span>
                </div>
                <div className="min-w-0 mt-2">
                  <h3 className="text-xs sm:text-sm font-bold text-gray-900 truncate break-words line-clamp-2">{project.name}</h3>
                  <p className="text-[9px] sm:text-xs font-medium text-gray-500 mt-1">
                    {project.printerIds.length} Assets
                  </p>
                </div>
              </button>
              
              {/* More Menu */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setActiveMenuId(activeMenuId === project.id ? null : project.id); 
                }}
                className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="More options"
              >
                <span className="material-symbols-outlined text-lg">more_vert</span>
              </button>

              {activeMenuId === project.id && (
                <div className="absolute top-10 right-0 w-32 bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden z-20 animate-fadeIn">
                  <button 
                    onClick={() => { onDeleteProject(project.id); setActiveMenuId(null); }} 
                    className="w-full px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="material-symbols-outlined text-5xl sm:text-6xl text-gray-300 mb-4">inbox</span>
            <p className="text-sm font-medium text-gray-500">No projects yet</p>
            <p className="text-xs text-gray-400 mt-1">Click "New Project" to get started</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="px-4 py-3 sm:py-4 text-center border-t border-gray-200 bg-white shrink-0 safe-pb">
        <p className="text-xs font-medium text-gray-400">Photo Suite © 2026</p>
      </footer>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 safe-pb">
           <div className="w-full max-w-sm bg-white rounded-2xl p-6 sm:p-8 shadow-xl animate-slideUp">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">New Project</h2>
              <p className="text-sm text-gray-500 mb-6">Create a new project to organize your assets</p>
              <input 
                autoFocus
                placeholder="Project name..."
                className="w-full h-12 px-4 bg-gray-100 rounded-lg border border-transparent focus:border-blue-500 focus:outline-none text-sm font-medium mb-6 placeholder-gray-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      onCreateProject(val);
                      setShowCreateModal(false);
                    }
                  }
                }}
              />
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowCreateModal(false)} 
                  className="flex-1 h-11 rounded-lg text-gray-700 font-semibold hover:bg-gray-100 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { 
                    const val = (document.querySelector('input') as any)?.value?.trim();
                    if (val) {
                      onCreateProject(val);
                      setShowCreateModal(false);
                    }
                  }} 
                  className="flex-[2] h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-semibold transition-colors active:scale-95"
                >
                  Create
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProjectListScreen;
