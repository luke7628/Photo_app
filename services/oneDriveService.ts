/**
 * OneDrive 服务 - Microsoft Graph API 集成
 * 用于访问登录用户的 OneDrive
 */

export const oneDriveService = {
  accessToken: null as string | null,

  setToken(token: string) {
    this.accessToken = token;
  },

  async getHeaders() {
    if (!this.accessToken) throw new Error("No access token");
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    };
  },

  /**
   * 查找文件夹（按名称和路径）
   * @param folderPath - 文件夹路径，如 '/Dematic/FieldPhotos'
   */
  async findFolder(folderPath: string): Promise<string | null> {
    if (!this.accessToken) return null;
    try {
      // 移除开头和末尾的斜杠，然后按斜杠分割
      const parts = folderPath.split('/').filter(p => p.trim());
      let itemId = 'root';

      for (const part of parts) {
        const res = await fetch(
          `https://graph.microsoft.com/v1.0/me/drive/items/${itemId}/children?$filter=name eq '${encodeURIComponent(part)}'`,
          {
            headers: await this.getHeaders()
          }
        );
        const data = await res.json();
        
        if (!data.value || data.value.length === 0) {
          return null; // 文件夹不存在
        }
        
        itemId = data.value[0].id;
      }

      return itemId;
    } catch (e) {
      console.error("OneDrive Find Folder Error:", e);
      return null;
    }
  },

  /**
   * 创建文件夹
   * @param folderName - 文件夹名称
   * @param parentItemId - 父文件夹 ID（默认为 root）
   */
  async createFolder(folderName: string, parentItemId: string = 'root'): Promise<string | null> {
    if (!this.accessToken) return null;
    try {
      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${parentItemId}/children`,
        {
          method: 'POST',
          headers: await this.getHeaders(),
          body: JSON.stringify({
            name: folderName,
            folder: {},
            '@microsoft.graph.conflictBehavior': 'rename'
          })
        }
      );

      if (!res.ok) {
        console.error('OneDrive Create Folder Error:', await res.text());
        return null;
      }

      const data = await res.json();
      return data.id;
    } catch (e) {
      console.error("OneDrive Create Folder Error:", e);
      return null;
    }
  },

  /**
   * 确保文件夹存在，如果不存在则创建
   */
  async ensureFolder(folderPath: string): Promise<string | null> {
    // 先尝试查找
    let existing = await this.findFolder(folderPath);
    if (existing) return existing;

    // 如果不存在，逐层创建
    const parts = folderPath.split('/').filter(p => p.trim());
    let parentId = 'root';

    for (const part of parts) {
      const created = await this.createFolder(part, parentId);
      if (!created) return null;
      parentId = created;
    }

    return parentId;
  },

  /**
   * 上传图像到 OneDrive
   * @param base64 - Base64 编码的图像
   * @param filename - 文件名
   * @param folderItemId - 目标文件夹 ID
   */
  async uploadImage(base64: string, filename: string, folderItemId: string): Promise<any> {
    if (!this.accessToken) return null;
    try {
      // 转换 base64 为 blob
      const byteCharacters = atob(base64.includes(',') ? base64.split(',')[1] : base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // 使用 multipart upload 上传文件
      const form = new FormData();
      form.append('file', blob, filename);

      const res = await fetch(
        `https://graph.microsoft.com/v1.0/me/drive/items/${folderItemId}:/${encodeURIComponent(filename)}:/content`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${this.accessToken}`
          },
          body: blob
        }
      );

      if (!res.ok) {
        const error = await res.text();
        console.error('OneDrive Upload Error:', error);
        throw new Error(`Upload failed: ${res.status}`);
      }

      const data = await res.json();
      return {
        id: data.id,
        webUrl: data.webUrl,
        name: data.name
      };
    } catch (e) {
      console.error("OneDrive Upload Image Error:", e);
      throw e;
    }
  },

  /**
   * 获取 OneDrive 根文件夹信息
   */
  async getRootInfo(): Promise<any> {
    if (!this.accessToken) return null;
    try {
      const res = await fetch(
        'https://graph.microsoft.com/v1.0/me/drive/root',
        {
          headers: await this.getHeaders()
        }
      );
      const data = await res.json();
      return data;
    } catch (e) {
      console.error("OneDrive Get Root Error:", e);
      return null;
    }
  }
};
