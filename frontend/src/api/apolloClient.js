import { ApolloClient, InMemoryCache, createHttpLink, from, split } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';
import { useAuthStore } from '../stores/useAuthStore';

// AppSync configuration
const APPSYNC_URL = 'https://y4hpr7m7qbayfaluivmlbm3fgu.appsync-api.us-east-1.amazonaws.com/graphql';
const APPSYNC_WS_URL = 'wss://y4hpr7m7qbayfaluivmlbm3fgu.appsync-realtime-api.us-east-1.amazonaws.com/graphql';
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
    const { getValidIdToken } = useAuthStore.getState();
    const token = await getValidIdToken();
    
    if (token) {
      return {
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        }
      };
    }
  } catch (error) {
    console.error('Error getting ID token:', error);
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

const wsLink = new GraphQLWsLink(createClient({
  url: APPSYNC_WS_URL,
  connectionParams: async () => {
    try {
      const { getValidIdToken } = useAuthStore.getState();
      const token = await getValidIdToken();
      return {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };
    } catch (error) {
      console.error('Error getting ID token for WebSocket:', error);
      return {};
    }
  },
  retryAttempts: 3,
  retryWait: (retryCount) => Math.min(1000 * 2 ** retryCount, 10000),
  on: {
    connected: () => {},
    connecting: () => {},
    closed: (event) => {},
    error: (error) => console.error('WebSocket: Connection error', error),
  },
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  from([authLink, httpLink])
);

// Create Apollo Client
const client = new ApolloClient({
  link: from([errorLink, splitLink]),
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