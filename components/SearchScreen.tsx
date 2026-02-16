
import React, { useState } from 'react';
import { Printer } from '../types';

interface SearchScreenProps {
  printers: Printer[];
  onBack: () => void;
  onPreviewImage: (url: string) => void;
}

const SearchScreen: React.FC<SearchScreenProps> = ({ printers, onBack, onPreviewImage }) => {
  const [query, setQuery] = useState('ZT4');
  const [filter, setFilter] = useState<'ALL' | 'ZT411' | 'ZT421'>('ALL');

  const filteredResults = printers.filter(p => {
    const matchesQuery = p.serialNumber.toLowerCase().includes(query.toLowerCase()) || 
               p.site.toLowerCase().includes(query.toLowerCase()) ||
               (p.partNumber || '').toLowerCase().includes(query.toLowerCase());
    const matchesFilter = filter === 'ALL' || p.model === filter;
    return matchesQuery && matchesFilter;
  });

  return (
    <div className="screen-container">
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100">
        <div className="screen-header pb-2"></div>
        <div className="flex items-center px-5 pb-4 justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={onBack}
              className="text-primary size-10 flex items-center justify-center rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[28px] font-bold">arrow_back</span>
            </button>
            <h2 className="text-slate-900 text-2xl font-bold leading-tight tracking-tight">Search</h2>
          </div>
          <button 
            onClick={onBack} 
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="px-5 py-2">
          <div className="flex w-full items-center rounded-2xl h-14 shadow-inner bg-slate-100 px-4 gap-3 focus-within:ring-2 focus-within:ring-primary/30 transition-all border border-transparent focus-within:bg-white focus-within:border-primary/20">
            <span className="material-symbols-outlined text-sage text-[24px]">search</span>
            <input 
              className="flex-1 border-none bg-transparent focus:ring-0 text-base font-semibold p-0 placeholder:text-slate-400"
              placeholder="Search serial, part number, or site"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-600 p-1">
                <span className="material-symbols-outlined text-[20px] font-bold">cancel</span>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2 px-5 py-4 overflow-x-auto no-scrollbar">
          {['ALL', 'ZT411', 'ZT421'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`flex h-9 shrink-0 items-center justify-center rounded-full px-6 border transition-all gap-2 ${
                filter === f 
                ? 'bg-primary text-background-dark border-primary shadow-lg shadow-primary/20' 
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-sage/30'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {f === 'ALL' ? 'layers' : 'inventory_2'}
              </span>
              <span className="text-xs font-bold uppercase tracking-widest">{f}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-slate-50/80 border-t border-slate-100">
          <div className="col-span-5 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[10px] text-slate-400">id_card</span>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Serial</p>
          </div>
          <div className="col-span-3 text-center flex items-center justify-center gap-1.5">
            <span className="material-symbols-outlined text-[10px] text-slate-400">precision_manufacturing</span>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Part Number</p>
          </div>
          <div className="col-span-4 text-right flex items-center justify-end gap-1.5">
            <span className="material-symbols-outlined text-[10px] text-slate-400">factory</span>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Site</p>
          </div>
        </div>
      </div>

      <div 
        className="screen-content no-scrollbar bg-slate-50/30"
      >
        {filteredResults.length > 0 ? filteredResults.map((p) => (
          <div key={p.id} className="grid grid-cols-12 gap-2 items-center px-5 py-4 border-b border-slate-50 active:bg-primary/5 bg-white transition-colors cursor-pointer group">
            <div className="col-span-5 flex items-center gap-4">
              <div 
                className="w-12 h-12 rounded-xl bg-cover bg-center shrink-0 border border-slate-100 shadow-sm group-hover:scale-105 transition-transform"
                style={{ backgroundImage: `url('${p.imageUrl}')` }}
                onClick={() => onPreviewImage(p.imageUrl)}
              ></div>
              <div className="flex flex-col overflow-hidden">
                <p className="text-slate-900 text-[13px] font-bold truncate">
                  {p.serialNumber.slice(0, 7)}
                  <span className="text-primary font-black">
                    {p.serialNumber.slice(7)}
                  </span>
                </p>
                <span className="text-[10px] text-gray-400 font-medium">Capture ID: #{p.id.slice(-4)}</span>
              </div>
            </div>
            <div className="col-span-3 text-center">
              <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-tighter">
                {p.partNumber || p.model}
              </span>
            </div>
            <div className="col-span-4 text-right flex flex-col items-end">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px] text-sage">location_on</span>
                <p className="text-slate-700 text-[12px] font-bold truncate">{p.site}</p>
              </div>
              <span className="text-[9px] text-gray-400 font-medium">Ready for Sync</span>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-20 px-10 text-center">
            <div className="size-20 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">search_off</span>
            </div>
            <h3 className="text-slate-900 font-bold mb-1">No results found</h3>
            <p className="text-slate-500 text-sm">Try searching for a different serial number or adjust your filters.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchScreen;
