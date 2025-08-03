import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Stack, StackProps, Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';



export class AwsExamStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const table = new dynamodb.Table(this, 'InvalidJsonTable', {
      partitionKey: {
        name: 'PK',
        type: dynamodb.AttributeType.STRING
      },
      sortKey: {
        name: 'SK',
        type: dynamodb.AttributeType.STRING
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: 'ttl',
      removalPolicy: RemovalPolicy.DESTROY,
      stream: dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
    });

    const notifyEmail = 'yosifyosifov4393@gmail.com';

    const handler = new lambda.Function(this, 'JsonValidatorFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('src'),
      handler: 'src/handler.ts',
      environment: {
        TABLE_NAME: table.tableName,
        NOTIFY_EMAIL: notifyEmail,
        TTL_MINUTES: '1440',
      },
    });

    const onDeleteHandler = new lambda.Function(this, 'DynamoDeleteHandler', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset('src'),
      handler: 'src/onDeleteHandler',
      environment: {
        NOTIFY_EMAIL: notifyEmail,
      },
    });

    table.grantReadWriteData(handler);
    table.grantStreamRead(onDeleteHandler);

    handler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    onDeleteHandler.addToRolePolicy(new iam.PolicyStatement({
      actions: ['ses:SendEmail', 'ses:SendRawEmail'],
      resources: ['*'],
    }));

    onDeleteHandler.addEventSourceMapping('StreamTrigger', {
      eventSourceArn: table.tableStreamArn,
      startingPosition: lambda.StartingPosition.TRIM_HORIZON,
    });

    new apigateway.LambdaRestApi(this, 'Endpoint', {
      handler,
      deployOptions: {
        stageName: 'prod',
      },
    });

  }
}
