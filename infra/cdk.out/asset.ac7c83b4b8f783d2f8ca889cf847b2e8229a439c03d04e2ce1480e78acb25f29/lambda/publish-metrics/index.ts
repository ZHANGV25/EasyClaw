import { CloudWatch } from '@aws-sdk/client-cloudwatch';
import { Client } from 'pg';

const cloudwatch = new CloudWatch({ region: process.env.AWS_REGION });

interface QueueStats {
  pending: number;
  running: number;
  recent_failures: number;
}

export const handler = async (): Promise<void> => {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();

    // Get queue stats
    const result = await client.query<QueueStats>(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'PENDING') as pending,
        COUNT(*) FILTER (WHERE status = 'RUNNING') as running,
        COUNT(*) FILTER (WHERE status = 'FAILED' AND updated_at > NOW() - INTERVAL '5 minutes') as recent_failures
      FROM jobs
    `);

    const stats = result.rows[0];

    console.log('Queue stats:', {
      pending: stats.pending,
      running: stats.running,
      recent_failures: stats.recent_failures,
    });

    // Publish metrics to CloudWatch
    await cloudwatch.putMetricData({
      Namespace: 'EasyClaw',
      MetricData: [
        {
          MetricName: 'PendingJobs',
          Value: Number(stats.pending),
          Unit: 'Count',
          Timestamp: new Date(),
        },
        {
          MetricName: 'RunningJobs',
          Value: Number(stats.running),
          Unit: 'Count',
          Timestamp: new Date(),
        },
        {
          MetricName: 'RecentFailures',
          Value: Number(stats.recent_failures),
          Unit: 'Count',
          Timestamp: new Date(),
        },
      ],
    });

    console.log('Metrics published successfully');
  } catch (error) {
    console.error('Error publishing metrics:', error);
    throw error;
  } finally {
    await client.end();
  }
};
