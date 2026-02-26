# Photo App - Azure Proxy Server

This simple Express proxy forwards a base64 image to Azure Computer Vision Read API and returns barcode values.

## Local run
1. Install dependencies:

```bash
cd server
npm install
```

2. Set environment variables (example):

```bash
export AZURE_ENDPOINT=https://my-cv-account.cognitiveservices.azure.com
export AZURE_KEY=<your-key>
npm start
```

Or on Windows PowerShell:

```powershell
$env:AZURE_ENDPOINT = 'https://my-cv-account.cognitiveservices.azure.com'
$env:AZURE_KEY = '<your-key>'
node index.js
```

3. The proxy exposes `POST /api/azure-read` which accepts JSON `{ "imageBase64": "data:...base64..." }` and returns `{ "results": ["barcode1", ...] }`.
