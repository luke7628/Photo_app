import { Project, Printer } from '../types';

/**
 * 获取项目的缩略图 URL
 * 优先级：
 * 1. 项目内第一个打印机的第一张照片
 * 2. 项目内任意打印机的 imageUrl（占位符）
 * 3. null（使用默认图标）
 */
export function getProjectThumbnail(project: Project, printers: Printer[]): string | null {
  // 找到属于该项目的所有打印机
  const projectPrinters = printers.filter(p => p.projectId === project.id);
  
  if (projectPrinters.length === 0) {
    return null;
  }
  
  // 遍历打印机，查找第一张有效照片
  for (const printer of projectPrinters) {
    if (printer.photos && printer.photos.length > 0) {
      // 找第一张有 URL 的照片
      const firstPhoto = printer.photos.find(photo => photo.url && photo.url.trim().length > 0);
      if (firstPhoto) {
        return firstPhoto.url;
      }
    }
  }
  
  // 如果没有找到照片，使用第一个打印机的 imageUrl（占位符）
  return projectPrinters[0].imageUrl || null;
}

/**
 * 获取项目的统计信息
 */
export function getProjectStats(project: Project, printers: Printer[]): {
  printerCount: number;
  totalPhotos: number;
  completedPrinters: number;
} {
  const projectPrinters = printers.filter(p => p.projectId === project.id);
  
  const totalPhotos = projectPrinters.reduce((sum, printer) => {
    return sum + (printer.photos?.filter(p => p.url).length || 0);
  }, 0);
  
  const completedPrinters = projectPrinters.filter(p => {
    const photoCount = p.photos?.filter(photo => photo.url).length || 0;
    return photoCount === 12 || p.syncedCount === 12;
  }).length;
  
  return {
    printerCount: projectPrinters.length,
    totalPhotos,
    completedPrinters
  };
}
