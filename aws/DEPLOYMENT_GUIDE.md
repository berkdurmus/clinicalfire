# 🚀 Clinical FIRE - AWS Deployment Guide


## 📋 Prerequisites

Before starting, ensure you have:

1. **AWS Account** with administrative access
2. **AWS CLI** installed and configured
3. **Node.js 18+** installed
4. **Git** for version control

### Step 1: Configure AWS CLI

```bash
# Configure your AWS credentials
aws configure

# Verify configuration
aws sts get-caller-identity
```

Expected output:
```json
{
    "UserId": "AIDACKCEVSQ6C2EXAMPLE",
    "Account": "123456789012",
    "Arn": "arn:aws:iam::123456789012:user/your-username"
}
```

## 🏗️ Infrastructure Deployment

### Step 2: Deploy AWS Infrastructure

```bash
# Navigate to aws directory
cd aws

# Make deployment scripts executable
chmod +x deploy.sh deploy-functions.sh

# Deploy infrastructure (takes 5-10 minutes)
./deploy.sh
```

This will create:
- ✅ **Cognito User Pool** for authentication
- ✅ **DynamoDB Tables** for data storage
- ✅ **API Gateway** with REST endpoints
- ✅ **Lambda Functions** for serverless compute
- ✅ **SQS Queues** for event processing
- ✅ **IAM Roles** with proper permissions

### Expected Output:

```
🏥 Clinical FIRE - AWS Deployment
==================================
✅ AWS CLI configured
🔍 Validating CloudFormation template...
✅ Template is valid
🚀 Creating new stack...
⏳ Waiting for stack creation to complete...
📋 Stack Outputs:
---------------------------------------------------------
|                    DescribeStacks                      |
+---------------------------+----------------------------+
|  ApiGatewayUrl           | https://abc123.execute-api. |
|                          | us-east-1.amazonaws.com/dev |
|  UserPoolClientId        | 2example23456789           |
|  UserPoolId              | us-east-1_EXAMPLE123       |
|  WorkflowEventQueueUrl   | https://sqs.us-east-1.     |
|                          | amazonaws.com/123456789012 |
|                          | /clinical-fire-dev-        |
|                          | workflow-events            |
+---------------------------+----------------------------+
✅ Deployment complete!
🌐 API URL: https://abc123.execute-api.us-east-1.amazonaws.com/dev
📝 Environment variables saved to .env.aws
```

### Step 3: Deploy Lambda Functions

```bash
# Deploy Lambda function code
./deploy-functions.sh
```

This updates Lambda functions with actual healthcare workflow logic.

### Expected Output:

```
🚀 Deploying Lambda Functions
================================
📦 Building Lambda packages...
🏥 Deploying Health Function...
✅ Health function deployed
🎉 All Lambda functions deployed successfully!
```

## 🌐 Frontend Configuration

### Step 4: Configure Frontend Environment

```bash
# Copy AWS configuration to frontend
cp .env.aws ../packages/web/.env.local

# Navigate to web package
cd ../packages/web

# Install dependencies (if not already done)
npm install

# Verify environment variables
cat .env.local
```

Expected `.env.local` content:
```bash
# AWS Configuration for Clinical FIRE
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/dev
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_USER_POOL_ID=us-east-1_EXAMPLE123
NEXT_PUBLIC_USER_POOL_CLIENT_ID=2example23456789
NEXT_PUBLIC_ENVIRONMENT=dev
```

### Step 5: Build and Test Frontend

```bash
# Build the frontend
npm run build

# Start development server
npm run dev
```

Your app will be available at `http://localhost:3000`

## 🧪 Testing Your Deployment

### Step 6: Test API Health

```bash
# Test the health endpoint
curl https://your-api-gateway-url.amazonaws.com/dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "service": "clinical-fire",
  "version": "1.0.0"
}
```

### Step 7: Create Test User

Use the registration form or AWS Cognito Console:

```bash
# Via AWS CLI (optional)
aws cognito-idp admin-create-user \
  --user-pool-id us-east-1_EXAMPLE123 \
  --username "doctor@hospital.com" \
  --user-attributes Name=email,Value="doctor@hospital.com" \
                   Name=given_name,Value="Dr. Jane" \
                   Name=family_name,Value="Smith" \
                   Name=custom:role,Value="DOCTOR" \
                   Name=custom:department,Value="CARDIOLOGY" \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS
```

### Step 8: Test Complete Workflow

1. **Login** at `http://localhost:3000`
2. **Create Workflow**: Test the "Create Workflow" functionality
3. **Trigger Workflow**: Test the "Trigger Workflow" functionality
4. **View Results**: Check execution history and logs

## 📊 Monitoring & Observability

### CloudWatch Dashboards

Access via AWS Console → CloudWatch → Dashboards

Key metrics to monitor:
- **API Gateway**: Request count, latency, errors
- **Lambda**: Invocations, duration, errors
- **DynamoDB**: Read/write capacity, throttles
- **Cognito**: Sign-ins, registration

### Viewing Logs

```bash
# View Lambda function logs
aws logs tail /aws/lambda/clinical-fire-dev-workflows --follow

# View API Gateway logs
aws logs tail API-Gateway-Execution-Logs_abc123/dev --follow

# View all CloudWatch log groups
aws logs describe-log-groups --log-group-name-prefix "/aws/lambda/clinical-fire"
```

## 🚀 Production Deployment

### Optional: Deploy to Production Environment

```bash
# Deploy production stack
ENVIRONMENT=prod ./deploy.sh

# Deploy production functions
ENVIRONMENT=prod ./deploy-functions.sh
```

### Frontend Production Deployment with Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

## 🔧 Customization Options

### Environment Variables

Edit `packages/web/.env.local`:

```bash
# Custom API endpoint
NEXT_PUBLIC_API_URL=https://your-custom-domain.com/api

# Enable debug logging
NEXT_PUBLIC_DEBUG=true

# Custom session timeout (milliseconds)
NEXT_PUBLIC_SESSION_TIMEOUT=1800000  # 30 minutes
```

### Lambda Function Customization

Update Lambda functions in `packages/lambda/`:

```bash
# Edit workflow logic
vim packages/lambda/workflows/index.js

# Redeploy specific function
aws lambda update-function-code \
  --function-name clinical-fire-dev-workflows \
  --zip-file fileb://path/to/new-code.zip
```

### Database Schema Changes

Modify DynamoDB structure in `aws/cloudformation/main.yaml`:

```yaml
# Add new table
NewTable:
  Type: AWS::DynamoDB::Table
  Properties:
    TableName: !Sub '${ProjectName}-${Environment}-new-table'
    # ... table configuration
```

## 🐛 Troubleshooting

### Common Issues

#### 1. CloudFormation Stack Creation Failed

```bash
# Check stack events
aws cloudformation describe-stack-events --stack-name clinical-fire-dev

# Common fixes:
# - Verify IAM permissions
# - Check resource limits
# - Ensure unique resource names
```

#### 2. Lambda Function Cold Starts

```bash
# Warm up functions
curl https://your-api.amazonaws.com/dev/health
curl https://your-api.amazonaws.com/dev/workflows
```

#### 3. Cognito Authentication Issues

```bash
# Check user pool configuration
aws cognito-idp describe-user-pool --user-pool-id us-east-1_EXAMPLE123

# Reset user password
aws cognito-idp admin-set-user-password \
  --user-pool-id us-east-1_EXAMPLE123 \
  --username "user@example.com" \
  --password "NewPassword123!" \
  --permanent
```

#### 4. CORS Issues

- Ensure Lambda functions return proper CORS headers
- Check API Gateway CORS configuration
- Verify frontend is hitting correct API endpoints

### Performance Optimization

#### DynamoDB Optimization

```bash
# Enable DynamoDB auto-scaling
aws application-autoscaling register-scalable-target \
  --service-namespace dynamodb \
  --resource-id table/clinical-fire-dev-workflows \
  --scalable-dimension dynamodb:table:ReadCapacityUnits \
  --min-capacity 5 \
  --max-capacity 100
```

#### Lambda Optimization

```javascript
// Optimize Lambda cold starts
const AWS = require('aws-sdk');

// Initialize outside handler
const dynamoDB = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event) => {
  // Handler logic
};
```

## 📞 Support & Next Steps

### Getting Help

1. **AWS Support**: Use AWS Console support center
2. **CloudWatch Logs**: Check function logs for errors
3. **AWS Documentation**: Reference AWS service docs
4. **Community**: AWS forums and Stack Overflow

### Next Steps

1. **Setup CI/CD**: GitHub Actions deployment pipeline
2. **Add Monitoring**: CloudWatch alarms and SNS notifications
3. **Security Hardening**: WAF, VPC, security scanning
4. **Data Backup**: Automated DynamoDB backups
5. **Load Testing**: Ensure system handles expected load

---

🎉 **Congratulations!** You've successfully deployed Clinical FIRE on AWS serverless infrastructure!

Your healthcare workflow automation platform is now:
- ✅ **Scalable**: Auto-scales with demand
- ✅ **Secure**: HIPAA-compliant with Cognito auth
- ✅ **Cost-Effective**: Pay only for what you use
- ✅ **Reliable**: Multi-AZ deployment with DynamoDB
- ✅ **Observable**: CloudWatch monitoring and logging

**Happy automating healthcare workflows! 🏥⚡** 