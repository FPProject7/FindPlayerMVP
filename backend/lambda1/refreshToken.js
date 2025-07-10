const { CognitoIdentityProviderClient, InitiateAuthCommand } = require('@aws-sdk/client-cognito-identity-provider');

const REGION = process.env.REGION || "us-east-1";
const CLIENT_ID = process.env.CLIENT_ID;
const USER_POOL_ID = process.env.USER_POOL_ID;

const cognitoClient = new CognitoIdentityProviderClient({ region: REGION });

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { refreshToken } = body;

    if (!refreshToken) {
      return {
        statusCode: 400,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'Content-Type,Authorization',
          'Access-Control-Allow-Methods': 'POST,OPTIONS',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Refresh token is required' })
      };
    }

    const authParams = {
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refreshToken
      }
    };

    const command = new InitiateAuthCommand(authParams);
    const authResponse = await cognitoClient.send(command);

    const { IdToken, AccessToken, RefreshToken } = authResponse.AuthenticationResult;

    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Token refreshed successfully',
        idToken: IdToken,
        accessToken: AccessToken,
        refreshToken: RefreshToken || refreshToken // Use new refresh token if provided, otherwise keep the old one
      })
    };

  } catch (error) {
    console.error('Token refresh error:', error);
    
    return {
      statusCode: 401,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'POST,OPTIONS',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'Token refresh failed',
        error: error.message 
      })
    };
  }
}; 