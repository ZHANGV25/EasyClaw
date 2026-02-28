#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BackendStack } from '../../backend/lib/backend-stack';
import { WorkerStack } from '../lib/worker-stack';
import { MetricsStack } from '../lib/metrics-stack';

const app = new cdk.App();

// Environment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

const databaseUrl = process.env.DATABASE_URL || '';
const s3Bucket = process.env.S3_BUCKET || 'easyclaw-state';
const vpcId = process.env.VPC_ID || '';
const dbSecurityGroupId = process.env.DB_SECURITY_GROUP_ID || '';

// Backend Stack (VPC, RDS, API Gateway, Lambda functions, S3)
// This includes both the original backend API and the job queue API
const backendStack = new BackendStack(app, 'EasyClaw-Backend-Stack', {
  env,
  description: 'EasyClaw Backend Infrastructure (API, DB, Storage)',
  databaseUrl,
});

// Metrics Stack (Lambda for publishing queue metrics)
const metricsStack = new MetricsStack(app, 'EasyClaw-Metrics-Stack', {
  env,
  description: 'EasyClaw Metrics Publisher Lambda',
});

// Worker Stack (ECS Fargate with auto-scaling)
const workerStack = new WorkerStack(app, 'EasyClaw-Worker-Stack', {
  env,
  description: 'EasyClaw Worker Pool with Auto-Scaling',
  databaseUrl,
  s3Bucket,
  vpcId,
  dbSecurityGroupId,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
});

app.synth();
