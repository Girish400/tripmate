# Jenkins Setup Guide

## Prerequisites
- Jenkins 2.400+ with Pipeline and NodeJS plugins installed
- Node.js 18+ configured as a Jenkins tool named `nodejs-18`
- GitHub repository created and Jenkins has push access

## Credentials to Add (Manage Jenkins → Credentials → Global)

| ID | Type | Value |
|---|---|---|
| `firebase-api-key` | Secret text | Your Firebase API key |
| `firebase-auth-domain` | Secret text | `camp-cbf1d.firebaseapp.com` |
| `firebase-project-id` | Secret text | `camp-cbf1d` |
| `firebase-storage-bucket` | Secret text | `camp-cbf1d.firebasestorage.app` |
| `firebase-msg-sender-id` | Secret text | Your sender ID |
| `firebase-app-id` | Secret text | Your app ID |
| `firebase-measurement-id` | Secret text | Your measurement ID |
| `github-pages-token` | Secret text | GitHub PAT with `repo` scope |

## Create Pipeline Job
1. New Item → Pipeline
2. Under Pipeline → Definition: `Pipeline script from SCM`
3. SCM: Git → Repository URL: your repo URL
4. Script Path: `ci/Jenkinsfile`
5. Save

## GitHub PAT Setup
1. GitHub → Settings → Developer Settings → Personal Access Tokens → Fine-grained
2. Permissions: `Contents: Read and write`
3. Copy token → add as `github-pages-token` credential in Jenkins

## Running the Pipeline
- Trigger manually: Open the job → Build Now
- Auto-trigger: Add a webhook in GitHub repo → Settings → Webhooks → Add webhook → Payload URL: `http://<jenkins-url>/github-webhook/`
