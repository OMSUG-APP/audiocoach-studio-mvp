#!/bin/bash

# Configuration
PROJECT_ID=$(gcloud config get-value project)
REGION="europe-west2"
REPOSITORY="sequencer-studio-repo"
SERVICE_NAME="sequencer-studio"

echo "Setting up GCP infrastructure for $PROJECT_ID in $REGION..."

# Enable required APIs
gcloud services enable artifactregistry.googleapis.com \
                       run.googleapis.com \
                       iam.googleapis.com

# Create Artifact Registry repository
gcloud artifacts repositories create $REPOSITORY \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for Sequencer Studio"

# Create a placeholder service (optional, but helps with initial IAM setup)
# We use a public image just to initialize the service
gcloud run deploy $SERVICE_NAME \
    --image=gcr.io/cloudrun/hello \
    --platform=managed \
    --region=$REGION \
    --allow-unauthenticated \
    --quiet

echo "Setup complete!"
echo "Repository: $REGION-docker.pkg.dev/$PROJECT_ID/$REPOSITORY"
echo "Service: $SERVICE_NAME"
