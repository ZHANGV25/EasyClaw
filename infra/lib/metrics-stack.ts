import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';
import { Construct } from 'constructs';

export class MetricsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Lambda function to publish queue metrics
    const metricsPublisher = new nodejs.NodejsFunction(this, 'MetricsPublisher', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../../workers/lambda/publish-metrics/index.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(10),
      environment: {
        DATABASE_URL: process.env.DATABASE_URL || '',
        // AWS_REGION is automatically provided by Lambda runtime
      },
      bundling: {
        forceDockerBundling: false,
      },
      memorySize: 256,
    });

    // Grant CloudWatch permissions
    metricsPublisher.addToRolePolicy(new iam.PolicyStatement({
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    }));

    // EventBridge rule: Run every minute
    const rule = new events.Rule(this, 'MetricsPublishSchedule', {
      schedule: events.Schedule.rate(cdk.Duration.minutes(1)),
      description: 'Publish queue depth metric every minute',
    });

    rule.addTarget(new targets.LambdaFunction(metricsPublisher));

    // Outputs
    new cdk.CfnOutput(this, 'MetricsPublisherArn', {
      value: metricsPublisher.functionArn,
      description: 'Metrics Publisher Lambda ARN',
    });
  }
}
