"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkerStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const ec2 = __importStar(require("aws-cdk-lib/aws-ec2"));
const ecs = __importStar(require("aws-cdk-lib/aws-ecs"));
const logs = __importStar(require("aws-cdk-lib/aws-logs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const cloudwatch = __importStar(require("aws-cdk-lib/aws-cloudwatch"));
class WorkerStack extends cdk.Stack {
    constructor(scope, id, props) {
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
            cpu: 1024, // 1 vCPU
            memoryLimitMiB: 2048, // 2 GB
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
                AWS_REGION: this.region,
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
            desiredCount: 1, // Start with 1 worker
            minHealthyPercent: 100,
            maxHealthyPercent: 200,
            enableExecuteCommand: true, // For debugging
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
            targetValue: 5, // Target: 5 pending jobs per worker
            scaleInCooldown: cdk.Duration.minutes(5), // Wait 5 min before scaling down
            scaleOutCooldown: cdk.Duration.seconds(60), // Wait 60s before scaling up again
        });
        // CloudWatch Dashboard
        const dashboard = new cloudwatch.Dashboard(this, 'WorkerDashboard', {
            dashboardName: 'EasyClaw-Workers',
        });
        dashboard.addWidgets(new cloudwatch.GraphWidget({
            title: 'Pending Jobs',
            left: [queueDepthMetric],
            width: 12,
        }), new cloudwatch.GraphWidget({
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
        }));
        dashboard.addWidgets(new cloudwatch.GraphWidget({
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
        }));
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
exports.WorkerStack = WorkerStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoid29ya2VyLXN0YWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsid29ya2VyLXN0YWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyx5REFBMkM7QUFDM0MseURBQTJDO0FBQzNDLDJEQUE2QztBQUM3Qyx5REFBMkM7QUFFM0MsdUVBQXlEO0FBUXpELE1BQWEsV0FBWSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3hDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBdUI7UUFDL0QsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsa0NBQWtDO1FBQ2xDLE1BQU0sR0FBRyxHQUFHLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDakQsU0FBUyxFQUFFLElBQUk7U0FDaEIsQ0FBQyxDQUFDO1FBRUgsY0FBYztRQUNkLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQ3JELEdBQUc7WUFDSCxXQUFXLEVBQUUsa0JBQWtCO1lBQy9CLDhCQUE4QixFQUFFLElBQUk7U0FDckMsQ0FBQyxDQUFDO1FBRUgsMkRBQTJEO1FBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDNUQsU0FBUyxFQUFFLElBQUksR0FBRyxDQUFDLGdCQUFnQixDQUFDLHlCQUF5QixDQUFDO1lBQzlELGVBQWUsRUFBRTtnQkFDZixHQUFHLENBQUMsYUFBYSxDQUFDLHdCQUF3QixDQUFDLCtDQUErQyxDQUFDO2FBQzVGO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsa0RBQWtEO1FBQ2xELE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQzlDLFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyx5QkFBeUIsQ0FBQztTQUMvRCxDQUFDLENBQUM7UUFFSCxrQkFBa0I7UUFDbEIsUUFBUSxDQUFDLFdBQVcsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDM0MsT0FBTyxFQUFFO2dCQUNQLGNBQWM7Z0JBQ2QsY0FBYztnQkFDZCxpQkFBaUI7YUFDbEI7WUFDRCxTQUFTLEVBQUUsQ0FBQyxnQkFBZ0IsS0FBSyxDQUFDLFFBQVEsSUFBSSxDQUFDO1NBQ2hELENBQUMsQ0FBQyxDQUFDO1FBRUosa0NBQWtDO1FBQ2xDLFFBQVEsQ0FBQyxXQUFXLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQzNDLE9BQU8sRUFBRTtnQkFDUCwwQkFBMEI7YUFDM0I7WUFDRCxTQUFTLEVBQUUsQ0FBQyxHQUFHLENBQUM7U0FDakIsQ0FBQyxDQUFDLENBQUM7UUFFSix1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN6RCxZQUFZLEVBQUUsdUJBQXVCO1lBQ3JDLFNBQVMsRUFBRSxJQUFJLENBQUMsYUFBYSxDQUFDLFFBQVE7WUFDdEMsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTztTQUN6QyxDQUFDLENBQUM7UUFFSCxrQkFBa0I7UUFDbEIsTUFBTSxjQUFjLEdBQUcsSUFBSSxHQUFHLENBQUMscUJBQXFCLENBQUMsSUFBSSxFQUFFLGVBQWUsRUFBRTtZQUMxRSxNQUFNLEVBQUUsaUJBQWlCO1lBQ3pCLEdBQUcsRUFBRSxJQUFJLEVBQUcsU0FBUztZQUNyQixjQUFjLEVBQUUsSUFBSSxFQUFHLE9BQU87WUFDOUIsYUFBYTtZQUNiLFFBQVE7U0FDVCxDQUFDLENBQUM7UUFFSCx1QkFBdUI7UUFDdkIsTUFBTSxTQUFTLEdBQUcsY0FBYyxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUU7WUFDdEQsS0FBSyxFQUFFLEdBQUcsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLFlBQVksRUFBRTtnQkFDaEQsSUFBSSxFQUFFLFlBQVk7YUFDbkIsQ0FBQztZQUNGLE9BQU8sRUFBRSxHQUFHLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQztnQkFDOUIsWUFBWSxFQUFFLFFBQVE7Z0JBQ3RCLFFBQVE7YUFDVCxDQUFDO1lBQ0YsV0FBVyxFQUFFO2dCQUNYLFlBQVksRUFBRSxLQUFLLENBQUMsV0FBVztnQkFDL0IsVUFBVSxFQUFFLElBQUksQ0FBQyxNQUFNO2dCQUN2QixTQUFTLEVBQUUsS0FBSyxDQUFDLFFBQVE7Z0JBQ3pCLGdCQUFnQixFQUFFLE1BQU07YUFDekI7WUFDRCxXQUFXLEVBQUU7Z0JBQ1gsT0FBTyxFQUFFLENBQUMsV0FBVyxFQUFFLDJCQUEyQixDQUFDO2dCQUNuRCxRQUFRLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNsQyxPQUFPLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2dCQUNqQyxPQUFPLEVBQUUsQ0FBQztnQkFDVixXQUFXLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO2FBQ3RDO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsY0FBYztRQUNkLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLGNBQWMsQ0FBQyxJQUFJLEVBQUUsZUFBZSxFQUFFO1lBQzVELE9BQU87WUFDUCxjQUFjO1lBQ2QsV0FBVyxFQUFFLGtCQUFrQjtZQUMvQixZQUFZLEVBQUUsQ0FBQyxFQUFHLHNCQUFzQjtZQUN4QyxpQkFBaUIsRUFBRSxHQUFHO1lBQ3RCLGlCQUFpQixFQUFFLEdBQUc7WUFDdEIsb0JBQW9CLEVBQUUsSUFBSSxFQUFHLGdCQUFnQjtTQUM5QyxDQUFDLENBQUM7UUFFSCwyQ0FBMkM7UUFDM0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7WUFDN0MsU0FBUyxFQUFFLFVBQVU7WUFDckIsVUFBVSxFQUFFLGFBQWE7WUFDekIsU0FBUyxFQUFFLFNBQVM7WUFDcEIsTUFBTSxFQUFFLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztTQUNoQyxDQUFDLENBQUM7UUFFSCxlQUFlO1FBQ2YsTUFBTSxPQUFPLEdBQUcsT0FBTyxDQUFDLGtCQUFrQixDQUFDO1lBQ3pDLFdBQVcsRUFBRSxDQUFDO1lBQ2QsV0FBVyxFQUFFLEVBQUU7U0FDaEIsQ0FBQyxDQUFDO1FBRUgsaUNBQWlDO1FBQ2pDLE9BQU8sQ0FBQyx3QkFBd0IsQ0FBQywwQkFBMEIsRUFBRTtZQUMzRCxNQUFNLEVBQUUsZ0JBQWdCO1lBQ3hCLFdBQVcsRUFBRSxDQUFDLEVBQUcsb0NBQW9DO1lBQ3JELGVBQWUsRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBSSxpQ0FBaUM7WUFDN0UsZ0JBQWdCLEVBQUUsR0FBRyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUcsbUNBQW1DO1NBQ2pGLENBQUMsQ0FBQztRQUVILHVCQUF1QjtRQUN2QixNQUFNLFNBQVMsR0FBRyxJQUFJLFVBQVUsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLGlCQUFpQixFQUFFO1lBQ2xFLGFBQWEsRUFBRSxrQkFBa0I7U0FDbEMsQ0FBQyxDQUFDO1FBRUgsU0FBUyxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxjQUFjO1lBQ3JCLElBQUksRUFBRSxDQUFDLGdCQUFnQixDQUFDO1lBQ3hCLEtBQUssRUFBRSxFQUFFO1NBQ1YsQ0FBQyxFQUNGLElBQUksVUFBVSxDQUFDLFdBQVcsQ0FBQztZQUN6QixLQUFLLEVBQUUsaUJBQWlCO1lBQ3hCLElBQUksRUFBRTtnQkFDSixJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7b0JBQ3BCLFNBQVMsRUFBRSxTQUFTO29CQUNwQixVQUFVLEVBQUUsa0JBQWtCO29CQUM5QixhQUFhLEVBQUU7d0JBQ2IsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO3dCQUNoQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7cUJBQ2pDO29CQUNELFNBQVMsRUFBRSxTQUFTO2lCQUNyQixDQUFDO2FBQ0g7WUFDRCxLQUFLLEVBQUUsRUFBRTtTQUNWLENBQUMsQ0FDSCxDQUFDO1FBRUYsU0FBUyxDQUFDLFVBQVUsQ0FDbEIsSUFBSSxVQUFVLENBQUMsV0FBVyxDQUFDO1lBQ3pCLEtBQUssRUFBRSxpQkFBaUI7WUFDeEIsSUFBSSxFQUFFO2dCQUNKLElBQUksVUFBVSxDQUFDLGNBQWMsQ0FBQztvQkFDNUIsVUFBVSxFQUFFLHdCQUF3QjtvQkFDcEMsWUFBWSxFQUFFO3dCQUNaLEVBQUUsRUFBRSxnQkFBZ0I7d0JBQ3BCLEVBQUUsRUFBRSxJQUFJLFVBQVUsQ0FBQyxNQUFNLENBQUM7NEJBQ3hCLFNBQVMsRUFBRSxTQUFTOzRCQUNwQixVQUFVLEVBQUUsa0JBQWtCOzRCQUM5QixhQUFhLEVBQUU7Z0NBQ2IsV0FBVyxFQUFFLE9BQU8sQ0FBQyxXQUFXO2dDQUNoQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7NkJBQ2pDOzRCQUNELFNBQVMsRUFBRSxTQUFTO3lCQUNyQixDQUFDO3FCQUNIO29CQUNELEtBQUssRUFBRSxpQkFBaUI7aUJBQ3pCLENBQUM7YUFDSDtZQUNELEtBQUssRUFBRSxFQUFFO1NBQ1YsQ0FBQyxDQUNILENBQUM7UUFFRixTQUFTO1FBQ1QsSUFBSSxVQUFVLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMzQyxNQUFNLEVBQUUsZ0JBQWdCO1lBQ3hCLFNBQVMsRUFBRSxHQUFHO1lBQ2QsaUJBQWlCLEVBQUUsQ0FBQztZQUNwQixnQkFBZ0IsRUFBRSwyREFBMkQ7WUFDN0UsU0FBUyxFQUFFLDJCQUEyQjtTQUN2QyxDQUFDLENBQUM7UUFFSCxVQUFVO1FBQ1YsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQzFCLFdBQVcsRUFBRSxrQkFBa0I7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxhQUFhLEVBQUU7WUFDckMsS0FBSyxFQUFFLE9BQU8sQ0FBQyxXQUFXO1lBQzFCLFdBQVcsRUFBRSxrQkFBa0I7U0FDaEMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxjQUFjLEVBQUU7WUFDdEMsS0FBSyxFQUFFLFdBQVcsSUFBSSxDQUFDLE1BQU0sa0RBQWtELElBQUksQ0FBQyxNQUFNLG1DQUFtQztZQUM3SCxXQUFXLEVBQUUsMEJBQTBCO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXRNRCxrQ0FzTUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBlYzIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjMic7XHJcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcclxuaW1wb3J0ICogYXMgbG9ncyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbG9ncyc7XHJcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcclxuaW1wb3J0ICogYXMgYXBwc2NhbGluZyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBwbGljYXRpb25hdXRvc2NhbGluZyc7XHJcbmltcG9ydCAqIGFzIGNsb3Vkd2F0Y2ggZnJvbSAnYXdzLWNkay1saWIvYXdzLWNsb3Vkd2F0Y2gnO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV29ya2VyU3RhY2tQcm9wcyBleHRlbmRzIGNkay5TdGFja1Byb3BzIHtcclxuICBkYXRhYmFzZVVybDogc3RyaW5nO1xyXG4gIHMzQnVja2V0OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBXb3JrZXJTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IFdvcmtlclN0YWNrUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xyXG5cclxuICAgIC8vIFZQQyAodXNlIGRlZmF1bHQgb3IgY3JlYXRlIG5ldylcclxuICAgIGNvbnN0IHZwYyA9IGVjMi5WcGMuZnJvbUxvb2t1cCh0aGlzLCAnRGVmYXVsdFZwYycsIHtcclxuICAgICAgaXNEZWZhdWx0OiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gRUNTIENsdXN0ZXJcclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ1dvcmtlckNsdXN0ZXInLCB7XHJcbiAgICAgIHZwYyxcclxuICAgICAgY2x1c3Rlck5hbWU6ICdlYXN5Y2xhdy13b3JrZXJzJyxcclxuICAgICAgZW5hYmxlRmFyZ2F0ZUNhcGFjaXR5UHJvdmlkZXJzOiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gVGFzayBFeGVjdXRpb24gUm9sZSAoZm9yIEVDUyB0byBwdWxsIGltYWdlcywgd3JpdGUgbG9ncylcclxuICAgIGNvbnN0IGV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUodGhpcywgJ1Rhc2tFeGVjdXRpb25Sb2xlJywge1xyXG4gICAgICBhc3N1bWVkQnk6IG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZWNzLXRhc2tzLmFtYXpvbmF3cy5jb20nKSxcclxuICAgICAgbWFuYWdlZFBvbGljaWVzOiBbXHJcbiAgICAgICAgaWFtLk1hbmFnZWRQb2xpY3kuZnJvbUF3c01hbmFnZWRQb2xpY3lOYW1lKCdzZXJ2aWNlLXJvbGUvQW1hem9uRUNTVGFza0V4ZWN1dGlvblJvbGVQb2xpY3knKSxcclxuICAgICAgXSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgUm9sZSAoZm9yIHdvcmtlciB0byBhY2Nlc3MgUzMsIENsb3VkV2F0Y2gpXHJcbiAgICBjb25zdCB0YXNrUm9sZSA9IG5ldyBpYW0uUm9sZSh0aGlzLCAnVGFza1JvbGUnLCB7XHJcbiAgICAgIGFzc3VtZWRCeTogbmV3IGlhbS5TZXJ2aWNlUHJpbmNpcGFsKCdlY3MtdGFza3MuYW1hem9uYXdzLmNvbScpLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR3JhbnQgUzMgYWNjZXNzXHJcbiAgICB0YXNrUm9sZS5hZGRUb1BvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgIGFjdGlvbnM6IFtcclxuICAgICAgICAnczM6R2V0T2JqZWN0JyxcclxuICAgICAgICAnczM6UHV0T2JqZWN0JyxcclxuICAgICAgICAnczM6RGVsZXRlT2JqZWN0JyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VzOiBbYGFybjphd3M6czM6Ojoke3Byb3BzLnMzQnVja2V0fS8qYF0sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gR3JhbnQgQ2xvdWRXYXRjaCBNZXRyaWNzIGFjY2Vzc1xyXG4gICAgdGFza1JvbGUuYWRkVG9Qb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICBhY3Rpb25zOiBbXHJcbiAgICAgICAgJ2Nsb3Vkd2F0Y2g6UHV0TWV0cmljRGF0YScsXHJcbiAgICAgIF0sXHJcbiAgICAgIHJlc291cmNlczogWycqJ10sXHJcbiAgICB9KSk7XHJcblxyXG4gICAgLy8gQ2xvdWRXYXRjaCBMb2cgR3JvdXBcclxuICAgIGNvbnN0IGxvZ0dyb3VwID0gbmV3IGxvZ3MuTG9nR3JvdXAodGhpcywgJ1dvcmtlckxvZ0dyb3VwJywge1xyXG4gICAgICBsb2dHcm91cE5hbWU6ICcvZWNzL2Vhc3ljbGF3LXdvcmtlcnMnLFxyXG4gICAgICByZXRlbnRpb246IGxvZ3MuUmV0ZW50aW9uRGF5cy5PTkVfV0VFSyxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIFRhc2sgRGVmaW5pdGlvblxyXG4gICAgY29uc3QgdGFza0RlZmluaXRpb24gPSBuZXcgZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbih0aGlzLCAnV29ya2VyVGFza0RlZicsIHtcclxuICAgICAgZmFtaWx5OiAnZWFzeWNsYXctd29ya2VyJyxcclxuICAgICAgY3B1OiAxMDI0LCAgLy8gMSB2Q1BVXHJcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiAyMDQ4LCAgLy8gMiBHQlxyXG4gICAgICBleGVjdXRpb25Sb2xlLFxyXG4gICAgICB0YXNrUm9sZSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENvbnRhaW5lciBEZWZpbml0aW9uXHJcbiAgICBjb25zdCBjb250YWluZXIgPSB0YXNrRGVmaW5pdGlvbi5hZGRDb250YWluZXIoJ3dvcmtlcicsIHtcclxuICAgICAgaW1hZ2U6IGVjcy5Db250YWluZXJJbWFnZS5mcm9tQXNzZXQoJy4uL3dvcmtlcnMnLCB7XHJcbiAgICAgICAgZmlsZTogJ0RvY2tlcmZpbGUnLFxyXG4gICAgICB9KSxcclxuICAgICAgbG9nZ2luZzogZWNzLkxvZ0RyaXZlcnMuYXdzTG9ncyh7XHJcbiAgICAgICAgc3RyZWFtUHJlZml4OiAnd29ya2VyJyxcclxuICAgICAgICBsb2dHcm91cCxcclxuICAgICAgfSksXHJcbiAgICAgIGVudmlyb25tZW50OiB7XHJcbiAgICAgICAgREFUQUJBU0VfVVJMOiBwcm9wcy5kYXRhYmFzZVVybCxcclxuICAgICAgICBBV1NfUkVHSU9OOiB0aGlzLnJlZ2lvbixcclxuICAgICAgICBTM19CVUNLRVQ6IHByb3BzLnMzQnVja2V0LFxyXG4gICAgICAgIFBPTExfSU5URVJWQUxfTVM6ICc1MDAwJyxcclxuICAgICAgfSxcclxuICAgICAgaGVhbHRoQ2hlY2s6IHtcclxuICAgICAgICBjb21tYW5kOiBbJ0NNRC1TSEVMTCcsICdub2RlIC1lIFwicHJvY2Vzcy5leGl0KDApXCInXSxcclxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxyXG4gICAgICAgIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5zZWNvbmRzKDEwKSxcclxuICAgICAgICByZXRyaWVzOiAzLFxyXG4gICAgICAgIHN0YXJ0UGVyaW9kOiBjZGsuRHVyYXRpb24uc2Vjb25kcyg2MCksXHJcbiAgICAgIH0sXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBFQ1MgU2VydmljZVxyXG4gICAgY29uc3Qgc2VydmljZSA9IG5ldyBlY3MuRmFyZ2F0ZVNlcnZpY2UodGhpcywgJ1dvcmtlclNlcnZpY2UnLCB7XHJcbiAgICAgIGNsdXN0ZXIsXHJcbiAgICAgIHRhc2tEZWZpbml0aW9uLFxyXG4gICAgICBzZXJ2aWNlTmFtZTogJ2Vhc3ljbGF3LXdvcmtlcnMnLFxyXG4gICAgICBkZXNpcmVkQ291bnQ6IDEsICAvLyBTdGFydCB3aXRoIDEgd29ya2VyXHJcbiAgICAgIG1pbkhlYWx0aHlQZXJjZW50OiAxMDAsXHJcbiAgICAgIG1heEhlYWx0aHlQZXJjZW50OiAyMDAsXHJcbiAgICAgIGVuYWJsZUV4ZWN1dGVDb21tYW5kOiB0cnVlLCAgLy8gRm9yIGRlYnVnZ2luZ1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQ3VzdG9tIENsb3VkV2F0Y2ggTWV0cmljIGZvciBRdWV1ZSBEZXB0aFxyXG4gICAgY29uc3QgcXVldWVEZXB0aE1ldHJpYyA9IG5ldyBjbG91ZHdhdGNoLk1ldHJpYyh7XHJcbiAgICAgIG5hbWVzcGFjZTogJ0Vhc3lDbGF3JyxcclxuICAgICAgbWV0cmljTmFtZTogJ1BlbmRpbmdKb2JzJyxcclxuICAgICAgc3RhdGlzdGljOiAnQXZlcmFnZScsXHJcbiAgICAgIHBlcmlvZDogY2RrLkR1cmF0aW9uLm1pbnV0ZXMoMSksXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBBdXRvIFNjYWxpbmdcclxuICAgIGNvbnN0IHNjYWxpbmcgPSBzZXJ2aWNlLmF1dG9TY2FsZVRhc2tDb3VudCh7XHJcbiAgICAgIG1pbkNhcGFjaXR5OiAxLFxyXG4gICAgICBtYXhDYXBhY2l0eTogNTAsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBUYXJnZXQgVHJhY2tpbmcgU2NhbGluZyBQb2xpY3lcclxuICAgIHNjYWxpbmcuc2NhbGVUb1RyYWNrQ3VzdG9tTWV0cmljKCdRdWV1ZURlcHRoVGFyZ2V0VHJhY2tpbmcnLCB7XHJcbiAgICAgIG1ldHJpYzogcXVldWVEZXB0aE1ldHJpYyxcclxuICAgICAgdGFyZ2V0VmFsdWU6IDUsICAvLyBUYXJnZXQ6IDUgcGVuZGluZyBqb2JzIHBlciB3b3JrZXJcclxuICAgICAgc2NhbGVJbkNvb2xkb3duOiBjZGsuRHVyYXRpb24ubWludXRlcyg1KSwgICAvLyBXYWl0IDUgbWluIGJlZm9yZSBzY2FsaW5nIGRvd25cclxuICAgICAgc2NhbGVPdXRDb29sZG93bjogY2RrLkR1cmF0aW9uLnNlY29uZHMoNjApLCAgLy8gV2FpdCA2MHMgYmVmb3JlIHNjYWxpbmcgdXAgYWdhaW5cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIENsb3VkV2F0Y2ggRGFzaGJvYXJkXHJcbiAgICBjb25zdCBkYXNoYm9hcmQgPSBuZXcgY2xvdWR3YXRjaC5EYXNoYm9hcmQodGhpcywgJ1dvcmtlckRhc2hib2FyZCcsIHtcclxuICAgICAgZGFzaGJvYXJkTmFtZTogJ0Vhc3lDbGF3LVdvcmtlcnMnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1BlbmRpbmcgSm9icycsXHJcbiAgICAgICAgbGVmdDogW3F1ZXVlRGVwdGhNZXRyaWNdLFxyXG4gICAgICAgIHdpZHRoOiAxMixcclxuICAgICAgfSksXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ1J1bm5pbmcgV29ya2VycycsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWV0cmljKHtcclxuICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VDUycsXHJcbiAgICAgICAgICAgIG1ldHJpY05hbWU6ICdSdW5uaW5nVGFza0NvdW50JyxcclxuICAgICAgICAgICAgZGltZW5zaW9uc01hcDoge1xyXG4gICAgICAgICAgICAgIFNlcnZpY2VOYW1lOiBzZXJ2aWNlLnNlcnZpY2VOYW1lLFxyXG4gICAgICAgICAgICAgIENsdXN0ZXJOYW1lOiBjbHVzdGVyLmNsdXN0ZXJOYW1lLFxyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgIH0pLFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgd2lkdGg6IDEyLFxyXG4gICAgICB9KSxcclxuICAgICk7XHJcblxyXG4gICAgZGFzaGJvYXJkLmFkZFdpZGdldHMoXHJcbiAgICAgIG5ldyBjbG91ZHdhdGNoLkdyYXBoV2lkZ2V0KHtcclxuICAgICAgICB0aXRsZTogJ0pvYnMgcGVyIFdvcmtlcicsXHJcbiAgICAgICAgbGVmdDogW1xyXG4gICAgICAgICAgbmV3IGNsb3Vkd2F0Y2guTWF0aEV4cHJlc3Npb24oe1xyXG4gICAgICAgICAgICBleHByZXNzaW9uOiAnSUYobTIgPiAwLCBtMSAvIG0yLCAwKScsXHJcbiAgICAgICAgICAgIHVzaW5nTWV0cmljczoge1xyXG4gICAgICAgICAgICAgIG0xOiBxdWV1ZURlcHRoTWV0cmljLFxyXG4gICAgICAgICAgICAgIG0yOiBuZXcgY2xvdWR3YXRjaC5NZXRyaWMoe1xyXG4gICAgICAgICAgICAgICAgbmFtZXNwYWNlOiAnQVdTL0VDUycsXHJcbiAgICAgICAgICAgICAgICBtZXRyaWNOYW1lOiAnUnVubmluZ1Rhc2tDb3VudCcsXHJcbiAgICAgICAgICAgICAgICBkaW1lbnNpb25zTWFwOiB7XHJcbiAgICAgICAgICAgICAgICAgIFNlcnZpY2VOYW1lOiBzZXJ2aWNlLnNlcnZpY2VOYW1lLFxyXG4gICAgICAgICAgICAgICAgICBDbHVzdGVyTmFtZTogY2x1c3Rlci5jbHVzdGVyTmFtZSxcclxuICAgICAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgICAgICBzdGF0aXN0aWM6ICdBdmVyYWdlJyxcclxuICAgICAgICAgICAgICB9KSxcclxuICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgbGFiZWw6ICdKb2JzIHBlciBXb3JrZXInLFxyXG4gICAgICAgICAgfSksXHJcbiAgICAgICAgXSxcclxuICAgICAgICB3aWR0aDogMjQsXHJcbiAgICAgIH0pLFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBbGFybXNcclxuICAgIG5ldyBjbG91ZHdhdGNoLkFsYXJtKHRoaXMsICdIaWdoUXVldWVEZXB0aCcsIHtcclxuICAgICAgbWV0cmljOiBxdWV1ZURlcHRoTWV0cmljLFxyXG4gICAgICB0aHJlc2hvbGQ6IDEwMCxcclxuICAgICAgZXZhbHVhdGlvblBlcmlvZHM6IDIsXHJcbiAgICAgIGFsYXJtRGVzY3JpcHRpb246ICdRdWV1ZSBkZXB0aCBleGNlZWRzIDEwMCAtIGNvbnNpZGVyIGluY3JlYXNpbmcgbWF4IHdvcmtlcnMnLFxyXG4gICAgICBhbGFybU5hbWU6ICdFYXN5Q2xhdy1IaWdoLVF1ZXVlLURlcHRoJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIE91dHB1dHNcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdDbHVzdGVyTmFtZScsIHtcclxuICAgICAgdmFsdWU6IGNsdXN0ZXIuY2x1c3Rlck5hbWUsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnRUNTIENsdXN0ZXIgTmFtZScsXHJcbiAgICB9KTtcclxuXHJcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU2VydmljZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiBzZXJ2aWNlLnNlcnZpY2VOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0VDUyBTZXJ2aWNlIE5hbWUnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0Rhc2hib2FyZFVSTCcsIHtcclxuICAgICAgdmFsdWU6IGBodHRwczovLyR7dGhpcy5yZWdpb259LmNvbnNvbGUuYXdzLmFtYXpvbi5jb20vY2xvdWR3YXRjaC9ob21lP3JlZ2lvbj0ke3RoaXMucmVnaW9ufSNkYXNoYm9hcmRzOm5hbWU9RWFzeUNsYXctV29ya2Vyc2AsXHJcbiAgICAgIGRlc2NyaXB0aW9uOiAnQ2xvdWRXYXRjaCBEYXNoYm9hcmQgVVJMJyxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=