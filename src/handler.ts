import { APIGatewayProxyHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

const dynamo = new AWS.DynamoDB.DocumentClient();
const ses = new AWS.SES();

interface InputBody {
    valid: boolean;
    value: number;
    description: string;
    buyer: string;
}

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const tableName = process.env.TABLE_NAME!;
        const email = process.env.NOTIFY_EMAIL!;

        const { valid, value, description, buyer }: InputBody = JSON.parse(event.body || '{}');

        if (typeof valid !== 'boolean' || typeof value !== 'number' || !description || !buyer) {
            throw new Error('Invalid payload structure');
        }

        if (valid) {
            await ses.sendEmail({
                Destination: {
                    ToAddresses: [email]
                },
                Message: {
                    Body: {
                        Text: {
                            Data: JSON.stringify({ value, description, buyer })
                        }
                    },
                    Subject: {
                        Data: 'Valid JSON Received'
                    },
                },
                Source: email,
            }).promise();

            return { statusCode: 200, body: 'Email sent.' };
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const ttl = timestamp + 30 * 60; // 30 minutes

        await dynamo.put({
            TableName: tableName,
            Item: {
                PK: 'INVALID',
                SK: `OBJ#${timestamp}`,
                timestamp,
                ttl,
                body: { valid, value, description, buyer },
            },
        }).promise();

        return {
            statusCode: 202,
            body: 'Invalid JSON stored' };
    } catch (err) {
        console.error('Handler error:', err);
        return {
            statusCode: 400,
            body: 'Bad Request'
        };
    }
};

