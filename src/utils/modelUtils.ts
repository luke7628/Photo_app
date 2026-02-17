/**
 * SN/PN 验证工具
 */

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
 * 
 * @param data 打印机数据对象
 * @returns 数据是否有效（至少需要序列号）
 * 
 * @example
 * isPrinterDataValid({ serialNumber: 'SN123' }) // true (partNumber 可选)
 * isPrinterDataValid({ serialNumber: 'SN123', partNumber: 'PN123' }) // true
 * isPrinterDataValid({}) // false
 */
export interface PrinterData {
  serialNumber?: string;
  partNumber?: string;
}

export function isPrinterDataValid(data?: PrinterData): boolean {
  if (!data) return false;
  // 只要序列号有效即可，partNumber 可选
  return isValidSerialNumber(data.serialNumber);
}
