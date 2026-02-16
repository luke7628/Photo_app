
import React, { useState, useMemo } from 'react';
import { Project, MicrosoftUser, Printer } from '../types';
import { getProjectThumbnail, getProjectStats } from '../services/projectUtils';
import { UserAvatar } from './UserAvatar';

interface ProjectListScreenProps {
  projects: Project[];
  printers: Printer[];
  onSelectProject: (id: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, newName: string) => void;
  onDeleteProject: (id: string) => void;
  onOpenSettings: () => void;
  user: MicrosoftUser | null;
  onLogin: () => void;
  onLogout: () => void;
}

const ProjectListScreen: React.FC<ProjectListScreenProps> = ({ 
  projects, printers, onSelectProject, onCreateProject, onRenameProject, onDeleteProject, onOpenSettings, user, onLogin, onLogout
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [siteName, setSiteName] = useState('');
  const [batch, setBatch] = useState('');
  const [auditorName, setAuditorName] = useState('');
  
  // 计算项目缩略图和统计信息
  const projectsWithMeta = useMemo(() => {
    return projects.map(project => ({
      ...project,
      thumbnail: getProjectThumbnail(project, printers),
      stats: getProjectStats(project, printers)
    }));
  }, [projects, printers]);

  return (
    <div className="screen-container">
      {/* Top Header with safe-area padding */}
      <header className="screen-header px-2 sm:px-6 bg-white border-b border-gray-200 shrink-0 flex items-center justify-between py-3 sm:py-5">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0 pr-2">
          <div className="flex-shrink-0 w-9 h-9 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl sm:rounded-2xl bg-blue-50 border border-blue-100">
            <span className="material-symbols-outlined text-lg sm:text-2xl text-blue-500">folder_open</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900 truncate">Project Hub</h1>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-3 flex-shrink-0 relative">
          {user ? (
            <UserAvatar user={user} onLogout={onLogout} variant="desktop" />
          ) : (
            <button 
              onClick={onLogin}
              className="h-8 sm:h-10 px-1.5 sm:px-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-0.5 sm:gap-1.5 text-[10px] sm:text-xs font-semibold transition-colors active:scale-95 flex-shrink-0"
            >
               <span className="material-symbols-outlined text-sm sm:text-base flex-shrink-0">cloud</span>
               <span className="hidden xs:inline">Microsoft</span>
            </button>
          )}
          <button 
            onClick={onOpenSettings}
            className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors active:scale-90 flex-shrink-0"
            title="Settings"
          >
            <span className="material-symbols-outlined text-lg sm:text-xl">settings</span>
          </button>
        </div>
      </header>

      {/* Projects Grid */}
      <main 
        className="screen-content px-2 sm:px-6 pt-3 sm:pt-6 custom-scrollbar"
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-4">
          
          {/* Create New Project Card */}
          <button 
            onClick={() => setShowCreateModal(true)}
            className="aspect-square flex flex-col items-center justify-center gap-1 sm:gap-2 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg sm:rounded-xl hover:bg-blue-100 active:scale-95 transition-all group"
          >
            <span className="material-symbols-outlined text-2xl sm:text-4xl text-blue-400 group-hover:text-blue-500 transition-colors">add</span>
            <span className="text-[9px] sm:text-xs font-bold text-blue-600 text-center px-1">New Project</span>
          </button>

          {/* Project Cards */}
          {projectsWithMeta.map((project) => (
            <div key={project.id} className="relative group">
              <button 
                onClick={() => onSelectProject(project.id)}
                className="w-full aspect-square bg-white rounded-lg sm:rounded-xl shadow-sm border border-gray-200 hover:shadow-xl hover:border-blue-300 active:scale-95 transition-all duration-200 overflow-hidden flex flex-col text-left group cursor-pointer"
              >
                {/* Thumbnail area */}
                <div className="relative flex-1 w-full overflow-hidden">
                  {project.thumbnail ? (
                    <div className="relative w-full h-full">
                      <img 
                        src={project.thumbnail} 
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                    </div>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl sm:text-4xl text-blue-300">folder</span>
                    </div>
                  )}
                </div>
                
                {/* Info area */}
                <div className="relative px-2 sm:px-3 py-1.5 sm:py-2.5 bg-white">
                  <h3 className="text-[10px] sm:text-sm font-bold text-gray-900 truncate">{project.name}</h3>
                  <div className="flex items-center justify-between mt-0.5 sm:mt-1">
                    <p className="text-[8px] sm:text-xs font-medium text-gray-500">
                      {project.stats.printerCount} Assets
                    </p>
                    {project.stats.totalPhotos > 0 && (
                      <div className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[9px] sm:text-xs text-blue-500">photo_camera</span>
                        <span className="text-[8px] sm:text-xs font-semibold text-blue-500">{project.stats.totalPhotos}</span>
                      </div>
                    )}
                  </div>
                </div>
              </button>
              
              {/* More Menu */}
              <button 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  setActiveMenuId(activeMenuId === project.id ? null : project.id); 
                }}
                className="absolute top-1 sm:top-2 right-1 sm:right-2 w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-lg text-white backdrop-blur-sm transition-colors active:scale-90"
                style={{backgroundColor: 'rgba(120, 120, 128, 0.4)'}}
                title="More options"
              >
                <span className="material-symbols-outlined text-sm sm:text-lg">more_vert</span>
              </button>

              {activeMenuId === project.id && (
                <div className="absolute top-7 sm:top-10 right-0 w-24 sm:w-32 bg-white shadow-lg rounded-lg border border-gray-200 overflow-hidden z-20 animate-fadeIn">
                  <button 
                    onClick={() => { setDeleteConfirmId(project.id); setActiveMenuId(null); }} 
                    className="w-full px-2 sm:px-3 py-1 sm:py-2 text-[10px] sm:text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-1 sm:gap-2 transition-colors"
                  >
                    <span className="material-symbols-outlined text-xs sm:text-sm">delete</span>
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 sm:py-16 text-center">
            <span className="material-symbols-outlined text-3xl sm:text-6xl text-gray-300 mb-2 sm:mb-4">inbox</span>
            <p className="text-xs sm:text-sm font-medium text-gray-500">No projects yet</p>
            <p className="text-[10px] sm:text-xs text-gray-400 mt-1">Click "New Project" to get started</p>
          </div>
        )}
      </main>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start pt-8 p-2 sm:p-4">
           <div className="w-full max-w-sm bg-white rounded-lg sm:rounded-2xl p-4 sm:p-8 shadow-xl animate-slideUp">
              <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-1 sm:mb-2">New Project</h2>
              <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-6">Enter project details</p>
              
              <div className="space-y-2.5 sm:space-y-4 mb-3 sm:mb-6">
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1">Site Name</label>
                  <input 
                    autoFocus
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                    placeholder="e.g., Ardc/Modc/"
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 bg-gray-100 rounded-lg border border-transparent focus:border-blue-500 focus:outline-none text-sm font-medium placeholder-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (document.querySelector('input[placeholder="e.g., 2026P1"]') as HTMLInputElement)?.focus();
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1">Batch</label>
                  <input 
                    value={batch}
                    onChange={(e) => setBatch(e.target.value)}
                    placeholder="e.g., 2026P1"
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 bg-gray-100 rounded-lg border border-transparent focus:border-blue-500 focus:outline-none text-sm font-medium placeholder-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        (document.querySelector('input[placeholder="e.g., John Doe"]') as HTMLInputElement)?.focus();
                      }
                    }}
                  />
                </div>
                
                <div>
                  <label className="text-xs sm:text-sm font-semibold text-gray-700 block mb-1">Auditor Name</label>
                  <input 
                    value={auditorName}
                    onChange={(e) => setAuditorName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full h-10 sm:h-12 px-3 sm:px-4 bg-gray-100 rounded-lg border border-transparent focus:border-blue-500 focus:outline-none text-sm font-medium placeholder-gray-500"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const projectName = `${siteName}_${batch}_${auditorName}`.trim();
                        if (projectName.replaceAll('_', '')) {
                          onCreateProject(projectName);
                          setSiteName('');
                          setBatch('');
                          setAuditorName('');
                          setShowCreateModal(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="flex gap-2 sm:gap-3">
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setSiteName('');
                    setBatch('');
                    setAuditorName('');
                  }} 
                  className="flex-1 h-9 sm:h-11 rounded-lg text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-100 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { 
                    const projectName = `${siteName}_${batch}_${auditorName}`.trim();
                    if (projectName.replaceAll('_', '')) {
                      onCreateProject(projectName);
                      setSiteName('');
                      setBatch('');
                      setAuditorName('');
                      setShowCreateModal(false);
                    }
                  }} 
                  disabled={!siteName.trim() || !batch.trim() || !auditorName.trim()}
                  className="flex-[2] h-9 sm:h-11 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  Create
                </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4">
           <div className="w-full max-w-sm bg-white rounded-lg sm:rounded-2xl p-4 sm:p-8 shadow-xl animate-slideUp">
              <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-red-600 text-base sm:text-lg">warning</span>
                </div>
                <h2 className="text-base sm:text-xl font-bold text-gray-900">Delete Project</h2>
              </div>
              <p className="text-xs sm:text-sm text-gray-600 mb-2 leading-relaxed">
                <span className="font-semibold text-gray-900 block mb-1.5">Unsynchronized photos will be permanently deleted:</span>
                All photos in this project that have not been synced to the cloud will be permanently removed locally.
              </p>
              <p className="text-xs sm:text-sm text-gray-600 mb-4 sm:mb-5 leading-relaxed">
                <span className="font-semibold text-green-600 block mb-0.5">Cloud data is safe:</span>
                Deleting this project will only remove the local list and unsynchronized data. Your synced photos on the cloud will remain unaffected.
              </p>
              <div className="flex gap-2 sm:gap-3">
                <button 
                  onClick={() => setDeleteConfirmId(null)} 
                  className="flex-1 h-9 sm:h-11 rounded-lg text-gray-700 text-xs sm:text-sm font-semibold hover:bg-gray-100 transition-colors active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => { 
                    if (deleteConfirmId) {
                      onDeleteProject(deleteConfirmId);
                      setDeleteConfirmId(null);
                    }
                  }} 
                  className="flex-1 h-9 sm:h-11 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors active:scale-95"
                >
                  Delete
                </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProjectListScreen;
