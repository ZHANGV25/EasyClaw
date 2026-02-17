import { Pool } from 'pg';
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

// We reuse the pool in Lambda execution environment
let pool: Pool | null = null;
const secretsClient = new SecretsManagerClient({});

export async function getDb() {
    if (pool) return pool;

    let dbConfig = {
        host: process.env.DB_HOST,
        user: '',
        password: '',
        database: 'easyclaw',
        port: 5432,
        ssl: { rejectUnauthorized: false } // Required for RDS in some configs
    };

    // If DB_SECRET_ARN is provided, fetch credentials
    if (process.env.DB_SECRET_ARN) {
        try {
            const response = await secretsClient.send(
                new GetSecretValueCommand({ SecretId: process.env.DB_SECRET_ARN })
            );

            if (response.SecretString) {
                const secret = JSON.parse(response.SecretString);
                dbConfig.user = secret.username;
                dbConfig.password = secret.password;
                dbConfig.host = secret.host || dbConfig.host;
                dbConfig.port = secret.port || dbConfig.port;
                dbConfig.database = secret.dbname || dbConfig.database;
            }
        } catch (err) {
            console.error("Failed to fetch DB secret", err);
            // Fallback or re-throw depending on stricter reqs
        }
    }

    pool = new Pool(dbConfig);
    return pool;
}

export async function query(text: string, params?: any[]) {
    const db = await getDb();
    return db.query(text, params);
}
