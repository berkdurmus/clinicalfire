// AWS Configuration for Clinical FIRE
interface Environment {
  API_URL: string;
  COGNITO_USER_POOL_ID: string;
  COGNITO_CLIENT_ID: string;
  COGNITO_REGION: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';
}

// Environment detection
const isDevelopment =
  process.env.NODE_ENV === 'development' || typeof window !== 'undefined';

// Development configuration (fallback to local Express API)
const developmentConfig: Environment = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
  COGNITO_USER_POOL_ID:
    process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || 'dev-user-pool',
  COGNITO_CLIENT_ID:
    process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || 'dev-client-id',
  COGNITO_REGION: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
  ENVIRONMENT: 'development',
};

// Production configuration (from environment variables)
const productionConfig: Environment = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  COGNITO_USER_POOL_ID: process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || '',
  COGNITO_CLIENT_ID: process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || '',
  COGNITO_REGION: process.env.NEXT_PUBLIC_COGNITO_REGION || 'us-east-1',
  ENVIRONMENT: 'production',
};

// Export the appropriate configuration
export const ENV: Environment = isDevelopment
  ? developmentConfig
  : productionConfig;

// Validation
if (!ENV.API_URL) {
  console.warn(
    '⚠️  API_URL is not configured. Using fallback: http://localhost:3001/api'
  );
  ENV.API_URL = 'http://localhost:3001/api';
}

// Debug logging in development
if (isDevelopment && typeof window !== 'undefined') {
  console.log('🔧 Clinical FIRE - Environment Configuration:', {
    ENVIRONMENT: ENV.ENVIRONMENT,
    API_URL: ENV.API_URL,
    COGNITO_REGION: ENV.COGNITO_REGION,
  });
}
