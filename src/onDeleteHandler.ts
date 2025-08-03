import { DynamoDBStreamHandler } from 'aws-lambda';
import AWS from 'aws-sdk';

const ses = new AWS.SES();
const EMAIL = process.env.NOTIFY_EMAIL || '';

export const handler: DynamoDBStreamHandler = async (event) => {
    for (const record of event.Records) {
        if (record.eventName !== 'REMOVE' || !record.dynamodb?.OldImage) continue;

        const oldImage = AWS.DynamoDB.Converter.unmarshall(record.dynamodb.OldImage);
        const now = Math.floor(Date.now() / 1000);
        const timeInTable = now - (oldImage.timestamp || now);

        const msg = `Object deleted from DynamoDB after ${timeInTable} seconds.\n\nOriginal body:\n${JSON.stringify(oldImage.body, null, 2)}`;

        await ses.sendEmail({
            Destination: {
                ToAddresses: [EMAIL]
            },
            Message: {
                Body: {
                    Text: {
                        Data: msg
                    }},
                Subject: {
                    Data: 'Deleted Invalid JSON Entry'
                },
            },
            Source: EMAIL,
        }).promise();
    }
};
