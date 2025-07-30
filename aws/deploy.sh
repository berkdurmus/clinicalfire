#!/bin/bash

# Clinical FIRE - AWS Deployment Script
set -e

# Configuration
STACK_NAME="clinical-fire-dev"
TEMPLATE_FILE="./cloudformation/main.yaml"
REGION="us-east-1"
ENVIRONMENT="dev"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🏥 Clinical FIRE - AWS Deployment${NC}"
echo "=================================="

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo -e "${RED}❌ AWS CLI is not installed. Please install it first.${NC}"
    exit 1
fi

# Check if user is authenticated
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}❌ AWS credentials not configured. Run 'aws configure' first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ AWS CLI configured${NC}"

# Validate CloudFormation template
echo -e "${YELLOW}🔍 Validating CloudFormation template...${NC}"
if aws cloudformation validate-template --template-body file://$TEMPLATE_FILE --region $REGION; then
    echo -e "${GREEN}✅ Template is valid${NC}"
else
    echo -e "${RED}❌ Template validation failed${NC}"
    exit 1
fi

# Check if stack exists
STACK_EXISTS=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION 2>/dev/null || echo "false")

if [ "$STACK_EXISTS" != "false" ]; then
    echo -e "${YELLOW}📦 Stack exists. Updating...${NC}"
    aws cloudformation update-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
    
    echo -e "${YELLOW}⏳ Waiting for stack update to complete...${NC}"
    aws cloudformation wait stack-update-complete --stack-name $STACK_NAME --region $REGION
else
    echo -e "${YELLOW}🚀 Creating new stack...${NC}"
    aws cloudformation create-stack \
        --stack-name $STACK_NAME \
        --template-body file://$TEMPLATE_FILE \
        --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
        --capabilities CAPABILITY_NAMED_IAM \
        --region $REGION
    
    echo -e "${YELLOW}⏳ Waiting for stack creation to complete...${NC}"
    aws cloudformation wait stack-create-complete --stack-name $STACK_NAME --region $REGION
fi

# Get stack outputs
echo -e "${GREEN}📋 Stack Outputs:${NC}"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
    --output table

# Save outputs to .env file for local development
echo -e "${YELLOW}💾 Saving outputs to .env.aws...${NC}"
aws cloudformation describe-stacks \
    --stack-name $STACK_NAME \
    --region $REGION \
    --query 'Stacks[0].Outputs' \
    --output json > aws-outputs.json

# Extract key values
API_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`ApiGatewayUrl`].OutputValue' --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)

# Create .env file for frontend
cat > .env.aws << EOF
# AWS Configuration for Clinical FIRE
NEXT_PUBLIC_API_URL=$API_URL
NEXT_PUBLIC_AWS_REGION=$REGION
NEXT_PUBLIC_USER_POOL_ID=$USER_POOL_ID
NEXT_PUBLIC_USER_POOL_CLIENT_ID=$USER_POOL_CLIENT_ID
NEXT_PUBLIC_ENVIRONMENT=$ENVIRONMENT
EOF

echo -e "${GREEN}✅ Deployment complete!${NC}"
echo -e "${GREEN}🌐 API URL: $API_URL${NC}"
echo -e "${GREEN}📝 Environment variables saved to .env.aws${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Copy .env.aws to packages/web/.env.local"
echo "2. Deploy Lambda functions with: ./deploy-functions.sh"
echo "3. Test the API: curl $API_URL/health" 