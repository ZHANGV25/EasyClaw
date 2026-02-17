import { APIGatewayProxyHandler } from 'aws-lambda';
import { query } from '../util/db';
import * as fs from 'fs';
import * as path from 'path';

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const schemaPath = path.join(__dirname, '../schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split statements if needed, or run as one block
        await query(schemaSql);

        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Database initialized successfully" }),
        };
    } catch (err: any) {
        console.error(err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: err.message }),
        };
    }
};
