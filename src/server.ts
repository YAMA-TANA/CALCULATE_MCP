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
import {
  calculateCalculus,
  calculateComplex,
  calculateDate,
  calculateMatrix,
  calculateProbability,
} from './advanced.js';

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
  const server = new McpServer({ name: 'calculate-mcp', version: '0.2.0' });

  server.registerTool('calculate_expression', {
    description: 'Safely evaluate a mathematical expression with optional numeric variables. Supports arithmetic, powers, factorial, trig, logs, sqrt, min/max, pi, e, and tau.',
    inputSchema: z.object({
      expression: z.string().min(1).max(2000),
      variables: z.record(z.string(), z.number().finite()).optional(),
    }),
  }, async ({ expression, variables }) => {
    try { return ok(calculateExpression(expression, variables ?? {})); }
    catch (error) { return fail(error); }
  });

  server.registerTool('calculate_decimal', {
    description: 'Perform high-precision decimal arithmetic without IEEE-754 surprises. Inputs are decimal strings and precision can be 1-200 significant digits.',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'mod', 'pow', 'sqrt']),
      a: z.string().min(1),
      b: z.string().min(1).optional(),
      precision: z.number().int().min(1).max(200).optional().default(50),
    }),
  }, async ({ operation, a, b, precision }) => {
    try { return ok(calculateDecimal(operation, a, b, precision)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('convert_units', {
    description: 'Convert common length, mass, time, area, volume, speed, data-size, and temperature units.',
    inputSchema: z.object({
      category: z.enum(['length', 'mass', 'time', 'area', 'volume', 'speed', 'data', 'temperature']),
      value: z.number().finite(), from: z.string().min(1), to: z.string().min(1),
    }),
  }, async ({ category, value, from, to }) => {
    try { return ok(convertUnits(category, value, from, to)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('list_units', {
    description: 'List every accepted unit symbol, grouped by category.',
    inputSchema: z.object({}),
  }, async () => ok(listUnits()));

  server.registerTool('summarize_statistics', {
    description: 'Compute descriptive statistics: count, sum, mean, median, range, variance, standard deviation, quartiles, and IQR.',
    inputSchema: z.object({ values: z.array(z.number().finite()).min(1).max(100000) }),
  }, async ({ values }) => {
    try { return ok(summarizeStatistics(values)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('calculate_percentage', {
    description: 'Calculate percent-of, what-percent, increase/decrease, and percentage change.',
    inputSchema: z.object({
      operation: z.enum(['percent_of', 'what_percent', 'increase', 'decrease', 'change']),
      x: z.number().finite(), y: z.number().finite(),
    }),
  }, async ({ operation, x, y }) => {
    try { return ok(percentage(operation, x, y)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('calculate_finance', {
    description: 'Calculate compound future/present value or periodic loan payment.',
    inputSchema: z.object({
      operation: z.enum(['compound_future_value', 'compound_present_value', 'loan_payment']),
      principal: z.number().finite(), annualRatePercent: z.number().finite(), years: z.number().min(0).finite(),
      periodsPerYear: z.number().int().min(1).max(100000).optional().default(12),
    }),
  }, async ({ operation, principal, annualRatePercent, years, periodsPerYear }) => {
    try { return ok(finance(operation, principal, annualRatePercent, years, periodsPerYear)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('solve_root', {
    description: 'Numerically solve f(x)=0 on a bracket using robust bisection.',
    inputSchema: z.object({
      expression: z.string().min(1).max(2000), lower: z.number().finite(), upper: z.number().finite(),
      tolerance: z.number().positive().finite().optional().default(1e-10),
      maxIterations: z.number().int().min(1).max(10000).optional().default(200),
    }),
  }, async ({ expression, lower, upper, tolerance, maxIterations }) => {
    try { return ok(solveRoot(expression, lower, upper, tolerance, maxIterations)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('calculate_matrix', {
    description: 'Matrix arithmetic: add, subtract, multiply, transpose, determinant, inverse, and solve Ax=b.',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'transpose', 'determinant', 'inverse', 'solve']),
      a: z.array(z.array(z.number().finite()).min(1)).min(1).max(100),
      b: z.union([z.array(z.array(z.number().finite()).min(1)).min(1), z.array(z.number().finite()).min(1)]).optional(),
    }),
  }, async ({ operation, a, b }) => {
    try { return ok(calculateMatrix(operation, a, b)); }
    catch (error) { return fail(error); }
  });

  const complexSchema = z.object({ re: z.number().finite(), im: z.number().finite() });
  server.registerTool('calculate_complex', {
    description: 'Complex-number arithmetic using {re, im}: add, subtract, multiply, divide, magnitude, argument, conjugate, power, and square root.',
    inputSchema: z.object({
      operation: z.enum(['add', 'subtract', 'multiply', 'divide', 'abs', 'arg', 'conjugate', 'pow', 'sqrt']),
      a: complexSchema, b: complexSchema.optional(),
    }),
  }, async ({ operation, a, b }) => {
    try { return ok(calculateComplex(operation, a, b)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('calculate_calculus', {
    description: 'Numerical calculus for one-variable expressions: five-point numerical derivative or Simpson definite integral.',
    inputSchema: z.object({
      operation: z.enum(['derivative', 'integral']), expression: z.string().min(1).max(2000),
      x: z.number().finite().optional(), lower: z.number().finite().optional(), upper: z.number().finite().optional(),
      step: z.number().positive().finite().optional().default(1e-5),
      intervals: z.number().int().min(2).max(1000000).optional().default(1000),
    }),
  }, async ({ operation, expression, x, lower, upper, step, intervals }) => {
    try { return ok(calculateCalculus(operation, expression, x, lower, upper, step, intervals)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('calculate_probability', {
    description: 'Evaluate normal PDF/CDF, binomial PMF/CDF, or Poisson PMF/CDF.',
    inputSchema: z.object({
      distribution: z.enum(['normal', 'binomial', 'poisson']),
      operation: z.enum(['pdf', 'pmf', 'cdf']),
      params: z.record(z.string(), z.number().finite()).describe('Normal: x, mean?, sd?. Binomial: k,n,p. Poisson: k,lambda.'),
    }),
  }, async ({ distribution, operation, params }) => {
    try { return ok(calculateProbability(distribution, operation, params)); }
    catch (error) { return fail(error); }
  });

  server.registerTool('calculate_date', {
    description: 'Deterministic ISO calendar math in UTC: add days/weeks/months/years, date difference, weekday, or weekday-only business-day count.',
    inputSchema: z.object({
      operation: z.enum(['add', 'difference', 'weekday', 'business_days']),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      otherDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      amount: z.number().int().optional(),
      unit: z.enum(['days', 'weeks', 'months', 'years']).optional().default('days'),
    }),
  }, async ({ operation, date, otherDate, amount, unit }) => {
    try { return ok(calculateDate(operation, date, otherDate, amount, unit)); }
    catch (error) { return fail(error); }
  });

  return server;
}
