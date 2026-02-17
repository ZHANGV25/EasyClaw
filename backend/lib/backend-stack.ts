import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. VPC
    const vpc = new ec2.Vpc(this, 'EasyClawVpc', {
      maxAzs: 2,
      natGateways: 1, // Minimize cost for dev
    });

    // 2. Database (RDS Postgres)
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DbSecurityGroup', {
      vpc,
      description: 'Allow Lambda access to DB',
    });

    const db = new rds.DatabaseInstance(this, 'EasyClawDB', {
      engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_16_3 }),
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO), // Free tier eligible-ish
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      databaseName: 'easyclaw',
      backupRetention: cdk.Duration.days(1),
      deleteAutomatedBackups: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // NOTE: For dev only, change for prod
    });

    // 3. Storage (S3)
    const userDataBucket = new s3.Bucket(this, 'UserDataBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Dev only
      autoDeleteObjects: true,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    const stateSnapshotBucket = new s3.Bucket(this, 'StateSnapshotBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // 4. ECS Cluster (Worker Pool Infra)
    const cluster = new ecs.Cluster(this, 'WorkerCluster', {
      vpc,
      clusterName: 'EasyClawWorkerPool',
      containerInsights: true,
    });

    // 5. Lambdas
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc,
      description: 'Allow Lambda to access RDS',
    });

    dbSecurityGroup.addIngressRule(lambdaSecurityGroup, ec2.Port.tcp(5432), 'Allow Lambda connection');

    const commonLambdaProps: nodejs.NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DB_SECRET_ARN: db.secret?.secretArn || '',
        DB_HOST: db.instanceEndpoint.hostname,
        STATE_BUCKET_NAME: stateSnapshotBucket.bucketName,
        USER_DATA_BUCKET_NAME: userDataBucket.bucketName,
      },
      bundling: {
        externalModules: ['pg-native'],
      },
      timeout: cdk.Duration.seconds(30),
    };

    // Grants
    db.secret?.grantRead(new iam.ServicePrincipal('lambda.amazonaws.com')); // Setup for roles later

    // --- Handlers ---

    const dbSetupLambda = new nodejs.NodejsFunction(this, 'DbSetupLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/db-setup.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(dbSetupLambda);

    const chatLambda = new nodejs.NodejsFunction(this, 'ChatLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/chat.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(chatLambda);

    // Grant Bedrock Access
    chatLambda.addToRolePolicy(new iam.PolicyStatement({
      actions: ['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
      resources: ['arn:aws:bedrock:us-east-1::foundation-model/anthropic.claude-opus-4-6-v1'],
    }));

    const userLambda = new nodejs.NodejsFunction(this, 'UserLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/user.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(userLambda);

    const telegramLambda = new nodejs.NodejsFunction(this, 'TelegramLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/telegram.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(telegramLambda);

    const pollLambda = new nodejs.NodejsFunction(this, 'PollLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/poll.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(pollLambda);

    const updateJobLambda = new nodejs.NodejsFunction(this, 'UpdateJobLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/update-job.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(updateJobLambda);

    const stateUploadLambda = new nodejs.NodejsFunction(this, 'StateUploadLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/state-upload.ts'),
      handler: 'handler',
    });
    stateSnapshotBucket.grantPut(stateUploadLambda);
    stateSnapshotBucket.grantRead(stateUploadLambda);

    const usageLambda = new nodejs.NodejsFunction(this, 'UsageLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/usage.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(usageLambda);

    const creditsLambda = new nodejs.NodejsFunction(this, 'CreditsLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/credits.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(creditsLambda);

    const conversationsLambda = new nodejs.NodejsFunction(this, 'ConversationsLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/conversations.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(conversationsLambda);
    db.secret?.grantWrite(conversationsLambda); // Needed for INSERT/UPDATE/DELETE

    // 6. API Gateway
    const api = new apigateway.RestApi(this, 'EasyClawApi', {
      restApiName: 'EasyClaw Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
    });

    const apiRoot = api.root.addResource('api');

    // POST /api/chat
    const chatResource = apiRoot.addResource('chat');
    chatResource.addMethod('POST', new apigateway.LambdaIntegration(chatLambda));

    // GET /api/user
    const userResource = apiRoot.addResource('user');
    userResource.addMethod('GET', new apigateway.LambdaIntegration(userLambda));

    // POST /api/telegram/connect
    const telegramResource = apiRoot.addResource('telegram');
    const telegramConnect = telegramResource.addResource('connect');
    telegramConnect.addMethod('POST', new apigateway.LambdaIntegration(telegramLambda));

    // GET /api/usage
    const usageResource = apiRoot.addResource('usage');
    usageResource.addMethod('GET', new apigateway.LambdaIntegration(usageLambda));

    // GET /api/credits/history
    const creditsResource = apiRoot.addResource('credits');
    const creditsHistory = creditsResource.addResource('history');
    creditsHistory.addMethod('GET', new apigateway.LambdaIntegration(creditsLambda));

    // /api/conversations (GET, POST, PATCH, DELETE)
    const conversationsResource = apiRoot.addResource('conversations');
    conversationsResource.addMethod('GET', new apigateway.LambdaIntegration(conversationsLambda));
    conversationsResource.addMethod('POST', new apigateway.LambdaIntegration(conversationsLambda));
    conversationsResource.addMethod('PATCH', new apigateway.LambdaIntegration(conversationsLambda));
    conversationsResource.addMethod('DELETE', new apigateway.LambdaIntegration(conversationsLambda));

    // Internal API (Protected - TODO: Add Auth)
    const internal = apiRoot.addResource('internal');
    const internalJobs = internal.addResource('jobs');

    // GET /api/internal/jobs/poll
    const pollResource = internalJobs.addResource('poll');
    pollResource.addMethod('GET', new apigateway.LambdaIntegration(pollLambda));

    // POST /api/internal/jobs/update
    const updateJobResource = internalJobs.addResource('update');
    updateJobResource.addMethod('POST', new apigateway.LambdaIntegration(updateJobLambda));

    // POST /api/internal/state/upload
    const internalState = internal.addResource('state');
    const stateUploadResource = internalState.addResource('upload');
    stateUploadResource.addMethod('POST', new apigateway.LambdaIntegration(stateUploadLambda));

    // 7. Outputs
    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'DbSetupFunctionName', { value: dbSetupLambda.functionName });
    new cdk.CfnOutput(this, 'UserDataBucketName', { value: userDataBucket.bucketName });
    new cdk.CfnOutput(this, 'StateBucketName', { value: stateSnapshotBucket.bucketName });
  }
}
