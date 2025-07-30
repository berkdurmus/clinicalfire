#!/bin/bash

# Clinical FIRE - Lambda Functions Deployment
set -e

# Configuration
REGION="us-east-1"
FUNCTIONS_DIR="./lambda-functions"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}🚀 Deploying Lambda Functions${NC}"
echo "================================"

# Create functions directory
mkdir -p $FUNCTIONS_DIR

# Get stack outputs for environment variables
STACK_NAME="clinical-fire-dev"
WORKFLOWS_TABLE=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`WorkflowsTableName`].OutputValue' --output text)
EXECUTIONS_TABLE=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`ExecutionsTableName`].OutputValue' --output text)
USER_POOL_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`UserPoolId`].OutputValue' --output text)
USER_POOL_CLIENT_ID=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`UserPoolClientId`].OutputValue' --output text)
WORKFLOW_QUEUE_URL=$(aws cloudformation describe-stacks --stack-name $STACK_NAME --region $REGION --query 'Stacks[0].Outputs[?OutputKey==`WorkflowEventQueueUrl`].OutputValue' --output text)

echo -e "${YELLOW}📦 Building Lambda packages...${NC}"

# Function to deploy a Lambda function
deploy_function() {
    local FUNCTION_NAME=$1
    local HANDLER_FILE=$2
    
    echo -e "${YELLOW}📦 Deploying $FUNCTION_NAME...${NC}"
    
    # Create function directory
    mkdir -p "$FUNCTIONS_DIR/$FUNCTION_NAME"
    
    # Copy the handler file
    cp "$HANDLER_FILE" "$FUNCTIONS_DIR/$FUNCTION_NAME/index.js"
    
    # Create package.json for dependencies
    cat > "$FUNCTIONS_DIR/$FUNCTION_NAME/package.json" << EOF
{
  "name": "clinical-fire-$FUNCTION_NAME",
  "version": "1.0.0",
  "main": "index.js",
  "dependencies": {
    "aws-sdk": "^2.1490.0",
    "uuid": "^9.0.0"
  }
}
EOF

    # Install dependencies
    cd "$FUNCTIONS_DIR/$FUNCTION_NAME"
    npm install --production
    
    # Create zip file
    zip -r "../$FUNCTION_NAME.zip" .
    cd - > /dev/null
    
    # Update Lambda function
    aws lambda update-function-code \
        --function-name "clinical-fire-dev-$FUNCTION_NAME" \
        --zip-file "fileb://$FUNCTIONS_DIR/$FUNCTION_NAME.zip" \
        --region $REGION
    
    # Update environment variables
    aws lambda update-function-configuration \
        --function-name "clinical-fire-dev-$FUNCTION_NAME" \
        --environment Variables="{
            WORKFLOWS_TABLE='$WORKFLOWS_TABLE',
            EXECUTIONS_TABLE='$EXECUTIONS_TABLE',
            USER_POOL_ID='$USER_POOL_ID',
            USER_POOL_CLIENT_ID='$USER_POOL_CLIENT_ID',
            WORKFLOW_QUEUE_URL='$WORKFLOW_QUEUE_URL',
            AWS_REGION='$REGION'
        }" \
        --region $REGION
    
    echo -e "${GREEN}✅ $FUNCTION_NAME deployed${NC}"
}

# Deploy Health Function (simple, no dependencies)
echo -e "${YELLOW}🏥 Deploying Health Function...${NC}"
mkdir -p "$FUNCTIONS_DIR/health"
cat > "$FUNCTIONS_DIR/health/index.js" << 'EOF'
exports.handler = async (event) => {
    console.log('Health check request:', JSON.stringify(event, null, 2));
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
        },
        body: JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'clinical-fire',
            version: '1.0.0',
            environment: process.env.AWS_LAMBDA_FUNCTION_NAME
        })
    };
};
EOF

cd "$FUNCTIONS_DIR/health"
zip -r "../health.zip" .
cd - > /dev/null

aws lambda update-function-code \
    --function-name "clinical-fire-dev-health" \
    --zip-file "fileb://$FUNCTIONS_DIR/health.zip" \
    --region $REGION

echo -e "${GREEN}✅ Health function deployed${NC}"

echo -e "${GREEN}🎉 All Lambda functions deployed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test health endpoint"
echo "2. Build and deploy workflow and execution functions"
echo "3. Update frontend to use new API Gateway URLs"

# Clean up
rm -rf $FUNCTIONS_DIR 