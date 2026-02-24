#!/bin/bash

# Create CloudWatch Dashboard for Learning Copilot

set -e

REGION=${AWS_REGION:-us-east-1}

echo "📊 Creating CloudWatch Dashboard..."

aws cloudwatch put-dashboard \
    --dashboard-name LearningCopilot \
    --region $REGION \
    --dashboard-body '{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Bedrock", "Invocations", { "stat": "Sum" } ]
        ],
        "period": 300,
        "stat": "Sum",
        "region": "'$REGION'",
        "title": "Bedrock Invocations",
        "yAxis": {
          "left": {
            "min": 0
          }
        }
      }
    },
    {
      "type": "metric",
      "properties": {
        "metrics": [
          [ "AWS/Bedrock", "InvocationLatency", { "stat": "Average" } ]
        ],
        "period": 300,
        "stat": "Average",
        "region": "'$REGION'",
        "title": "Average Latency (ms)",
        "yAxis": {
          "left": {
            "min": 0
          }
        }
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '\''/learning-copilot/api'\'' | fields @timestamp, userId, mode, modelUsed, latency | sort @timestamp desc | limit 20",
        "region": "'$REGION'",
        "title": "Recent Interactions",
        "stacked": false
      }
    },
    {
      "type": "log",
      "properties": {
        "query": "SOURCE '\''/learning-copilot/api'\'' | filter fallbackTriggered = true | stats count() by modelUsed",
        "region": "'$REGION'",
        "title": "Fallback Count by Model",
        "stacked": false
      }
    }
  ]
}'

echo "✅ Dashboard created: https://console.aws.amazon.com/cloudwatch/home?region=$REGION#dashboards:name=LearningCopilot"
