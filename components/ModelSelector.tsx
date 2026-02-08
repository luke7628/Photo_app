import React, { useState, useRef, useEffect } from 'react';
import { getModelMemory, addCustomModel, getMergedModels } from '../services/modelMemoryService';

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
  const [models, setModels] = useState<string[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="space-y-2">
      {/* Horizontal Scroll Container */}
      <div className="relative">
        <div 
          ref={scrollRef}
          className="flex gap-2 overflow-x-auto pb-2 scroll-smooth"
          style={{ 
            scrollBehavior: 'smooth',
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 #f1f5f9'
          }}
        >
          {/* Add Button */}
          <button
            onClick={() => setIsAddingModel(true)}
            className="flex-shrink-0 h-12 w-12 bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center hover:bg-blue-100 transition-colors"
            title="Add custom model"
          >
            <span className="material-symbols-outlined text-blue-500 text-xl">add</span>
          </button>

          {/* Model Buttons */}
          {models.map((model) => (
            <button
              key={model}
              onClick={() => onChange(model)}
              className={`flex-shrink-0 px-5 h-12 rounded-lg font-black text-sm tracking-widest transition-all whitespace-nowrap ${
                value === model
                  ? 'bg-blue-500 text-white shadow-lg'
                  : 'bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300'
              }`}
            >
              {model}
            </button>
          ))}
        </div>
        
        {/* Right Fade Overlay */}
        <div 
          className="absolute top-0 right-0 h-12 w-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to left, white 0%, rgba(255,255,255,0.8) 50%, transparent 100%)'
          }}
        />
      </div>

      {/* Custom Model Input */}
      {isAddingModel && (
        <div className="space-y-2 mt-2">
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
            placeholder="E.g., ZT999"
            className="w-full h-11 px-3 bg-white border-2 border-blue-300 rounded-lg font-black text-center text-sm uppercase focus:outline-none focus:border-blue-500 placeholder:text-gray-400"
          />
          <div className="flex gap-2">
            <button
              onClick={handleAddModel}
              className="flex-1 h-11 bg-blue-500 text-white rounded-lg font-black text-sm hover:bg-blue-600 transition-colors"
            >
              Add
            </button>
            <button
              onClick={() => {
                setIsAddingModel(false);
                setCustomInput('');
              }}
              className="flex-1 h-11 bg-gray-200 text-gray-700 rounded-lg font-black text-sm hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
