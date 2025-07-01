import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as appsync from 'aws-cdk-lib/aws-appsync';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import { Construct } from 'constructs';

export class MessagingStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Cognito User Pool with custom attributes
    const userPool = new cognito.UserPool(this, 'MessagingUserPool', {
      userPoolName: 'findplayer-messaging-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
        username: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
      },
      customAttributes: {
        is_scout_verified: new cognito.StringAttribute({ mutable: true }),
        user_type: new cognito.StringAttribute({ mutable: true }),
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // User Pool Client
    const userPoolClient = new cognito.UserPoolClient(this, 'MessagingUserPoolClient', {
      userPool,
      userPoolClientName: 'findplayer-messaging-client',
      generateSecret: false,
      authFlows: {
        adminUserPassword: true,
        userPassword: true,
        userSrp: true,
      },
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
          implicitCodeGrant: true,
        },
        scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.OPENID, cognito.OAuthScope.PROFILE],
        callbackUrls: ['http://localhost:3000/callback', 'https://yourdomain.com/callback'],
      },
    });

    // Import existing DynamoDB tables
    const conversationsTable = dynamodb.Table.fromTableName(this, 'ConversationsTable', 'findplayer-conversations');
    const messagesTable = dynamodb.Table.fromTableName(this, 'MessagesTable', 'findplayer-messages');
    const userConversationsTable = dynamodb.Table.fromTableName(this, 'UserConversationsTable', 'findplayer-user-conversations');

    // AppSync API
    const api = new appsync.GraphqlApi(this, 'MessagingAPI', {
      name: 'findplayer-messaging-api',
      schema: appsync.SchemaFile.fromAsset('schema.graphql'),
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool,
          },
        },
      },
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
        retention: logs.RetentionDays.ONE_WEEK,
      },
    });

    // Lambda Functions
    const sendMessageLambda = new lambda.Function(this, 'SendMessageFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/send-message'),
      environment: {
        CONVERSATIONS_TABLE: 'findplayer-conversations',
        MESSAGES_TABLE: 'findplayer-messages',
        USER_CONVERSATIONS_TABLE: 'findplayer-user-conversations',
        USER_POOL_ID: userPool.userPoolId,
        API_ID: api.apiId,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const listConversationsLambda = new lambda.Function(this, 'ListConversationsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/list-conversations'),
      environment: {
        CONVERSATIONS_TABLE: 'findplayer-conversations',
        USER_CONVERSATIONS_TABLE: 'findplayer-user-conversations',
        USER_POOL_ID: userPool.userPoolId,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const getConversationMessagesLambda = new lambda.Function(this, 'GetConversationMessagesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/get-conversation-messages'),
      environment: {
        MESSAGES_TABLE: 'findplayer-messages',
        CONVERSATIONS_TABLE: 'findplayer-conversations',
        USER_POOL_ID: userPool.userPoolId,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const markMessageReadLambda = new lambda.Function(this, 'MarkMessageReadFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('lambda/mark-message-read'),
      environment: {
        MESSAGES_TABLE: 'findplayer-messages',
        USER_POOL_ID: userPool.userPoolId,
        API_ID: api.apiId,
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    const searchUsersLambda = new lambda.Function(this, 'SearchUsersFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'searchUsers.handler',
      code: lambda.Code.fromAsset('lambda/search-users'),
      environment: {
        DB_HOST: process.env.DB_HOST || '',
        DB_USER: process.env.DB_USER || '',
        DB_PASSWORD: process.env.DB_PASSWORD || '',
        DB_NAME: process.env.DB_NAME || '',
      },
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
    });

    // Grant DynamoDB permissions to Lambda functions
    conversationsTable.grantReadWriteData(sendMessageLambda);
    conversationsTable.grantReadData(listConversationsLambda);
    conversationsTable.grantReadData(getConversationMessagesLambda);

    messagesTable.grantReadWriteData(sendMessageLambda);
    messagesTable.grantReadData(getConversationMessagesLambda);
    messagesTable.grantWriteData(markMessageReadLambda);

    userConversationsTable.grantReadWriteData(sendMessageLambda);
    userConversationsTable.grantReadData(listConversationsLambda);

    // Grant Cognito permissions to Lambda functions
    userPool.grant(sendMessageLambda, 'cognito-idp:AdminGetUser');
    userPool.grant(listConversationsLambda, 'cognito-idp:AdminGetUser');
    userPool.grant(getConversationMessagesLambda, 'cognito-idp:AdminGetUser');
    userPool.grant(markMessageReadLambda, 'cognito-idp:AdminGetUser');

    // Grant AppSync publish permissions for real-time updates
    const appsyncPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['appsync:GraphQL'],
      resources: [`${api.arn}/*`],
    });

    sendMessageLambda.addToRolePolicy(appsyncPolicy);
    markMessageReadLambda.addToRolePolicy(appsyncPolicy);

    // AppSync Data Sources
    const sendMessageDataSource = api.addLambdaDataSource('SendMessageDataSource', sendMessageLambda);
    const listConversationsDataSource = api.addLambdaDataSource('ListConversationsDataSource', listConversationsLambda);
    const getConversationMessagesDataSource = api.addLambdaDataSource('GetConversationMessagesDataSource', getConversationMessagesLambda);
    const markMessageReadDataSource = api.addLambdaDataSource('MarkMessageReadDataSource', markMessageReadLambda);

    // AppSync Resolvers
    sendMessageDataSource.createResolver('SendMessageResolver', {
      typeName: 'Mutation',
      fieldName: 'sendMessage',
    });

    listConversationsDataSource.createResolver('ListConversationsResolver', {
      typeName: 'Query',
      fieldName: 'listConversations',
    });

    getConversationMessagesDataSource.createResolver('GetConversationMessagesResolver', {
      typeName: 'Query',
      fieldName: 'getConversationMessages',
    });

    markMessageReadDataSource.createResolver('MarkMessageReadResolver', {
      typeName: 'Mutation',
      fieldName: 'markMessageRead',
    });

    // AppSync Data Source for searchUsers
    const searchUsersDataSource = api.addLambdaDataSource('SearchUsersDataSource', searchUsersLambda);
    searchUsersDataSource.createResolver('SearchUsersResolver', {
      typeName: 'Query',
      fieldName: 'searchUsers',
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'GraphQLAPIURL', {
      value: api.graphqlUrl,
      description: 'AppSync GraphQL API URL',
    });

    new cdk.CfnOutput(this, 'GraphQLAPIKey', {
      value: api.apiKey || 'No API Key',
      description: 'AppSync GraphQL API Key',
    });

    new cdk.CfnOutput(this, 'ConversationsTableName', {
      value: 'findplayer-conversations',
      description: 'DynamoDB Conversations Table Name',
    });

    new cdk.CfnOutput(this, 'MessagesTableName', {
      value: 'findplayer-messages',
      description: 'DynamoDB Messages Table Name',
    });

    new cdk.CfnOutput(this, 'UserConversationsTableName', {
      value: 'findplayer-user-conversations',
      description: 'DynamoDB User Conversations Table Name',
    });
  }
} 