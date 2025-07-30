import { ENV } from '@/lib/aws.config';

// Types for authentication
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'DOCTOR' | 'NURSE' | 'TECHNICIAN' | 'ADMIN' | 'USER';
  department?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  success: boolean;
  data?: {
    user: AuthUser;
    accessToken: string;
    idToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  error?: string;
  message?: string;
}

class CognitoService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = ENV.API_URL;
  }

  // Make HTTP requests to Auth Lambda
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        error: 'Network error',
        message: `HTTP ${response.status}`,
      }));
      throw new Error(error.message || error.error || 'Request failed');
    }

    return response.json();
  }

  // Login with email and password
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponse>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      });

      // Store tokens in localStorage
      if (response.success && response.data) {
        this.storeTokens({
          accessToken: response.data.accessToken,
          idToken: response.data.idToken,
          refreshToken: response.data.refreshToken,
          expiresIn: response.data.expiresIn,
        });

        this.storeUser(response.data.user);
      }

      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Register new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponse>('/auth/register', {
        method: 'POST',
        body: JSON.stringify(userData),
      });

      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken(): Promise<AuthTokens | null> {
    try {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await this.makeRequest<{
        success: boolean;
        data: AuthTokens;
      }>('/auth/refresh', {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      });

      if (response.success) {
        this.storeTokens(response.data);
        return response.data;
      }

      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      this.logout();
      return null;
    }
  }

  // Get current user info
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const accessToken = this.getAccessToken();
      if (!accessToken) {
        return null;
      }

      const response = await this.makeRequest<{
        success: boolean;
        data: { user: AuthUser };
      }>('/auth/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (response.success) {
        this.storeUser(response.data.user);
        return response.data.user;
      }

      return null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Call logout endpoint (optional for Cognito)
      await this.makeRequest('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Always clear local storage
      this.clearStorage();
    }
  }

  // Token management
  private storeTokens(tokens: AuthTokens): void {
    if (typeof window === 'undefined') return;

    localStorage.setItem('clinical_fire_access_token', tokens.accessToken);
    localStorage.setItem('clinical_fire_id_token', tokens.idToken);
    localStorage.setItem('clinical_fire_refresh_token', tokens.refreshToken);
    localStorage.setItem(
      'clinical_fire_token_expires',
      (Date.now() + tokens.expiresIn * 1000).toString()
    );
  }

  private storeUser(user: AuthUser): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem('clinical_fire_user', JSON.stringify(user));
  }

  getAccessToken(): string | null {
    if (typeof window === 'undefined') return null;

    const token = localStorage.getItem('clinical_fire_access_token');
    const expires = localStorage.getItem('clinical_fire_token_expires');

    if (!token || !expires) return null;

    // Check if token is expired
    if (Date.now() > parseInt(expires)) {
      this.refreshToken(); // Attempt to refresh
      return null;
    }

    return token;
  }

  getIdToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('clinical_fire_id_token');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('clinical_fire_refresh_token');
  }

  getStoredUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;

    const userStr = localStorage.getItem('clinical_fire_user');
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = this.getAccessToken();
    const user = this.getStoredUser();
    return !!(token && user);
  }

  private clearStorage(): void {
    if (typeof window === 'undefined') return;

    localStorage.removeItem('clinical_fire_access_token');
    localStorage.removeItem('clinical_fire_id_token');
    localStorage.removeItem('clinical_fire_refresh_token');
    localStorage.removeItem('clinical_fire_token_expires');
    localStorage.removeItem('clinical_fire_user');
  }

  // Healthcare-specific features
  checkMFARequired(role: string): boolean {
    const mfaRoles = ['DOCTOR', 'ADMIN'];
    return mfaRoles.includes(role);
  }

  getAuthorizationHeader(): { Authorization: string } | {} {
    const token = this.getAccessToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  // Session timeout management
  setupSessionTimeout(): void {
    if (typeof window === 'undefined') return;

    // Clear any existing timeout
    const existingTimeout = window.sessionTimeout;
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout (30 minutes for healthcare)
    window.sessionTimeout = setTimeout(
      () => {
        alert(
          'Your session has expired for security reasons. Please log in again.'
        );
        this.logout();
        window.location.href = '/login';
      },
      30 * 60 * 1000
    ); // 30 minutes
  }

  clearSessionTimeout(): void {
    if (typeof window !== 'undefined' && window.sessionTimeout) {
      clearTimeout(window.sessionTimeout);
      delete window.sessionTimeout;
    }
  }
}

// Global session timeout declaration
declare global {
  interface Window {
    sessionTimeout?: NodeJS.Timeout;
  }
}

export const cognitoService = new CognitoService();
