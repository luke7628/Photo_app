/**
 * 模型推断工具
 * 
 * 解决的问题：
 * - 消除 ReviewScreen.tsx 和 App.tsx 中重复的 inferModelFromPartNumber 函数
 * - 统一模型识别逻辑
 * - 方便日后扩展支持更多型号
 */

type PrinterModel = 'ZT411' | 'ZT421';

/**
 * 从部件号推断打印机型号
 * 
 * 支持的型号：
 * - ZT411: 4 英寸工业打印机
 * - ZT421: 2 英寸工业打印机
 * 
 * @param partNumber 部件号，支持大小写和包含关键字
 * @returns 推断出的型号，默认 ZT411
 * 
 * @example
 * inferModelFromPartNumber('ZT421-24P-203DPI') // 'ZT421'
 * inferModelFromPartNumber('zt411-24ep-300dpi') // 'ZT411'
 * inferModelFromPartNumber('unknown') // 'ZT411'
 */
export function inferModelFromPartNumber(partNumber: string): PrinterModel {
  if (!partNumber || typeof partNumber !== 'string') {
    return 'ZT411';
  }

  const upper = partNumber.toUpperCase();

  // 优先级：ZT421 > ZT411（更严格的匹配）
  if (upper.includes('ZT421')) {
    return 'ZT421';
  }

  if (upper.includes('ZT411')) {
    return 'ZT411';
  }

  // 默认返回 ZT411
  return 'ZT411';
}

/**
 * 验证序列号格式
 * 
 * @param serialNumber 序列号
 * @returns 是否有效
 * 
 * @example
 * isValidSerialNumber('99J2037011108') // true
 * isValidSerialNumber('') // false
 */
export function isValidSerialNumber(serialNumber?: string): boolean {
  if (!serialNumber) return false;
  return serialNumber.trim().length > 0;
}

/**
 * 验证部件号格式
 * 
 * @param partNumber 部件号
 * @returns 是否有效
 */
export function isValidPartNumber(partNumber?: string): boolean {
  if (!partNumber) return false;
  return partNumber.trim().length > 0;
}

/**
 * 验证打印机数据完整性
 * 
 * 所需字段：
 * - serialNumber 必填（序列号）
 * - partNumber 可选（部件号）
 * - model 自动推断
 * 
 * @param data 打印机数据对象
 * @returns 数据是否有效（至少需要序列号）
 * 
 * @example
 * isPrinterDataValid({ serialNumber: 'SN123', model: 'ZT411' }) // true (partNumber 可选)
 * isPrinterDataValid({ serialNumber: 'SN123', partNumber: 'PN123', model: 'ZT411' }) // true
 * isPrinterDataValid({}) // false
 */
export interface PrinterData {
  serialNumber?: string;
  partNumber?: string;
  model?: string;
}

export function isPrinterDataValid(data?: PrinterData): boolean {
  if (!data) return false;
  // 只要序列号有效即可，partNumber 可选
  return isValidSerialNumber(data.serialNumber);
}
