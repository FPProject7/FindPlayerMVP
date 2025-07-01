import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { useAuthStore } from '../stores/useAuthStore';

// AppSync configuration
const APPSYNC_URL = 'https://y4hpr7m7qbayfaluivmlbm3fgu.appsync-api.us-east-1.amazonaws.com/graphql';
const APPSYNC_REGION = 'us-east-1';
const APPSYNC_AUTHENTICATION_TYPE = 'AMAZON_COGNITO_USER_POOLS';
const APPSYNC_USER_POOL_ID = 'us-east-1_kRiXWfHQ0';
const APPSYNC_USER_POOL_CLIENT_ID = '31070ugpnoc6qkv5kg5hduun54';

// Create HTTP link
const httpLink = createHttpLink({
  uri: APPSYNC_URL,
});

// Create auth link
const authLink = setContext(async (_, { headers }) => {
  try {
    const { getValidToken } = useAuthStore.getState();
    const token = await getValidToken();
    
    if (token) {
      return {
        headers: {
          ...headers,
          authorization: token,
        }
      };
    }
  } catch (error) {
    console.error('Error getting access token:', error);
  }
  
  return {
    headers: {
      ...headers,
    }
  };
});

// Create error link
const errorLink = onError(({ graphQLErrors, networkError }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Create Apollo Client
const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});

export default client; 