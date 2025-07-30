# Clinical FIRE - AWS Serverless Deployment

This directory contains AWS infrastructure and deployment configurations for Clinical FIRE healthcare workflow automation platform.

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐
│   React App     │───▶│ API Gateway  │───▶│ Lambda Functions│
│   (Amplify)     │    │ (REST API)   │    │ (Serverless)    │
└─────────────────┘    └──────────────┘    └─────────────────┘
                              │                      │
                              ▼                      ▼
                       ┌──────────────┐    ┌─────────────────┐
                       │   Cognito    │    │   DynamoDB      │
                       │ (Auth/Users) │    │ (Workflows/Exec)│
                       └──────────────┘    └─────────────────┘
                                                    │
                                                    ▼
                                          ┌─────────────────┐
                                          │      SQS        │
                                          │ (Event Queue)   │
                                          └─────────────────┘
```

## 🚀 Services Used

- **API Gateway**: RESTful API endpoints with Cognito authentication
- **Lambda**: Serverless compute for workflow processing  
- **DynamoDB**: NoSQL database for workflows and executions
- **Cognito**: User authentication and authorization
- **SQS**: Message queuing for reliable event processing
- **CloudFormation**: Infrastructure as Code
- **Amplify**: Frontend hosting and CI/CD
- **CloudWatch**: Monitoring and logging
- **X-Ray**: Distributed tracing

## 📋 Prerequisites

1. **AWS CLI** installed and configured
   ```bash
   aws configure
   ```

2. **Node.js 18+** for Lambda functions

3. **AWS Account** with appropriate permissions:
   - CloudFormation
   - Lambda  
   - API Gateway
   - DynamoDB
   - Cognito
   - SQS
   - IAM

## 🔧 Deployment Steps

### 1. Deploy Infrastructure

```bash
# Make scripts executable
chmod +x deploy.sh deploy-functions.sh

# Deploy AWS infrastructure
./deploy.sh
```

This creates:
- ✅ Cognito User Pool for healthcare professionals
- ✅ DynamoDB tables for workflows/executions  
- ✅ API Gateway with Cognito authentication
- ✅ Lambda functions (placeholder code)
- ✅ SQS queues for event processing
- ✅ IAM roles and permissions

### 2. Deploy Lambda Functions

```bash
# Deploy function code
./deploy-functions.sh
```

### 3. Configure Frontend

```bash
# Copy AWS config to frontend
cp .env.aws packages/web/.env.local

# Update frontend to use Cognito/API Gateway
cd packages/web
npm run build
```

### 4. Deploy Frontend to Amplify

```bash
# Initialize Amplify (one time)
npm install -g @aws-amplify/cli
amplify init

# Deploy frontend
amplify add hosting
amplify publish
```

## 🌐 API Endpoints

After deployment, your API will be available at:
`https://{api-id}.execute-api.us-east-1.amazonaws.com/dev`

### Available Endpoints:

- `GET /health` - Health check (public)
- `POST /workflows` - Create workflow (authenticated)
- `GET /workflows` - List workflows (authenticated)  
- `PUT /workflows/{id}` - Update workflow (authenticated)
- `DELETE /workflows/{id}` - Delete workflow (authenticated)
- `POST /executions` - Trigger workflow (authenticated)
- `GET /executions` - List executions (authenticated)

## 🔐 Authentication

The API uses **AWS Cognito** for authentication:

1. **User Registration**: Healthcare professionals register via Cognito
2. **Login**: Returns JWT tokens (access, ID, refresh)
3. **API Access**: Include `Authorization: Bearer {token}` header
4. **MFA**: Optional multi-factor authentication for sensitive data

### User Attributes:
- Email (required)
- Given Name / Family Name  
- Role: `DOCTOR | NURSE | TECHNICIAN | ADMIN`
- Department: Hospital department

## 📊 Database Schema

### DynamoDB Single-Table Design

#### Workflows Table
```
PK: "WORKFLOW#uuid"
SK: "METADATA"
name: "Critical Lab Alert"
version: "1.0"
enabled: true
triggers: [...]
actions: [...]
createdBy: "user-id"
createdAt: "2024-01-01T00:00:00Z"
```

#### Executions Table  
```
PK: "EXECUTION#uuid"
SK: "METADATA" 
workflowId: "workflow-uuid"
status: "COMPLETED | FAILED | RUNNING"
triggeredBy: "user-id"
startTime: "2024-01-01T00:00:00Z"
duration: 1500
patientId: "patient-123"
```

## 🔧 Environment Variables

The deployment automatically creates these environment variables:

```bash
# API Gateway
NEXT_PUBLIC_API_URL=https://abc123.execute-api.us-east-1.amazonaws.com/dev

# Cognito
NEXT_PUBLIC_USER_POOL_ID=us-east-1_ABC123DEF
NEXT_PUBLIC_USER_POOL_CLIENT_ID=abc123def456ghi789

# AWS
NEXT_PUBLIC_AWS_REGION=us-east-1
NEXT_PUBLIC_ENVIRONMENT=dev
```

## 📈 Monitoring & Observability

### CloudWatch Dashboards
- API Gateway metrics (requests, latency, errors)
- Lambda metrics (invocations, duration, errors)  
- DynamoDB metrics (read/write capacity, throttles)

### X-Ray Tracing
- End-to-end request tracing
- Performance bottleneck identification
- Error analysis

### Logs
- API Gateway access logs
- Lambda function logs  
- CloudFormation deployment logs

## 💰 Cost Optimization

### Serverless Pricing
- **Lambda**: Pay per request (~$0.0000002 per request)
- **DynamoDB**: Pay per read/write (~$0.25 per million reads)
- **API Gateway**: ~$3.50 per million requests
- **Cognito**: 50,000 MAUs free, then $0.0055 per MAU

### Estimated Monthly Costs
- **Small Clinic** (1K workflows/month): ~$5-10
- **Medium Hospital** (10K workflows/month): ~$25-50  
- **Large Health System** (100K workflows/month): ~$100-200

## 🔒 Security & Compliance

### HIPAA Compliance
- ✅ Data encryption at rest (DynamoDB, S3)
- ✅ Data encryption in transit (HTTPS/TLS)
- ✅ Access logging and audit trails
- ✅ Multi-factor authentication
- ✅ Role-based access control

### Security Features
- WAF integration for API protection
- VPC endpoints for private communication
- Least privilege IAM policies
- Regular security scanning

## 🛠️ Development Workflow

### Local Development
```bash
# Run local Express.js API (for development)
npm run api

# Run local React frontend  
npm run web

# Test against AWS backend
NEXT_PUBLIC_API_URL=https://your-api.amazonaws.com/dev npm run web
```

### CI/CD Pipeline
1. **Code Push** → GitHub
2. **Build** → GitHub Actions
3. **Test** → Unit/Integration tests
4. **Deploy** → AWS Lambda + Amplify
5. **Monitor** → CloudWatch alerts

## 🐛 Troubleshooting

### Common Issues

#### 1. CloudFormation Stack Failed
```bash
# Check stack events
aws cloudformation describe-stack-events --stack-name clinical-fire-dev

# Delete and recreate
aws cloudformation delete-stack --stack-name clinical-fire-dev
./deploy.sh
```

#### 2. Lambda Function Errors
```bash
# Check function logs
aws logs tail /aws/lambda/clinical-fire-dev-workflows --follow

# Update function code
./deploy-functions.sh
```

#### 3. API Gateway CORS Issues
- Ensure proper CORS headers in Lambda responses
- Check API Gateway CORS configuration

#### 4. Cognito Authentication Issues
- Verify user pool configuration
- Check JWT token expiration
- Validate user attributes

### Debug Commands
```bash
# Test API health
curl https://your-api.amazonaws.com/dev/health

# Check DynamoDB tables
aws dynamodb scan --table-name clinical-fire-dev-workflows

# Monitor Lambda logs
aws logs tail /aws/lambda/clinical-fire-dev-workflows --follow
```

## 📞 Support

For issues with this AWS deployment:

1. Check CloudWatch logs for errors
2. Review CloudFormation stack events  
3. Verify IAM permissions
4. Check AWS service limits
5. Review this documentation

---

**🏥 Clinical FIRE - Transforming Healthcare Workflows with AWS Serverless Architecture** 