#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const backend_stack_1 = require("../../backend/lib/backend-stack");
const worker_stack_1 = require("../lib/worker-stack");
const metrics_stack_1 = require("../lib/metrics-stack");
const app = new cdk.App();
// Environment
const env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};
const databaseUrl = process.env.DATABASE_URL || '';
const s3Bucket = process.env.S3_BUCKET || 'easyclaw-state';
// Backend Stack (VPC, RDS, API Gateway, Lambda functions, S3)
// This includes both the original backend API and the job queue API
const backendStack = new backend_stack_1.BackendStack(app, 'EasyClaw-Backend-Stack', {
    env,
    description: 'EasyClaw Backend Infrastructure (API, DB, Storage)',
    databaseUrl,
});
// Metrics Stack (Lambda for publishing queue metrics)
const metricsStack = new metrics_stack_1.MetricsStack(app, 'EasyClaw-Metrics-Stack', {
    env,
    description: 'EasyClaw Metrics Publisher Lambda',
});
// Worker Stack (ECS Fargate with auto-scaling)
const workerStack = new worker_stack_1.WorkerStack(app, 'EasyClaw-Worker-Stack', {
    env,
    description: 'EasyClaw Worker Pool with Auto-Scaling',
    databaseUrl,
    s3Bucket,
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5mcmEuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmZyYS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFDQSx1Q0FBcUM7QUFDckMsaURBQW1DO0FBQ25DLG1FQUErRDtBQUMvRCxzREFBa0Q7QUFDbEQsd0RBQW9EO0FBRXBELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLGNBQWM7QUFDZCxNQUFNLEdBQUcsR0FBRztJQUNWLE9BQU8sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQjtJQUN4QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxXQUFXO0NBQ3RELENBQUM7QUFFRixNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFlBQVksSUFBSSxFQUFFLENBQUM7QUFDbkQsTUFBTSxRQUFRLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxTQUFTLElBQUksZ0JBQWdCLENBQUM7QUFFM0QsOERBQThEO0FBQzlELG9FQUFvRTtBQUNwRSxNQUFNLFlBQVksR0FBRyxJQUFJLDRCQUFZLENBQUMsR0FBRyxFQUFFLHdCQUF3QixFQUFFO0lBQ25FLEdBQUc7SUFDSCxXQUFXLEVBQUUsb0RBQW9EO0lBQ2pFLFdBQVc7Q0FDWixDQUFDLENBQUM7QUFFSCxzREFBc0Q7QUFDdEQsTUFBTSxZQUFZLEdBQUcsSUFBSSw0QkFBWSxDQUFDLEdBQUcsRUFBRSx3QkFBd0IsRUFBRTtJQUNuRSxHQUFHO0lBQ0gsV0FBVyxFQUFFLG1DQUFtQztDQUNqRCxDQUFDLENBQUM7QUFFSCwrQ0FBK0M7QUFDL0MsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDLEdBQUcsRUFBRSx1QkFBdUIsRUFBRTtJQUNoRSxHQUFHO0lBQ0gsV0FBVyxFQUFFLHdDQUF3QztJQUNyRCxXQUFXO0lBQ1gsUUFBUTtDQUNULENBQUMsQ0FBQztBQUVILEdBQUcsQ0FBQyxLQUFLLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIiMhL3Vzci9iaW4vZW52IG5vZGVcclxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xyXG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgeyBCYWNrZW5kU3RhY2sgfSBmcm9tICcuLi8uLi9iYWNrZW5kL2xpYi9iYWNrZW5kLXN0YWNrJztcclxuaW1wb3J0IHsgV29ya2VyU3RhY2sgfSBmcm9tICcuLi9saWIvd29ya2VyLXN0YWNrJztcclxuaW1wb3J0IHsgTWV0cmljc1N0YWNrIH0gZnJvbSAnLi4vbGliL21ldHJpY3Mtc3RhY2snO1xyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxuXHJcbi8vIEVudmlyb25tZW50XHJcbmNvbnN0IGVudiA9IHtcclxuICBhY2NvdW50OiBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5ULFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG59O1xyXG5cclxuY29uc3QgZGF0YWJhc2VVcmwgPSBwcm9jZXNzLmVudi5EQVRBQkFTRV9VUkwgfHwgJyc7XHJcbmNvbnN0IHMzQnVja2V0ID0gcHJvY2Vzcy5lbnYuUzNfQlVDS0VUIHx8ICdlYXN5Y2xhdy1zdGF0ZSc7XHJcblxyXG4vLyBCYWNrZW5kIFN0YWNrIChWUEMsIFJEUywgQVBJIEdhdGV3YXksIExhbWJkYSBmdW5jdGlvbnMsIFMzKVxyXG4vLyBUaGlzIGluY2x1ZGVzIGJvdGggdGhlIG9yaWdpbmFsIGJhY2tlbmQgQVBJIGFuZCB0aGUgam9iIHF1ZXVlIEFQSVxyXG5jb25zdCBiYWNrZW5kU3RhY2sgPSBuZXcgQmFja2VuZFN0YWNrKGFwcCwgJ0Vhc3lDbGF3LUJhY2tlbmQtU3RhY2snLCB7XHJcbiAgZW52LFxyXG4gIGRlc2NyaXB0aW9uOiAnRWFzeUNsYXcgQmFja2VuZCBJbmZyYXN0cnVjdHVyZSAoQVBJLCBEQiwgU3RvcmFnZSknLFxyXG4gIGRhdGFiYXNlVXJsLFxyXG59KTtcclxuXHJcbi8vIE1ldHJpY3MgU3RhY2sgKExhbWJkYSBmb3IgcHVibGlzaGluZyBxdWV1ZSBtZXRyaWNzKVxyXG5jb25zdCBtZXRyaWNzU3RhY2sgPSBuZXcgTWV0cmljc1N0YWNrKGFwcCwgJ0Vhc3lDbGF3LU1ldHJpY3MtU3RhY2snLCB7XHJcbiAgZW52LFxyXG4gIGRlc2NyaXB0aW9uOiAnRWFzeUNsYXcgTWV0cmljcyBQdWJsaXNoZXIgTGFtYmRhJyxcclxufSk7XHJcblxyXG4vLyBXb3JrZXIgU3RhY2sgKEVDUyBGYXJnYXRlIHdpdGggYXV0by1zY2FsaW5nKVxyXG5jb25zdCB3b3JrZXJTdGFjayA9IG5ldyBXb3JrZXJTdGFjayhhcHAsICdFYXN5Q2xhdy1Xb3JrZXItU3RhY2snLCB7XHJcbiAgZW52LFxyXG4gIGRlc2NyaXB0aW9uOiAnRWFzeUNsYXcgV29ya2VyIFBvb2wgd2l0aCBBdXRvLVNjYWxpbmcnLFxyXG4gIGRhdGFiYXNlVXJsLFxyXG4gIHMzQnVja2V0LFxyXG59KTtcclxuXHJcbmFwcC5zeW50aCgpO1xyXG4iXX0=