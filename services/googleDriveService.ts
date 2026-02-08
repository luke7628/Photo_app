
export const googleDriveService = {
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

  async findFolder(name: string, parentId: string = 'root') {
    if (!this.accessToken) return null;
    try {
      // Query for folder with specific name and parent, ensuring it's not in trash
      const q = `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`;
      const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}`, {
        headers: await this.getHeaders()
      });
      const data = await res.json();
      return data.files?.[0]?.id || null;
    } catch (e) {
      console.error("Drive Find Error:", e);
      return null;
    }
  },

  async createFolder(name: string, parentId: string = 'root') {
    if (!this.accessToken) return null;
    try {
      const res = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: await this.getHeaders(),
        body: JSON.stringify({
          name,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        })
      });
      const data = await res.json();
      return data.id;
    } catch (e) {
      console.error("Drive Create Error:", e);
      return null;
    }
  },

  async ensureFolder(name: string, parentId: string = 'root') {
    const existing = await this.findFolder(name, parentId);
    if (existing) return existing;
    return this.createFolder(name, parentId);
  },

  async uploadImage(base64: string, filename: string, folderId: string) {
    if (!this.accessToken) return null;
    try {
      // Convert base64 to blob for upload
      const byteCharacters = atob(base64.split(',')[1]);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/jpeg' });

      // Metadata part
      const metadata = {
        name: filename,
        parents: [folderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        },
        body: form
      });
      return await res.json();
    } catch (e) {
      console.error("Drive Upload Error:", e);
      throw e;
    }
  }
};
