# Notification Handler Module

This module is a JavaScript/TypeScript implementation of a webhook-based notification handler. It is designed to receive notifications for transaction and payout events, as well as end-of-day reports, and reconcile them against existing transaction records.

## Requirements

The module must be able to:

- Receive webhooks for transaction notifications
  - The notification data must include a date, amount, merchant identifier, transaction identifier, and transaction type (AUTH, REFUND, DISPUTE).
- Receive webhooks for payout notifications
  - The notification data must include a date, partial amount (splits), transaction ID, merchant ID, split ID (seller part, fee part 1, fee part 2), and destination account (merchant or valpay).
  - Each split will have an independent notification.
  - Payout notifications will contain partial amounts of the original transactions, including a fixed fee and a percentage fee.
- Receive webhooks for end-of-day reports to reconcile transactions.
  - Each report row contains all the information from all the notifications combined (CSV format).
- Create a transaction record combining the notification information from both webhooks and store the history of the transaction mutation.
- Reconcile the transactions against the CSV.
- Create a reports record for each report received.

## Implementation

The module is implemented using an Express.js server and Mongoose for MongoDB. It consists of three separate handlers for each type of notification: `TransactionNotificationHandler`, `PayoutNotificationHandler`, and `EndOfDayReportHandler`. Each handler is responsible for receiving and processing its respective type of notification.

### TransactionNotificationHandler

The `TransactionNotificationHandler` receives webhooks for transaction notifications and creates or updates transaction records in the database. If a transaction record already exists, the handler updates it with the new information and adds the mutation to the transaction's mutation history.

### PayoutNotificationHandler

The `PayoutNotificationHandler` receives webhooks for payout notifications and calculates the payout splits based on the original transaction amount, fixed fee, and percentage fee. It then creates a payout record in the database with the split information and fee details.

### EndOfDayReportHandler

The `EndOfDayReportHandler` receives webhooks for end-of-day reports and reconciles the transactions against the CSV data. It retrieves all transactions for the specified merchant and date range and compares them to the transaction totals in the CSV. If the totals match, the handler creates a report record in the database.

## Models

The module defines three Mongoose models for storing data in the database: `Transaction`, `Payout`, and `Report`. Each model has its own schema definition and is responsible for storing data related to its respective type of notification.

## Usage

To use the module, simply run the `app.ts` file with Node.js. The server will listen on port 3000 by default. You can then send webhooks to the appropriate endpoint (`/transaction`, `/payout`, or `/report`) with the necessary data to trigger the corresponding handler.

## Conclusion

The Notification Handler Module provides a robust and scalable solution for handling webhook-based notifications for transaction and payout events. It allows for easy creation and updating of transaction and payout records in the database, as well as reconciliation against end-of-day reports. The module can be easily integrated into any Express.js application and customized to fit specific business requirements.

---

## AWS Proposed Architecture

1. Serverless Architecture:
In this architecture, we can use AWS Lambda and other serverless services to handle the notification handler and MongoDB connection.
Since we are dealing with event driven architecture, a better approach to deploy our application is using Serverless architecture.

- API Gateway: We need to create an api gateway to expose the webhooks and rest endpoints.

- Lambda Functions: We need to create lambda function which will be responsible for handeling webhooks.

- MongoDB Atlas: We can use online MongoDb Atlas for no sql database.

- EventBridge: Configure EventBridge rules to trigger the respective Lambda function when a webhook is received through the API Gateway.

- CloudWatch: we can use cloud watch to enable logs for the lambda functions and be able to monitor the system.

---

2. Containerized Architecture:
We can also use containerized architecture for the above app.
in this architecture, our application needs to be containarized and deployed to kubernetes

- ECS Cluster: will be needed to run the containeriazed application.

- Docker Containers: which will contain our webhooks and mongodb

- AWS Fargate: Aws faragate will be used as a compute engine for running our containers without managing the underlying infrastructure.

- Load Balancer: will be needed inorder to distribute requests to containers (Application Load Balancer ALB)

- Amazon RDS: To host our database

- Auto Scaling: inorder to scale our ECS cluster based on demand.

- CloudWatch: will be used for monitoring our AWS Services

---

## Serverless architecture yml samples

#### Configuring Lambda functions

```html
AWSTemplateFormatVersion: '2010-09-09'
Transform: 'AWS::Serverless-2016-10-31'

Resources:
  LambdaFunction:
    Type: 'AWS::Serverless::Function'
    Properties:
      Handler: app.handler
      Runtime: nodejs12.x
      CodeUri: .
      Timeout: 30
      Events:
        TransactionApi:
          Type: Api
          Properties:
            Path: /transaction
            Method: POST
        PayoutApi:
          Type: Api
          Properties:
            Path: /payout
            Method: POST
        ReportApi:
          Type: Api
          Properties:
            Path: /report
            Method: POST
      Environment:
        Variables:
          MONGODB_URI: mongodb://mongo-db-url
```

#### AWS Gateway
```html
  ApiGatewayRestApi:
    Type: 'AWS::Serverless::Api'
    Properties:
      StageName: prod

Outputs:
  ApiUrl:
    Value: !Sub 'https://${ApiGatewayRestApi}.execute-api.${AWS::Region}.amazonaws.com/prod'


```

#### Configuring I AM

```html
Resources:
  MyIAMRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: MyRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: apigateway.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: MyPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: lambda:InvokeFunction
                Resource: "arn:aws:lambda:<AWS_REGION>:<AWS_ACCOUNT_ID>:function:<LAMBDA_FUNCTION_NAME>"

```

#### configuring AWS Event bridge

```html
Resources:
  MyEventBridgeRule:
    Type: AWS::Events::Rule
    Properties:
      Name: MyEventBridgeRule
      Description: Rule to trigger Lambda function when webhook is received
      EventPattern:
        source:
          - aws.apigateway
        detail-type:
          - AWS API Call via CloudTrail
        detail:
          eventName:
            - CreateRestApi
            - DeleteRestApi
      State: ENABLED
      Targets:
        - Arn: arn:aws:lambda:<AWS_REGION>:<AWS_ACCOUNT_ID>:function:<LAMBDA_FUNCTION_NAME>
          Id: MyLambdaFunction
          InputTransformer:
            InputPathsMap:
              eventPath: "$.detail.requestParameters.path"
              httpMethod: "$.detail.requestParameters.method"
            InputTemplate: '{"path": <eventPath>, "httpMethod": <httpMethod>}'

```

#### configuring cloud watch

```html
Resources:
  MyLambdaFunction:
    Type: AWS::Lambda::Function
    Properties:
      FunctionName: MyLambdaFunction
      Handler: index.handler
      Runtime: python3.8
      Code:
        S3Bucket: my-lambda-bucket
        S3Key: lambda-function.zip
      Role: !GetAtt MyIAMRole.Arn
      Timeout: 60
      MemorySize: 512
      Environment:
        Variables:
          ENV_VAR_1: value1
          ENV_VAR_2: value2

  MyLambdaLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: /aws/lambda/MyLambdaFunction
      RetentionInDays: 30

  MyLambdaLogStream:
    Type: AWS::Logs::LogStream
    Properties:
      LogGroupName: !Ref MyLambdaLogGroup
      LogStreamName: !Sub '${AWS::StackName}-MyLambdaLogStream'

  MyLambdaLogSubscription:
    Type: AWS::Logs::SubscriptionFilter
    Properties:
      LogGroupName: !Ref MyLambdaLogGroup
      FilterPattern: ""
      DestinationArn: !Ref MyCloudWatchLogsDestination

  MyCloudWatchLogsDestination:
    Type: AWS::Logs::Destination
    Properties:
      DestinationName: MyCloudWatchLogsDestination
      TargetArn: !GetAtt MyCloudWatchLogsRole.Arn

  MyCloudWatchLogsRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: MyCloudWatchLogsRole
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: logs.amazonaws.com
            Action: sts:AssumeRole
      Policies:
        - PolicyName: MyCloudWatchLogsPolicy
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action:
                  - logs:CreateLogGroup
                  - logs:CreateLogStream
                  - logs:PutLogEvents
                Resource: "*"
```