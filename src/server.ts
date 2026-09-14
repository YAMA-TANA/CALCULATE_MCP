import { McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import {
  calculateDecimal,
  calculateExpression,
  convertUnits,
  finance,
  listUnits,
  percentage,
  solveRoot,
  summarizeStatistics,
  type JsonRecord,
} from './calculators.js';

function ok(data: JsonRecord) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
    structuredContent: data,
  };
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    isError: true,
    content: [{ type: 'text' as const, text: message }],
    structuredContent: { error: message },
  };
}

export function createCalculateServer(): McpServer {
  const server = new McpServer({
    name: 'calculate-mcp',
    version: '0.1.0',
  });

  server.registerTool(
    'calculate_expression',
    {
      description: 'Safely evaluate a mathematical expression with optional numeric variables. Supports arithmetic, powers, factorial, trig, logs, sqrt, min/max, pi, e, and tau. Use this instead of mental arithmetic when an exact deterministic numeric answer is needed.',
      inputSchema: z.object({
        expression: z.string().min(1).max(2000).describe('Expression such as "sqrt(2)^2 + sin(pi/2)" or "a*b + c".'),
        variables: z.record(z.string(), z.number().finite()).optional().describe('Numeric values for variables referenced by the expression.'),
      }),
    },
    async ({ expression, variables }) => {
      try { return ok(calculateExpression(expression, variables ?? {})); }
      catch (error) { return fail(error); }
    },
  );

  server.registerTool(
    'calculate_decimal',
    {
      description: 'Perform high-precision decimal arithmetic without IEEE-754 binary floating-point surprises. Inputs are decimal strings and precision can be 1-200 significant digits.',
      inputSchema: z.object({
        operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'mod', 'pow', 'sqrt']),
        a: z.string().min(1).describe('First decimal operand. For sqrt, this is the only operand.'),
        b: z.string().min(1).optional().describe('Second decimal operand when required.'),
        precision: z.number().int().min(1).max(200).optional().default(50),
      }),
    },
    async ({ operation, a, b, precision }) => {
      try { return ok(calculateDecimal(operation, a, b, precision)); }
      catch (error) { return fail(error); }
    },
  );

  server.registerTool(
    'convert_units',
    {
      description: 'Convert between common units of length, mass, time, area, volume, speed, data size, and temperature. Call list_units when unsure which unit symbols are accepted.',
      inputSchema: z.object({
        category: z.enum(['length', 'mass', 'time', 'area', 'volume', 'speed', 'data', 'temperature']),
        value: z.number().finite(),
        from: z.string().min(1),
        to: z.string().min(1),
      }),
    },
    async ({ category, value, from, to }) => {
      try { return ok(convertUnits(category, value, from, to)); }
      catch (error) { return fail(error); }
    },
  );

  server.registerTool(
    'list_units',
    {
      description: 'List every unit symbol accepted by convert_units, grouped by category.',
      inputSchema: z.object({}),
    },
    async () => ok(listUnits()),
  );

  server.registerTool(
    'summarize_statistics',
    {
      description: 'Compute descriptive statistics for a numeric sample: count, sum, mean, median, min/max, range, population/sample variance and standard deviation, quartiles, and IQR.',
      inputSchema: z.object({
        values: z.array(z.number().finite()).min(1).max(100000),
      }),
    },
    async ({ values }) => {
      try { return ok(summarizeStatistics(values)); }
      catch (error) { return fail(error); }
    },
  );

  server.registerTool(
    'calculate_percentage',
    {
      description: 'Calculate common percentage operations. percent_of: x% of y. what_percent: x is what percent of y. increase/decrease: change x by y%. change: percentage change from old x to new y.',
      inputSchema: z.object({
        operation: z.enum(['percent_of', 'what_percent', 'increase', 'decrease', 'change']),
        x: z.number().finite(),
        y: z.number().finite(),
      }),
    },
    async ({ operation, x, y }) => {
      try { return ok(percentage(operation, x, y)); }
      catch (error) { return fail(error); }
    },
  );

  server.registerTool(
    'calculate_finance',
    {
      description: 'Calculate compound future value, compound present value, or periodic loan payment. annualRatePercent is a percentage such as 5 for 5%.',
      inputSchema: z.object({
        operation: z.enum(['compound_future_value', 'compound_present_value', 'loan_payment']),
        principal: z.number().finite(),
        annualRatePercent: z.number().finite(),
        years: z.number().min(0).finite(),
        periodsPerYear: z.number().int().min(1).max(100000).optional().default(12),
      }),
    },
    async ({ operation, principal, annualRatePercent, years, periodsPerYear }) => {
      try { return ok(finance(operation, principal, annualRatePercent, years, periodsPerYear)); }
      catch (error) { return fail(error); }
    },
  );

  server.registerTool(
    'solve_root',
    {
      description: 'Numerically solve f(x)=0 on a bracket [lower, upper] using robust bisection. The function must change sign across the interval. Expression syntax matches calculate_expression and may use only x as a variable.',
      inputSchema: z.object({
        expression: z.string().min(1).max(2000).describe('Function of x, e.g. "x^3 - x - 2".'),
        lower: z.number().finite(),
        upper: z.number().finite(),
        tolerance: z.number().positive().finite().optional().default(1e-10),
        maxIterations: z.number().int().min(1).max(10000).optional().default(200),
      }),
    },
    async ({ expression, lower, upper, tolerance, maxIterations }) => {
      try { return ok(solveRoot(expression, lower, upper, tolerance, maxIterations)); }
      catch (error) { return fail(error); }
    },
  );

  return server;
}
