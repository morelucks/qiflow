import { Router } from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Request, Response } from 'express';

const router = Router();

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Serve the raw OpenAPI YAML spec ──────────────────────────────────────────
router.get('/openapi.yaml', (_req: Request, res: Response) => {
  try {
    const specPath = join(__dirname, '../openapi.yaml');
    const yaml = readFileSync(specPath, 'utf-8');
    res.setHeader('Content-Type', 'text/yaml; charset=utf-8');
    res.send(yaml);
  } catch {
    res.status(500).json({ error: 'Could not load OpenAPI spec' });
  }
});

// ── Serve Swagger UI (loads spec from /docs/openapi.yaml) ────────────────────
router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>QiFlow API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css" />
  <style>
    body { margin: 0; background: #fafafa; }
    .topbar { background: #1a1a2e !important; }
    .topbar-wrapper img { content: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 20"><text y="15" font-family="monospace" font-weight="bold" font-size="16" fill="white">QiFlow</text></svg>'); }
    .swagger-ui .topbar .download-url-wrapper { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-standalone-preset.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/docs/openapi.yaml',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIStandalonePreset],
      layout: 'StandaloneLayout',
      deepLinking: true,
      tryItOutEnabled: true,
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
    });
  </script>
</body>
</html>`);
});

export default router;
