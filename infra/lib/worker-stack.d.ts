import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface WorkerStackProps extends cdk.StackProps {
    databaseUrl: string;
    s3Bucket: string;
}
export declare class WorkerStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props: WorkerStackProps);
}
