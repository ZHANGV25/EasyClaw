import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as appscaling from 'aws-cdk-lib/aws-applicationautoscaling';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import { Construct } from 'constructs';

export interface WorkerStackProps extends cdk.StackProps {
  databaseUrl: string;
  s3Bucket: string;
}

export class WorkerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WorkerStackProps) {
    super(scope, id, props);

    // VPC (use default or create new)
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVpc', {
      isDefault: true,
    });

    // ECS Cluster
    const cluster = new ecs.Cluster(this, 'WorkerCluster', {
      vpc,
      clusterName: 'easyclaw-workers',
      enableFargateCapacityProviders: true,
    });

    // Task Execution Role (for ECS to pull images, write logs)
    const executionRole = new iam.Role(this, 'TaskExecutionRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
      ],
    });

    // Task Role (for worker to access S3, CloudWatch)
    const taskRole = new iam.Role(this, 'TaskRole', {
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    });

    // Grant S3 access
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        's3:GetObject',
        's3:PutObject',
        's3:DeleteObject',
      ],
      resources: [`arn:aws:s3:::${props.s3Bucket}/*`],
    }));

    // Grant CloudWatch Metrics access
    taskRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'cloudwatch:PutMetricData',
      ],
      resources: ['*'],
    }));

    // CloudWatch Log Group
    const logGroup = new logs.LogGroup(this, 'WorkerLogGroup', {
      logGroupName: '/ecs/easyclaw-workers',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'WorkerTaskDef', {
      family: 'easyclaw-worker',
      cpu: 1024,  // 1 vCPU
      memoryLimitMiB: 2048,  // 2 GB
      executionRole,
      taskRole,
    });

    // Container Definition
    const container = taskDefinition.addContainer('worker', {
      image: ecs.ContainerImage.fromAsset('../workers', {
        file: 'Dockerfile',
      }),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'worker',
        logGroup,
      }),
      environment: {
        DATABASE_URL: props.databaseUrl,
        // AWS_REGION is automatically provided by AWS runtime
        S3_BUCKET: props.s3Bucket,
        POLL_INTERVAL_MS: '5000',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'node -e "process.exit(0)"'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(10),
        retries: 3,
        startPeriod: cdk.Duration.seconds(60),
      },
    });

    // ECS Service
    const service = new ecs.FargateService(this, 'WorkerService', {
      cluster,
      taskDefinition,
      serviceName: 'easyclaw-workers',
      desiredCount: 1,  // Start with 1 worker
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      enableExecuteCommand: true,  // For debugging
    });

    // Custom CloudWatch Metric for Queue Depth
    const queueDepthMetric = new cloudwatch.Metric({
      namespace: 'EasyClaw',
      metricName: 'PendingJobs',
      statistic: 'Average',
      period: cdk.Duration.minutes(1),
    });

    // Auto Scaling
    const scaling = service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 50,
    });

    // Target Tracking Scaling Policy
    scaling.scaleToTrackCustomMetric('QueueDepthTargetTracking', {
      metric: queueDepthMetric,
      targetValue: 5,  // Target: 5 pending jobs per worker
      scaleInCooldown: cdk.Duration.minutes(5),   // Wait 5 min before scaling down
      scaleOutCooldown: cdk.Duration.seconds(60),  // Wait 60s before scaling up again
    });

    // CloudWatch Dashboard
    const dashboard = new cloudwatch.Dashboard(this, 'WorkerDashboard', {
      dashboardName: 'EasyClaw-Workers',
    });

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Pending Jobs',
        left: [queueDepthMetric],
        width: 12,
      }),
      new cloudwatch.GraphWidget({
        title: 'Running Workers',
        left: [
          new cloudwatch.Metric({
            namespace: 'AWS/ECS',
            metricName: 'RunningTaskCount',
            dimensionsMap: {
              ServiceName: service.serviceName,
              ClusterName: cluster.clusterName,
            },
            statistic: 'Average',
          }),
        ],
        width: 12,
      }),
    );

    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Jobs per Worker',
        left: [
          new cloudwatch.MathExpression({
            expression: 'IF(m2 > 0, m1 / m2, 0)',
            usingMetrics: {
              m1: queueDepthMetric,
              m2: new cloudwatch.Metric({
                namespace: 'AWS/ECS',
                metricName: 'RunningTaskCount',
                dimensionsMap: {
                  ServiceName: service.serviceName,
                  ClusterName: cluster.clusterName,
                },
                statistic: 'Average',
              }),
            },
            label: 'Jobs per Worker',
          }),
        ],
        width: 24,
      }),
    );

    // Alarms
    new cloudwatch.Alarm(this, 'HighQueueDepth', {
      metric: queueDepthMetric,
      threshold: 100,
      evaluationPeriods: 2,
      alarmDescription: 'Queue depth exceeds 100 - consider increasing max workers',
      alarmName: 'EasyClaw-High-Queue-Depth',
    });

    // Outputs
    new cdk.CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
      description: 'ECS Cluster Name',
    });

    new cdk.CfnOutput(this, 'ServiceName', {
      value: service.serviceName,
      description: 'ECS Service Name',
    });

    new cdk.CfnOutput(this, 'DashboardURL', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=EasyClaw-Workers`,
      description: 'CloudWatch Dashboard URL',
    });
  }
}
