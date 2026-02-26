const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
const AZURE_KEY = process.env.AZURE_KEY;

app.post('/api/azure-read', async (req, res) => {
  try {
    if (!AZURE_ENDPOINT || !AZURE_KEY) return res.status(500).json({ error: 'Missing server-side Azure config' });
    const { imageBase64 } = req.body || {};
    if (!imageBase64) return res.status(400).json({ error: 'Missing imageBase64 in body' });

    const b64 = imageBase64.startsWith('data:') ? imageBase64.split(',')[1] : imageBase64;
    const buf = Buffer.from(b64.replace(/\s/g, ''), 'base64');

    const response = await fetch(`${AZURE_ENDPOINT.replace(/\/$/, '')}/vision/v3.2/read/analyze`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': AZURE_KEY,
        'Content-Type': 'application/octet-stream'
      },
      body: buf
    });

    if (!response.ok) return res.status(response.status).send(await response.text());
    const operationUrl = response.headers.get('operation-location');
    if (!operationUrl) return res.status(500).json({ error: 'Missing operation-location from Azure' });

    // Poll for result
    let result = null;
    for (let i = 0; i < 12; i++) {
      await new Promise(r => setTimeout(r, 1000));
      const poll = await fetch(operationUrl, { headers: { 'Ocp-Apim-Subscription-Key': AZURE_KEY } });
      if (!poll.ok) continue;
      const data = await poll.json();
      if (data.status === 'succeeded') {
        const results = (data.analyzeResult?.readResults || [])
          .flatMap(page => (page.barcodes || []).map(b => b.value));
        result = results;
        break;
      }
      if (data.status === 'failed') break;
    }

    if (!result) return res.status(504).json({ error: 'Timeout or no barcodes found' });
    return res.json({ results: result });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy server listening on ${PORT}`));
