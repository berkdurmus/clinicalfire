// AWS Configuration for Clinical FIRE
export const awsConfig = {
  Auth: {
    // REQUIRED - Amazon Cognito Region
    region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',

    // REQUIRED - Amazon Cognito User Pool ID
    userPoolId: process.env.NEXT_PUBLIC_USER_POOL_ID,

    // REQUIRED - Amazon Cognito Web Client ID
    userPoolWebClientId: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,

    // OPTIONAL - Enforce user authentication prior to accessing AWS resources
    mandatorySignIn: false,

    // OPTIONAL - Configuration for cookie storage
    cookieStorage: {
      // REQUIRED - Cookie domain (only required if cookieStorage is provided)
      domain:
        typeof window !== 'undefined' ? window.location.hostname : 'localhost',
      // OPTIONAL - Cookie path
      path: '/',
      // OPTIONAL - Cookie expiration in days
      expires: 365,
      // OPTIONAL - See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie/SameSite
      sameSite: 'strict' as const,
      // OPTIONAL - Cookie secure flag
      secure: process.env.NODE_ENV === 'production',
    },

    // OPTIONAL - customized storage object
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,

    // OPTIONAL - Manually set the authentication flow type. Default is 'USER_SRP_AUTH'
    authenticationFlowType: 'USER_PASSWORD_AUTH',

    // OPTIONAL - Hosted UI configuration
    oauth: {
      domain: process.env.NEXT_PUBLIC_OAUTH_DOMAIN,
      scope: [
        'phone',
        'email',
        'profile',
        'openid',
        'aws.cognito.signin.user.admin',
      ],
      redirectSignIn:
        process.env.NEXT_PUBLIC_REDIRECT_SIGN_IN || 'http://localhost:3000/',
      redirectSignOut:
        process.env.NEXT_PUBLIC_REDIRECT_SIGN_OUT || 'http://localhost:3000/',
      responseType: 'code' as const,
    },
  },

  API: {
    endpoints: [
      {
        name: 'clinical-fire-api',
        endpoint: process.env.NEXT_PUBLIC_API_URL,
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
        custom_header: async () => {
          // Return custom headers if needed
          return {};
        },
      },
    ],
  },
};

// Export environment variables for easy access
export const ENV = {
  API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  AWS_REGION: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1',
  USER_POOL_ID: process.env.NEXT_PUBLIC_USER_POOL_ID,
  USER_POOL_CLIENT_ID: process.env.NEXT_PUBLIC_USER_POOL_CLIENT_ID,
  ENVIRONMENT: process.env.NEXT_PUBLIC_ENVIRONMENT || 'dev',
};

// Healthcare-specific configuration
export const HEALTHCARE_CONFIG = {
  // Session timeout for healthcare compliance (30 minutes)
  SESSION_TIMEOUT: 30 * 60 * 1000,

  // MFA requirements based on role
  MFA_REQUIRED_ROLES: ['DOCTOR', 'ADMIN'],

  // Audit logging configuration
  AUDIT_ENABLED: true,

  // Data retention policies
  DATA_RETENTION: {
    EXECUTION_LOGS: 7 * 365, // 7 years for healthcare compliance
    AUDIT_LOGS: 7 * 365,
    USER_SESSIONS: 30, // 30 days
  },
};
