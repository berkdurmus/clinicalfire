const AWS = require('aws-sdk');
const crypto = require('crypto');

// Initialize AWS services
const cognito = new AWS.CognitoIdentityServiceProvider();

// Environment variables
const USER_POOL_ID = process.env.USER_POOL_ID;
const USER_POOL_CLIENT_ID = process.env.USER_POOL_CLIENT_ID;

// Helper function to create API Gateway response
const createResponse = (statusCode, body, headers = {}) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
    ...headers,
  },
  body: JSON.stringify(body),
});

// Helper function to calculate secret hash for Cognito
const calculateSecretHash = (username, clientId, clientSecret) => {
  if (!clientSecret) return undefined;

  return crypto
    .createHmac('SHA256', clientSecret)
    .update(username + clientId)
    .digest('base64');
};

// Main Lambda handler
exports.handler = async (event) => {
  console.log('Auth Lambda Event:', JSON.stringify(event, null, 2));

  try {
    const { httpMethod, path, body } = event;

    // Handle CORS preflight
    if (httpMethod === 'OPTIONS') {
      return createResponse(200, { message: 'CORS preflight' });
    }

    // Route based on path
    if (path.includes('/auth/login')) {
      return await handleLogin(body);
    } else if (path.includes('/auth/register')) {
      return await handleRegister(body);
    } else if (path.includes('/auth/refresh')) {
      return await handleRefreshToken(body);
    } else if (path.includes('/auth/logout')) {
      return await handleLogout(body);
    } else if (path.includes('/auth/me')) {
      return await handleGetUserInfo(event);
    } else {
      return createResponse(404, { error: 'Auth endpoint not found' });
    }
  } catch (error) {
    console.error('Auth Lambda error:', error);

    if (error.name === 'NotAuthorizedException') {
      return createResponse(401, {
        error: 'Invalid credentials',
        message: error.message,
      });
    }

    if (error.name === 'UserNotFoundException') {
      return createResponse(404, {
        error: 'User not found',
        message: error.message,
      });
    }

    if (error.name === 'UsernameExistsException') {
      return createResponse(409, {
        error: 'User already exists',
        message: error.message,
      });
    }

    return createResponse(500, {
      error: 'Internal server error',
      message: error.message,
    });
  }
};

// Handler functions
const handleLogin = async (body) => {
  const { email, password } = JSON.parse(body);

  if (!email || !password) {
    return createResponse(400, { error: 'Email and password are required' });
  }

  const params = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH',
    UserPoolId: USER_POOL_ID,
    ClientId: USER_POOL_CLIENT_ID,
    AuthParameters: {
      USERNAME: email,
      PASSWORD: password,
    },
  };

  const result = await cognito.adminInitiateAuth(params).promise();

  // Get user attributes
  const userParams = {
    UserPoolId: USER_POOL_ID,
    Username: email,
  };

  const userInfo = await cognito.adminGetUser(userParams).promise();

  // Extract user attributes
  const attributes = {};
  userInfo.UserAttributes.forEach((attr) => {
    attributes[attr.Name] = attr.Value;
  });

  return createResponse(200, {
    success: true,
    message: 'Login successful',
    data: {
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      refreshToken: result.AuthenticationResult.RefreshToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
      user: {
        id: userInfo.Username,
        email: attributes.email,
        firstName: attributes.given_name,
        lastName: attributes.family_name,
        role: attributes['custom:role'] || 'USER',
        department: attributes['custom:department'] || 'GENERAL',
        emailVerified: attributes.email_verified === 'true',
      },
    },
  });
};

const handleRegister = async (body) => {
  const {
    email,
    password,
    firstName,
    lastName,
    role = 'USER',
    department = 'GENERAL',
  } = JSON.parse(body);

  if (!email || !password || !firstName || !lastName) {
    return createResponse(400, {
      error: 'Email, password, first name, and last name are required',
    });
  }

  // Validate role
  const validRoles = ['DOCTOR', 'NURSE', 'TECHNICIAN', 'ADMIN', 'USER'];
  if (!validRoles.includes(role)) {
    return createResponse(400, {
      error: 'Invalid role. Must be one of: ' + validRoles.join(', '),
    });
  }

  const params = {
    UserPoolId: USER_POOL_ID,
    Username: email,
    TemporaryPassword: password,
    MessageAction: 'SUPPRESS', // Don't send welcome email
    UserAttributes: [
      { Name: 'email', Value: email },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'given_name', Value: firstName },
      { Name: 'family_name', Value: lastName },
      { Name: 'custom:role', Value: role },
      { Name: 'custom:department', Value: department },
    ],
  };

  // Create user
  const createResult = await cognito.adminCreateUser(params).promise();

  // Set permanent password
  const setPasswordParams = {
    UserPoolId: USER_POOL_ID,
    Username: email,
    Password: password,
    Permanent: true,
  };

  await cognito.adminSetUserPassword(setPasswordParams).promise();

  return createResponse(201, {
    success: true,
    message: 'User registered successfully',
    data: {
      userId: createResult.User.Username,
      email: email,
      status: createResult.User.UserStatus,
    },
  });
};

const handleRefreshToken = async (body) => {
  const { refreshToken } = JSON.parse(body);

  if (!refreshToken) {
    return createResponse(400, { error: 'Refresh token is required' });
  }

  const params = {
    AuthFlow: 'REFRESH_TOKEN_AUTH',
    UserPoolId: USER_POOL_ID,
    ClientId: USER_POOL_CLIENT_ID,
    AuthParameters: {
      REFRESH_TOKEN: refreshToken,
    },
  };

  const result = await cognito.adminInitiateAuth(params).promise();

  return createResponse(200, {
    success: true,
    message: 'Token refreshed successfully',
    data: {
      accessToken: result.AuthenticationResult.AccessToken,
      idToken: result.AuthenticationResult.IdToken,
      expiresIn: result.AuthenticationResult.ExpiresIn,
    },
  });
};

const handleLogout = async (body) => {
  // For Cognito, logout is typically handled client-side by discarding tokens
  // We can implement server-side logout by revoking tokens if needed

  return createResponse(200, {
    success: true,
    message: 'Logged out successfully',
  });
};

const handleGetUserInfo = async (event) => {
  // Extract user info from Cognito JWT token
  try {
    const claims = event.requestContext.authorizer.claims;

    const user = {
      id: claims.sub,
      email: claims.email,
      firstName: claims.given_name,
      lastName: claims.family_name,
      role: claims['custom:role'] || 'USER',
      department: claims['custom:department'] || 'GENERAL',
      emailVerified: claims.email_verified === 'true',
    };

    return createResponse(200, {
      success: true,
      data: { user },
    });
  } catch (error) {
    return createResponse(401, { error: 'Invalid or expired token' });
  }
};
