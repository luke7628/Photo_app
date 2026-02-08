/**
 * 模型记忆服务
 * 管理用户使用过的打印机型号，支持自定义型号添加
 * 按使用频率排序，支持删除
 */

export interface ModelMemory {
  model: string;
  count: number; // 使用次数
  lastUsed: number; // 最后使用时间戳
}

const STORAGE_KEY = 'printer_model_memory';

/**
 * 获取所有记忆的型号（按频率排序）
 */
export const getModelMemory = (): ModelMemory[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed = JSON.parse(data);
    // 按使用次数降序排列，次数相同按最后使用时间降序
    return parsed.sort((a: ModelMemory, b: ModelMemory) => {
      if (b.count !== a.count) return b.count - a.count;
      return b.lastUsed - a.lastUsed;
    });
  } catch {
    return [];
  }
};

/**
 * 记录模型使用
 */
export const recordModelUsage = (model: string): void => {
  try {
    const memory = getModelMemory();
    const existing = memory.find(m => m.model === model);
    
    if (existing) {
      existing.count += 1;
      existing.lastUsed = Date.now();
    } else {
      memory.push({
        model,
        count: 1,
        lastUsed: Date.now()
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch (error) {
    console.error('Failed to record model usage:', error);
  }
};

/**
 * 添加自定义型号
 */
export const addCustomModel = (model: string): void => {
  try {
    const memory = getModelMemory();
    if (!memory.find(m => m.model === model)) {
      memory.push({
        model,
        count: 0,
        lastUsed: Date.now()
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    }
  } catch (error) {
    console.error('Failed to add custom model:', error);
  }
};

/**
 * 删除记忆的型号
 */
export const deleteModelMemory = (model: string): void => {
  try {
    const memory = getModelMemory().filter(m => m.model !== model);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
  } catch (error) {
    console.error('Failed to delete model memory:', error);
  }
};

/**
 * 清空所有记忆
 */
export const clearAllModelMemory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear model memory:', error);
  }
};

/**
 * 获取合并后的型号列表（标准 + 记忆）
 */
export const getMergedModels = (standardModels: string[]): string[] => {
  const memory = getModelMemory();
  const seen = new Set<string>();
  const result: string[] = [];
  
  // 首先添加记忆中的型号（已排序）
  memory.forEach(m => {
    result.push(m.model);
    seen.add(m.model);
  });
  
  // 然后添加标准型号中未出现过的
  standardModels.forEach(model => {
    if (!seen.has(model)) {
      result.push(model);
      seen.add(model);
    }
  });
  
  return result;
};
