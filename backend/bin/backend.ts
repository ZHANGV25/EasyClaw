#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { BackendStack } from '../lib/backend-stack';

const app = new cdk.App();
new BackendStack(app, 'EasyClaw-Backend-Stack', {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
  databaseUrl: process.env.DATABASE_URL || '',
});
