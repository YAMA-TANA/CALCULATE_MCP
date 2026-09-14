import { createMcpExpressApp } from '@modelcontextprotocol/express';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler } from '@modelcontextprotocol/server';
import { createCalculateServer } from './server.js';

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';
const allowedHosts = process.env.ALLOWED_HOSTS
  ?.split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const handler = createMcpHandler(() => createCalculateServer());
const nodeHandler = toNodeHandler(handler);
const app = createMcpExpressApp({
  host,
  ...(allowedHosts?.length ? { allowedHosts } : {}),
});

app.get('/health', (_req, res) => {
  res.json({ ok: true, name: 'calculate-mcp', version: '0.1.0' });
});

app.all('/mcp', (req, res) => {
  void nodeHandler(req, res, req.body);
});

const httpServer = app.listen(port, host, () => {
  console.log(`CALCULATE_MCP listening on http://${host}:${port}/mcp`);
});

async function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down.`);
  httpServer.close();
  await handler.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
