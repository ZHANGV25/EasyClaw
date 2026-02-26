import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

export interface BackendStackProps extends cdk.StackProps {
  databaseUrl?: string;
}

export class BackendStack extends cdk.Stack {
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props?: BackendStackProps) {
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
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T4G, ec2.InstanceSize.MICRO),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [dbSecurityGroup],
      databaseName: 'easyclaw',
      backupRetention: cdk.Duration.days(7),
      deleteAutomatedBackups: false,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      deletionProtection: true,
    });

    // 3. Storage (S3)
    const userDataBucket = new s3.Bucket(this, 'UserDataBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*'],
      }],
    });

    const stateSnapshotBucket = new s3.Bucket(this, 'StateSnapshotBucket', {
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // 4. Lambdas (ECS cluster for workers is in WorkerStack)
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
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
        CLERK_PUBLISHABLE_KEY: process.env.CLERK_PUBLISHABLE_KEY || '',
        STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || '',
        STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || '',
      },
      bundling: {
        externalModules: ['pg-native'],
        forceDockerBundling: false,
      },
      memorySize: 512,
      timeout: cdk.Duration.seconds(300),
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
      resources: [
        `arn:aws:bedrock:*::foundation-model/*`,
        `arn:aws:bedrock:us-east-1:${this.account}:inference-profile/*`
      ],
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
    db.secret?.grantWrite(conversationsLambda);

    // Stripe handler
    const stripeLambda = new nodejs.NodejsFunction(this, 'StripeLambda', {
      ...commonLambdaProps,
      entry: path.join(__dirname, '../src/handlers/stripe.ts'),
      handler: 'handler',
    });
    db.secret?.grantRead(stripeLambda);

    // Job Queue API Lambdas — use Clerk auth, same env as common lambdas
    const jobLambdaConfig: nodejs.NodejsFunctionProps = {
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.seconds(10),
      memorySize: 512,
      environment: {
        DATABASE_URL: props?.databaseUrl || '',
        NODE_ENV: 'production',
        CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY || '',
      },
      bundling: {
        forceDockerBundling: false,
      },
    };

    const createJobFn = new nodejs.NodejsFunction(this, 'CreateJobFunction', {
      ...jobLambdaConfig,
      functionName: 'easyclaw-create-job',
      entry: path.join(__dirname, '../src/handlers/createJob.ts'),
      handler: 'handler',
      description: 'Create a new job in the queue',
    });

    const getJobFn = new nodejs.NodejsFunction(this, 'GetJobFunction', {
      ...jobLambdaConfig,
      functionName: 'easyclaw-get-job',
      entry: path.join(__dirname, '../src/handlers/getJob.ts'),
      handler: 'handler',
      description: 'Get job status by ID',
    });

    const listJobsFn = new nodejs.NodejsFunction(this, 'ListJobsFunction', {
      ...jobLambdaConfig,
      functionName: 'easyclaw-list-jobs',
      entry: path.join(__dirname, '../src/handlers/listJobs.ts'),
      handler: 'handler',
      description: 'List user jobs',
    });

    // 6. API Gateway
    this.api = new apigateway.RestApi(this, 'EasyClawApi', {
      restApiName: 'EasyClaw Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          'Content-Type',
          'X-Amz-Date',
          'Authorization',
          'X-Api-Key',
          'X-Amz-Security-Token',
        ],
      },
    });

    const apiRoot = this.api.root.addResource('api');

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

    // /api/credits
    const creditsResource = apiRoot.addResource('credits');
    // GET /api/credits/history
    const creditsHistory = creditsResource.addResource('history');
    creditsHistory.addMethod('GET', new apigateway.LambdaIntegration(creditsLambda));
    // POST /api/credits/purchase
    const creditsPurchase = creditsResource.addResource('purchase');
    creditsPurchase.addMethod('POST', new apigateway.LambdaIntegration(stripeLambda));

    // /api/conversations (GET, POST, PATCH, DELETE)
    const conversationsResource = apiRoot.addResource('conversations');
    conversationsResource.addMethod('GET', new apigateway.LambdaIntegration(conversationsLambda));
    conversationsResource.addMethod('POST', new apigateway.LambdaIntegration(conversationsLambda));
    conversationsResource.addMethod('PATCH', new apigateway.LambdaIntegration(conversationsLambda));
    conversationsResource.addMethod('DELETE', new apigateway.LambdaIntegration(conversationsLambda));

    // Stripe webhook (no auth — Stripe signature verification instead)
    const webhooksResource = apiRoot.addResource('webhooks');
    const stripeWebhook = webhooksResource.addResource('stripe');
    stripeWebhook.addMethod('POST', new apigateway.LambdaIntegration(stripeLambda));

    // Internal API (worker-to-backend communication, secured by VPC/IAM)
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

    // Job Queue API (/jobs endpoints for worker pool)
    const jobsResource = this.api.root.addResource('jobs');

    // POST /jobs - Create job
    jobsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(createJobFn, { proxy: true }),
    );

    // GET /jobs - List jobs
    jobsResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(listJobsFn, { proxy: true }),
    );

    // /jobs/{jobId} resource
    const jobResource = jobsResource.addResource('{jobId}');

    // GET /jobs/{jobId} - Get job status
    jobResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(getJobFn, { proxy: true }),
    );

    // 7. Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: this.api.url,
      description: 'API Gateway URL',
      exportName: 'EasyClawApiUrl',
    });
    new cdk.CfnOutput(this, 'ApiId', {
      value: this.api.restApiId,
      description: 'API Gateway ID',
    });
    new cdk.CfnOutput(this, 'DbSetupFunctionName', { value: dbSetupLambda.functionName });
    new cdk.CfnOutput(this, 'UserDataBucketName', { value: userDataBucket.bucketName });
    new cdk.CfnOutput(this, 'StateBucketName', { value: stateSnapshotBucket.bucketName });
    new cdk.CfnOutput(this, 'CreateJobFunctionArn', {
      value: createJobFn.functionArn,
      description: 'Create Job Lambda ARN',
    });
    new cdk.CfnOutput(this, 'GetJobFunctionArn', {
      value: getJobFn.functionArn,
      description: 'Get Job Lambda ARN',
    });
    new cdk.CfnOutput(this, 'ListJobsFunctionArn', {
      value: listJobsFn.functionArn,
      description: 'List Jobs Lambda ARN',
    });
  }
}
