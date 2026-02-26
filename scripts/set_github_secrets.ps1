#!/usr/bin/env pwsh
# Interactive script to set GitHub repository secrets for Photo_app using gh CLI.
# Usage: run this locally where you have `gh` authenticated (gh auth login).

$repo = "luke7628/Photo_app"

function Require-Gh {
  if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Error "gh CLI not found. Install GitHub CLI and authenticate (https://cli.github.com/)."
    exit 1
  }
}

Require-Gh

Write-Host "Setting secrets for repository: $repo" -ForegroundColor Cyan

$endpoint = Read-Host "Enter AZURE_ENDPOINT (e.g. https://my-cv-account.cognitiveservices.azure.com)"
gh secret set AZURE_ENDPOINT --body $endpoint --repo $repo

$key = Read-Host "Enter AZURE_KEY (will be stored as a secret)"
gh secret set AZURE_KEY --body $key --repo $repo

$rg = Read-Host "Enter AZURE_RG (resource group name for App Service, optional) (press Enter to skip)"
if ($rg -ne "") { gh secret set AZURE_RG --body $rg --repo $repo }

$webapp = Read-Host "Enter AZURE_WEBAPP (App Service name, optional) (press Enter to skip)"
if ($webapp -ne "") { gh secret set AZURE_WEBAPP --body $webapp --repo $repo }

Write-Host "If you use the azure/login@v1 action, you also need a service principal JSON in 'AZURE_CREDENTIALS'." -ForegroundColor Yellow
Write-Host "Create a service principal JSON locally with: az ad sp create-for-rbac --name 'gh-deploy' --role contributor --scopes /subscriptions/<SUBSCRIPTION_ID> --sdk-auth" -ForegroundColor Gray

$creds = Read-Host "Paste AZURE_CREDENTIALS JSON here (or press Enter to skip)"
if ($creds -ne "") { gh secret set AZURE_CREDENTIALS --body $creds --repo $repo }

Write-Host "Secrets set (where provided). Verify in GitHub -> Settings -> Secrets and variables -> Actions." -ForegroundColor Green
