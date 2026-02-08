import React, { useState, useRef, useEffect } from 'react';
import { getModelMemory, addCustomModel, deleteModelMemory, getMergedModels } from '../services/modelMemoryService';

interface ModelSelectorProps {
  standardModels?: string[];
  value: string;
  onChange: (model: string) => void;
  onError?: (message: string) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  standardModels = ['ZT411', 'ZT421'],
  value,
  onChange,
  onError
}) => {
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const [deleteMode, setDeleteMode] = useState(false);
  const [longPressModel, setLongPressModel] = useState<string | null>(null);
  const [models, setModels] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<number>();

  useEffect(() => {
    const merged = getMergedModels(standardModels);
    setModels(merged);
  }, [standardModels]);

  const handleAddModel = () => {
    const modelName = customInput.trim().toUpperCase();
    if (!modelName) {
      onError?.('Please enter a model name');
      return;
    }
    if (modelName.length > 20) {
      onError?.('Model name too long (max 20 chars)');
      return;
    }
    
    addCustomModel(modelName);
    const merged = getMergedModels(standardModels);
    setModels(merged);
    onChange(modelName);
    setCustomInput('');
    setIsAddingModel(false);
  };

  const handleDeleteModel = (model: string) => {
    deleteModelMemory(model);
    const merged = getMergedModels(standardModels);
    setModels(merged);
    if (value === model) {
      onChange(standardModels[0]);
    }
    setLongPressModel(null);
  };

  const handleMouseDown = (model: string) => {
    longPressTimer.current = window.setTimeout(() => {
      setLongPressModel(model);
      setDeleteMode(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  return (
    <div className="space-y-3">
      {/* Add Model Button + Selector */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth" ref={scrollRef}>
        {/* Add Button */}
        <button
          onClick={() => setIsAddingModel(true)}
          className="flex-shrink-0 size-16 bg-blue-50 border-2 border-dashed border-blue-300 rounded-xl flex items-center justify-center hover:bg-blue-100 transition-colors"
          title="Add custom model"
        >
          <span className="material-symbols-outlined text-blue-500 text-2xl">add</span>
        </button>

        {/* Model Buttons */}
        {models.map((model) => (
          <button
            key={model}
            onMouseDown={() => handleMouseDown(model)}
            onMouseUp={handleMouseUp}
            onTouchStart={() => handleMouseDown(model)}
            onTouchEnd={handleMouseUp}
            onClick={() => {
              if (!deleteMode) {
                onChange(model);
              }
            }}
            className={`flex-shrink-0 px-5 h-16 rounded-xl font-black text-sm tracking-widest transition-all relative whitespace-nowrap ${
              value === model
                ? 'bg-blue-500 text-white shadow-lg'
                : 'bg-white border border-gray-200 text-gray-700 hover:border-blue-300'
            } ${deleteMode && longPressModel === model ? 'ring-2 ring-red-500' : ''}`}
          >
            {model}
            {deleteMode && longPressModel === model && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteModel(model);
                  setDeleteMode(false);
                }}
                className="absolute -top-2 -right-2 size-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
              >
                <span className="material-symbols-outlined text-xs">close</span>
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Custom Model Input */}
      {isAddingModel && (
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddModel();
              if (e.key === 'Escape') {
                setIsAddingModel(false);
                setCustomInput('');
              }
            }}
            placeholder="e.g., ZT411"
            className="flex-1 h-12 px-3 bg-white border-2 border-blue-300 rounded-lg font-black uppercase text-center focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
          />
          <button
            onClick={handleAddModel}
            className="px-4 h-12 bg-blue-500 text-white rounded-lg font-black text-sm hover:bg-blue-600 transition-colors"
          >
            Add
          </button>
          <button
            onClick={() => {
              setIsAddingModel(false);
              setCustomInput('');
            }}
            className="px-4 h-12 bg-gray-200 text-gray-700 rounded-lg font-black text-sm hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Delete Mode Hint */}
      {deleteMode && (
        <p className="text-xs text-red-500 font-bold text-center">
          Long-press a model to delete it from memory
        </p>
      )}
    </div>
  );
};

export default ModelSelector;
