import Decimal from 'decimal.js';
import { Parser } from 'expr-eval';

export type JsonRecord = Record<string, unknown>;

const parser = new Parser({
  operators: {
    add: true,
    concatenate: false,
    conditional: false,
    divide: true,
    factorial: true,
    multiply: true,
    power: true,
    remainder: true,
    subtract: true,
    logical: false,
    comparison: false,
    in: false,
    assignment: false,
  },
});

parser.functions = {
  abs: Math.abs,
  acos: Math.acos,
  acosh: Math.acosh,
  asin: Math.asin,
  asinh: Math.asinh,
  atan: Math.atan,
  atan2: Math.atan2,
  atanh: Math.atanh,
  ceil: Math.ceil,
  cos: Math.cos,
  cosh: Math.cosh,
  exp: Math.exp,
  floor: Math.floor,
  hypot: Math.hypot,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  max: Math.max,
  min: Math.min,
  round: Math.round,
  sign: Math.sign,
  sin: Math.sin,
  sinh: Math.sinh,
  sqrt: Math.sqrt,
  tan: Math.tan,
  tanh: Math.tanh,
  trunc: Math.trunc,
};
parser.consts = { pi: Math.PI, e: Math.E, tau: Math.PI * 2 };

export function calculateExpression(expression: string, variables: Record<string, number> = {}): JsonRecord {
  if (expression.length > 2000) throw new Error('Expression is too long (max 2000 characters).');
  const parsed = parser.parse(expression);
  const needed = parsed.variables();
  const missing = needed.filter((name) => !(name in variables));
  if (missing.length) throw new Error(`Missing variables: ${missing.join(', ')}`);
  const result = parsed.evaluate(variables);
  if (typeof result !== 'number' || !Number.isFinite(result)) {
    throw new Error('Expression did not produce a finite number.');
  }
  return { expression, variables, result };
}

export function calculateDecimal(
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'mod' | 'pow' | 'sqrt',
  a: string,
  b?: string,
  precision = 50,
): JsonRecord {
  if (precision < 1 || precision > 200) throw new Error('precision must be between 1 and 200.');
  const D = Decimal.clone({ precision, rounding: Decimal.ROUND_HALF_UP });
  const x = new D(a);
  let value: Decimal;
  switch (operation) {
    case 'add': value = x.plus(new D(requiredB(b))); break;
    case 'subtract': value = x.minus(new D(requiredB(b))); break;
    case 'multiply': value = x.times(new D(requiredB(b))); break;
    case 'divide': value = x.div(new D(requiredB(b))); break;
    case 'mod': value = x.mod(new D(requiredB(b))); break;
    case 'pow': value = x.pow(new D(requiredB(b))); break;
    case 'sqrt': value = x.sqrt(); break;
  }
  if (!value.isFinite()) throw new Error('Decimal calculation did not produce a finite result.');
  return { operation, a, ...(b !== undefined ? { b } : {}), precision, result: value.toString() };
}

function requiredB(b?: string): string {
  if (b === undefined) throw new Error('This operation requires b.');
  return b;
}

type UnitCategory = 'length' | 'mass' | 'time' | 'area' | 'volume' | 'speed' | 'data' | 'temperature';

const factors: Record<Exclude<UnitCategory, 'temperature'>, Record<string, number>> = {
  length: { m: 1, km: 1000, cm: 0.01, mm: 0.001, um: 1e-6, nm: 1e-9, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852 },
  mass: { kg: 1, g: 0.001, mg: 1e-6, ug: 1e-9, lb: 0.45359237, oz: 0.028349523125, stone: 6.35029318, tonne: 1000 },
  time: { s: 1, ms: 0.001, min: 60, h: 3600, day: 86400, week: 604800 },
  area: { m2: 1, km2: 1e6, cm2: 1e-4, mm2: 1e-6, ha: 10000, acre: 4046.8564224, ft2: 0.09290304, in2: 0.00064516 },
  volume: { L: 1, mL: 0.001, m3: 1000, cm3: 0.001, tsp: 0.00492892159375, tbsp: 0.01478676478125, cup: 0.2365882365, floz: 0.0295735295625, pint: 0.473176473, quart: 0.946352946, gallon: 3.785411784 },
  speed: { 'm/s': 1, 'km/h': 1000 / 3600, mph: 1609.344 / 3600, knot: 1852 / 3600, 'ft/s': 0.3048 },
  data: { B: 1, KB: 1e3, MB: 1e6, GB: 1e9, TB: 1e12, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4 },
};

export function listUnits(): JsonRecord {
  return {
    length: Object.keys(factors.length),
    mass: Object.keys(factors.mass),
    time: Object.keys(factors.time),
    area: Object.keys(factors.area),
    volume: Object.keys(factors.volume),
    speed: Object.keys(factors.speed),
    data: Object.keys(factors.data),
    temperature: ['C', 'F', 'K'],
  };
}

export function convertUnits(category: UnitCategory, value: number, from: string, to: string): JsonRecord {
  if (!Number.isFinite(value)) throw new Error('value must be finite.');
  let result: number;
  if (category === 'temperature') {
    const celsius = toCelsius(value, from);
    result = fromCelsius(celsius, to);
  } else {
    const table = factors[category];
    if (!(from in table)) throw new Error(`Unsupported ${category} unit: ${from}`);
    if (!(to in table)) throw new Error(`Unsupported ${category} unit: ${to}`);
    result = value * table[from] / table[to];
  }
  if (!Number.isFinite(result)) throw new Error('Conversion did not produce a finite result.');
  return { category, value, from, to, result };
}

function toCelsius(value: number, unit: string): number {
  if (unit === 'C') return value;
  if (unit === 'F') return (value - 32) * 5 / 9;
  if (unit === 'K') return value - 273.15;
  throw new Error(`Unsupported temperature unit: ${unit}`);
}

function fromCelsius(value: number, unit: string): number {
  if (unit === 'C') return value;
  if (unit === 'F') return value * 9 / 5 + 32;
  if (unit === 'K') return value + 273.15;
  throw new Error(`Unsupported temperature unit: ${unit}`);
}

export function summarizeStatistics(values: number[]): JsonRecord {
  if (!values.length) throw new Error('values must contain at least one number.');
  if (values.length > 100000) throw new Error('Too many values (max 100000).');
  if (values.some((v) => !Number.isFinite(v))) throw new Error('All values must be finite.');
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);
  const mean = sum / n;
  const ss = sorted.reduce((acc, v) => acc + (v - mean) ** 2, 0);
  return {
    count: n,
    sum,
    mean,
    median: percentile(sorted, 0.5),
    min: sorted[0],
    max: sorted[n - 1],
    range: sorted[n - 1] - sorted[0],
    variance_population: ss / n,
    stdev_population: Math.sqrt(ss / n),
    variance_sample: n > 1 ? ss / (n - 1) : null,
    stdev_sample: n > 1 ? Math.sqrt(ss / (n - 1)) : null,
    q1: percentile(sorted, 0.25),
    q3: percentile(sorted, 0.75),
    iqr: percentile(sorted, 0.75) - percentile(sorted, 0.25),
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * p;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  if (lo === hi) return sorted[lo];
  const weight = pos - lo;
  return sorted[lo] * (1 - weight) + sorted[hi] * weight;
}

export function percentage(
  operation: 'percent_of' | 'what_percent' | 'increase' | 'decrease' | 'change',
  x: number,
  y: number,
): JsonRecord {
  let result: number;
  switch (operation) {
    case 'percent_of': result = (x / 100) * y; break;
    case 'what_percent':
      if (y === 0) throw new Error('y cannot be zero for what_percent.');
      result = (x / y) * 100;
      break;
    case 'increase': result = x * (1 + y / 100); break;
    case 'decrease': result = x * (1 - y / 100); break;
    case 'change':
      if (x === 0) throw new Error('x (old value) cannot be zero for change.');
      result = ((y - x) / x) * 100;
      break;
  }
  return { operation, x, y, result };
}

export function finance(
  operation: 'compound_future_value' | 'compound_present_value' | 'loan_payment',
  principal: number,
  annualRatePercent: number,
  years: number,
  periodsPerYear = 12,
): JsonRecord {
  for (const [name, value] of Object.entries({ principal, annualRatePercent, years, periodsPerYear })) {
    if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`);
  }
  if (periodsPerYear <= 0 || !Number.isInteger(periodsPerYear)) throw new Error('periodsPerYear must be a positive integer.');
  if (years < 0) throw new Error('years cannot be negative.');
  const r = annualRatePercent / 100 / periodsPerYear;
  const n = years * periodsPerYear;
  let result: number;
  if (operation === 'compound_future_value') {
    result = principal * (1 + r) ** n;
  } else if (operation === 'compound_present_value') {
    result = principal / ((1 + r) ** n);
  } else {
    if (n <= 0) throw new Error('loan_payment requires years > 0.');
    result = r === 0 ? principal / n : principal * r / (1 - (1 + r) ** -n);
  }
  if (!Number.isFinite(result)) throw new Error('Finance calculation did not produce a finite result.');
  return { operation, principal, annualRatePercent, years, periodsPerYear, result };
}

export function solveRoot(
  expression: string,
  lower: number,
  upper: number,
  tolerance = 1e-10,
  maxIterations = 200,
): JsonRecord {
  if (!(lower < upper)) throw new Error('lower must be less than upper.');
  if (!(tolerance > 0) || !Number.isFinite(tolerance)) throw new Error('tolerance must be positive and finite.');
  if (!Number.isInteger(maxIterations) || maxIterations < 1 || maxIterations > 10000) throw new Error('maxIterations must be an integer between 1 and 10000.');
  const parsed = parser.parse(expression);
  const vars = parsed.variables();
  const unknown = vars.filter((v) => v !== 'x');
  if (unknown.length) throw new Error(`solve_root only supports variable x; found: ${unknown.join(', ')}`);
  const f = (x: number): number => {
    const y = parsed.evaluate({ x });
    if (typeof y !== 'number' || !Number.isFinite(y)) throw new Error(`Expression is not finite at x=${x}.`);
    return y;
  };
  let a = lower;
  let b = upper;
  let fa = f(a);
  let fb = f(b);
  if (fa === 0) return { expression, root: a, f_at_root: 0, iterations: 0, method: 'bisection' };
  if (fb === 0) return { expression, root: b, f_at_root: 0, iterations: 0, method: 'bisection' };
  if (Math.sign(fa) === Math.sign(fb)) throw new Error('f(lower) and f(upper) must have opposite signs for bisection.');
  let mid = (a + b) / 2;
  let fm = f(mid);
  let iterations = 0;
  for (; iterations < maxIterations; iterations++) {
    mid = (a + b) / 2;
    fm = f(mid);
    if (Math.abs(fm) <= tolerance || (b - a) / 2 <= tolerance) break;
    if (Math.sign(fa) === Math.sign(fm)) {
      a = mid;
      fa = fm;
    } else {
      b = mid;
      fb = fm;
    }
  }
  return { expression, root: mid, f_at_root: fm, iterations: iterations + 1, tolerance, method: 'bisection' };
}
