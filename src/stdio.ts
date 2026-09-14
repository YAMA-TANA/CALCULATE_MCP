import { StdioServerTransport } from '@modelcontextprotocol/server/stdio';
import { createCalculateServer } from './server.js';

const server = createCalculateServer();
const transport = new StdioServerTransport();
await server.connect(transport);
