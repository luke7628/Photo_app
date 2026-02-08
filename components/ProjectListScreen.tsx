
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
    <div className="flex flex-col h-full bg-bg-main p-4 sm:p-6 lg:p-8 overflow-hidden">
      {/* 顶部应用 shell - 标准尺寸 */}
      <div className="flex items-center justify-between mb-8 px-4 shrink-0">
        <div className="flex flex-col">
          <div className="mb-2">
            <div className="size-12 flex items-center justify-center rounded-2xl bg-white shadow-sm border border-gray-100">
              <span className="material-symbols-outlined text-[#8e99ac] text-3xl font-bold">apps</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-[#1a2332] tracking-tight leading-none">Project Hub</h1>
          <p className="text-xs font-black text-[#a6c9a0] uppercase tracking-[0.3em] mt-2">Asset Suite</p>
        </div>

        <div className="flex items-center gap-4 self-start mt-2">
          {user ? (
            <button onClick={onLogout} className="flex items-center gap-2.5 bg-white px-4 py-2 rounded-full border border-gray-100 shadow-sm active:scale-95 transition-transform">
              <img src={user.photoUrl} className="size-6 rounded-full" alt="User" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-tight">{user.name.split(' ')[0]}</span>
            </button>
          ) : (
            <button 
              onClick={onLogin}
              className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-sm text-[#1a2332] active:scale-95 transition-transform"
            >
               <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="size-4" alt="G" />
               <span className="text-xs font-bold uppercase tracking-wide">Sign In</span>
            </button>
          )}
          <button 
            onClick={onOpenSettings}
            className="size-12 flex items-center justify-center rounded-2xl bg-white border border-gray-100 shadow-sm text-[#8e99ac] active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined text-2xl">settings</span>
          </button>
        </div>
      </div>

      {/* 项目展示区 - 内含 Nano 超高密度网格 */}
      <div className="flex-1 bg-white rounded-[3rem] border border-white shadow-sm overflow-hidden flex flex-col relative mx-2">
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 gap-2 pb-10">
            
            {/* 新建项目卡片：加号图标现在更大、更从容（淡定哥风格：稳稳填满） */}
            <button 
              onClick={() => setShowCreateModal(true)}
              className="group relative flex flex-col items-center justify-center aspect-square bg-[#f0f9ef] border border-dashed border-[#d9ecd6] rounded-lg hover:bg-[#eef8eb] transition-all active:scale-95 overflow-hidden"
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="material-symbols-outlined text-[48px] text-primary/30 group-hover:text-primary/50 group-hover:scale-110 transition-all font-light">add</span>
              </div>
              <span className="relative z-10 mt-auto mb-1 text-[7px] font-black text-[#a6c9a0] uppercase tracking-tighter opacity-80">Initialize</span>
            </button>

            {/* 高密度项目列表卡片 */}
            {projects.map((project) => (
              <div key={project.id} className="relative group">
                <button 
                  onClick={() => onSelectProject(project.id)}
                  className="w-full aspect-square bg-white rounded-lg shadow-[0_1px_3px_rgba(0,0,0,0.04)] border border-gray-100 flex flex-col p-2 text-left hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95"
                >
                  <div className="size-6 rounded bg-[#f8f9f8] flex items-center justify-center mb-auto shrink-0">
                    <span className="material-symbols-outlined text-[14px] text-[#a6c9a0]">folder</span>
                  </div>
                  <div className="overflow-hidden mt-1">
                    <h3 className="text-[8px] font-black text-[#1a2332] uppercase tracking-tighter truncate leading-tight pr-3">{project.name}</h3>
                    <p className="text-[6px] font-bold text-gray-300 uppercase tracking-tighter truncate opacity-80">
                      {project.printerIds.length} Assets
                    </p>
                  </div>
                </button>
                
                <button 
                  onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === project.id ? null : project.id); }}
                  className="absolute top-1 right-1 size-4 flex items-center justify-center rounded-full hover:bg-gray-100 text-[#8e99ac] transition-colors"
                >
                  <span className="material-symbols-outlined font-black text-[12px]">more_horiz</span>
                </button>

                {activeMenuId === project.id && (
                  <div className="absolute top-6 right-1 w-24 bg-white shadow-xl rounded-lg border border-gray-100 overflow-hidden z-20 animate-in fade-in slide-in-from-top-1">
                    <button onClick={() => { onDeleteProject(project.id); setActiveMenuId(null); }} className="w-full px-2 py-2 text-left text-[8px] font-black uppercase text-red-500 hover:bg-red-50 flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">delete</span> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className="mt-6 flex justify-center opacity-20 shrink-0">
        <p className="text-xs font-black tracking-[0.5em] text-gray-400 uppercase">Dematic Suite</p>
      </footer>

      {/* 标准尺寸弹窗 */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-6 animate-in fade-in">
           <div className="w-full max-w-[320px] bg-white rounded-[2.5rem] p-10 shadow-2xl animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-black text-[#1a2332] uppercase tracking-tight mb-2">New Site</h3>
              <p className="text-[10px] font-bold text-gray-400 mb-8 uppercase tracking-[0.1em]">Project Identification</p>
              <input 
                autoFocus
                placeholder="Ex: Warehouse A"
                className="w-full h-14 px-5 bg-[#f8f9f8] rounded-2xl border-none focus:ring-2 focus:ring-primary/40 text-sm font-bold uppercase tracking-widest mb-8"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const val = (e.target as HTMLInputElement).value;
                    if (val) onCreateProject(val);
                    setShowCreateModal(false);
                  }
                }}
              />
              <div className="flex gap-3">
                <button onClick={() => setShowCreateModal(false)} className="flex-1 h-14 rounded-2xl text-gray-400 font-black uppercase text-xs tracking-widest">Cancel</button>
                <button 
                  onClick={() => { 
                    const val = (document.querySelector('input') as any).value;
                    if (val) onCreateProject(val);
                    setShowCreateModal(false); 
                  }} 
                  className="flex-[2] h-14 bg-primary text-background-dark rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-primary/20"
                >Initialize</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ProjectListScreen;
