/**
 * Microsoft Azure AD 认证服务
 * 使用 MSAL (Microsoft Authentication Library) 处理登录
 */

export interface MicrosoftUser {
  name: string;
  email: string;
  photoUrl?: string;
}

const base64UrlEncode = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return crypto.subtle.digest('SHA-256', data);
};

export const microsoftAuthService = {
  accessToken: null as string | null,
  idToken: null as string | null,
  refreshToken: null as string | null,

  async createPkcePair(): Promise<{ verifier: string; challenge: string }> {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    const verifier = base64UrlEncode(array.buffer);
    const hashed = await sha256(verifier);
    const challenge = base64UrlEncode(hashed);
    return { verifier, challenge };
  },

  /**
   * 初始化 Microsoft Auth
   * 在 App 启动时调用，检查是否有缓存的登录信息
   */
  async initMicrosoft(): Promise<boolean> {
    try {
      // 检查是否已有缓存的 token
      const cachedToken = localStorage.getItem('microsoft_access_token');
      const cachedId = localStorage.getItem('microsoft_id_token');
      
      if (cachedToken && cachedId) {
        this.accessToken = cachedToken;
        this.idToken = cachedId;
        return true;
      }
      
      return false;
    } catch (e) {
      console.error('Microsoft Init Error:', e);
      return false;
    }
  },

  /**
   * 使用授权码交换 Token
   * 通常在 OAuth2 回调中调用
   */
  async exchangeCodeForToken(
    code: string,
    clientId: string,
    redirectUri: string,
    codeVerifier: string,
    tenantId: string = 'common'
  ): Promise<boolean> {
    try {
      console.log('🔐 [exchangeCodeForToken] Starting token exchange with code');
      
      const params = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
        scope: 'offline_access https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/User.Read'
      });

      const tokenEndpoint = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
      console.log('🔐 [exchangeCodeForToken] Sending request to token endpoint:', tokenEndpoint);
      
      const res = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      console.log('🔐 [exchangeCodeForToken] Token endpoint response status:', res.status);

      if (!res.ok) {
        const error = await res.text();
        console.error('❌ [exchangeCodeForToken] Token Exchange Error:', error);
        return false;
      }

      const data = await res.json();
      console.log('🔐 [exchangeCodeForToken] Token received successfully');
      
      this.accessToken = data.access_token;
      this.idToken = data.id_token;
      this.refreshToken = data.refresh_token;

      // 保存到 localStorage
      localStorage.setItem('microsoft_access_token', data.access_token);
      localStorage.setItem('microsoft_id_token', data.id_token);
      if (data.refresh_token) {
        localStorage.setItem('microsoft_refresh_token', data.refresh_token);
      }

      console.log('✅ [exchangeCodeForToken] Token saved to localStorage');
      return true;
    } catch (e) {
      console.error('❌ [exchangeCodeForToken] Exchange Code Error:', e);
      return false;
    }
  },

  /**
   * 使用刷新令牌获取新的访问令牌
   */
  async refreshAccessToken(
    clientId: string
  ): Promise<boolean> {
    try {
      const refreshToken = localStorage.getItem('microsoft_refresh_token');
      if (!refreshToken) return false;

      const params = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: clientId,
        scope: 'https://graph.microsoft.com/.default offline_access'
      });

      const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      });

      if (!res.ok) {
        console.error('Refresh Token Error');
        return false;
      }

      const data = await res.json();
      
      this.accessToken = data.access_token;
      this.idToken = data.id_token;
      
      localStorage.setItem('microsoft_access_token', data.access_token);
      localStorage.setItem('microsoft_id_token', data.id_token);

      return true;
    } catch (e) {
      console.error('Refresh Access Token Error:', e);
      return false;
    }
  },

  /**
   * 获取用户信息
   */
  async getUserInfo(): Promise<MicrosoftUser | null> {
    if (!this.accessToken) {
      console.warn('⚠️ [getUserInfo] No access token available');
      return null;
    }

    try {
      console.log('👤 [getUserInfo] Fetching user info from Microsoft Graph...');
      
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('👤 [getUserInfo] Graph API response status:', res.status);

      if (!res.ok) {
        if (res.status === 401) {
          // Token 过期，可以尝试刷新
          console.warn('⚠️ [getUserInfo] Token expired (401), need refresh');
        }
        const errText = await res.text();
        console.error('❌ [getUserInfo] Graph API error:', errText);
        return null;
      }

      const data = await res.json();
      console.log('👤 [getUserInfo] User data received:', {
        displayName: data.displayName,
        userPrincipalName: data.userPrincipalName
      });
      
      const userInfo: MicrosoftUser = {
        name: data.displayName || data.userPrincipalName,
        email: data.userPrincipalName,
        photoUrl: undefined // Microsoft Graph Photo 需要单独请求
      };

      console.log('✅ [getUserInfo] User info parsed:', userInfo);
      return userInfo;
    } catch (e) {
      console.error('❌ [getUserInfo] Get User Info Error:', e);
      return null;
    }
  },

  /**
   * 登出并清除所有本地数据
   */
  logout() {
    this.accessToken = null;
    this.idToken = null;
    this.refreshToken = null;

    localStorage.removeItem('microsoft_access_token');
    localStorage.removeItem('microsoft_id_token');
    localStorage.removeItem('microsoft_refresh_token');
  },

  /**
   * 生成 Microsoft 登录 URL
   */
  getLoginUrl(
    clientId: string,
    redirectUri: string,
    tenantId: string = 'common',
    codeChallenge?: string
  ): string {
    const params = new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'offline_access https://graph.microsoft.com/Files.ReadWrite.All https://graph.microsoft.com/User.Read',
      response_mode: 'query',
      prompt: 'select_account' // 允许用户选择账户
    });

    if (codeChallenge) {
      params.set('code_challenge', codeChallenge);
      params.set('code_challenge_method', 'S256');
    }

    return `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }
};
