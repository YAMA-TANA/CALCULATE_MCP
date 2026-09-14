import { Parser } from 'expr-eval';
import type { JsonRecord } from './calculators.js';

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

type Matrix = number[][];

function validateMatrix(matrix: Matrix, name: string): { rows: number; cols: number } {
  if (!Array.isArray(matrix) || matrix.length === 0) throw new Error(`${name} must be a non-empty 2D array.`);
  if (!Array.isArray(matrix[0]) || matrix[0].length === 0) throw new Error(`${name} rows must be non-empty.`);
  const cols = matrix[0].length;
  if (matrix.length > 100 || cols > 100) throw new Error(`${name} is too large (max 100x100).`);
  for (const row of matrix) {
    if (!Array.isArray(row) || row.length !== cols) throw new Error(`${name} must be rectangular.`);
    if (row.some((v) => !Number.isFinite(v))) throw new Error(`${name} must contain only finite numbers.`);
  }
  return { rows: matrix.length, cols };
}

function requireSquare(matrix: Matrix, name: string): number {
  const { rows, cols } = validateMatrix(matrix, name);
  if (rows !== cols) throw new Error(`${name} must be square.`);
  return rows;
}

function cloneMatrix(matrix: Matrix): Matrix {
  return matrix.map((row) => [...row]);
}

function determinant(matrix: Matrix): number {
  const n = requireSquare(matrix, 'a');
  const m = cloneMatrix(matrix);
  let det = 1;
  let swaps = 0;
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(m[row][col]) > Math.abs(m[pivot][col])) pivot = row;
    }
    if (Math.abs(m[pivot][col]) < 1e-15) return 0;
    if (pivot !== col) {
      [m[pivot], m[col]] = [m[col], m[pivot]];
      swaps++;
    }
    const p = m[col][col];
    det *= p;
    for (let row = col + 1; row < n; row++) {
      const factor = m[row][col] / p;
      for (let j = col + 1; j < n; j++) m[row][j] -= factor * m[col][j];
    }
  }
  return swaps % 2 ? -det : det;
}

function inverse(matrix: Matrix): Matrix {
  const n = requireSquare(matrix, 'a');
  const aug = matrix.map((row, i) => [
    ...row,
    ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0)),
  ]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let row = col + 1; row < n; row++) {
      if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
    }
    if (Math.abs(aug[pivot][col]) < 1e-15) throw new Error('Matrix is singular and has no inverse.');
    [aug[pivot], aug[col]] = [aug[col], aug[pivot]];
    const p = aug[col][col];
    for (let j = 0; j < 2 * n; j++) aug[col][j] /= p;
    for (let row = 0; row < n; row++) {
      if (row === col) continue;
      const factor = aug[row][col];
      for (let j = 0; j < 2 * n; j++) aug[row][j] -= factor * aug[col][j];
    }
  }
  return aug.map((row) => row.slice(n));
}

export function calculateMatrix(
  operation: 'add' | 'subtract' | 'multiply' | 'transpose' | 'determinant' | 'inverse' | 'solve',
  a: Matrix,
  b?: Matrix | number[],
): JsonRecord {
  const ad = validateMatrix(a, 'a');
  if (operation === 'transpose') {
    return { operation, result: Array.from({ length: ad.cols }, (_, c) => a.map((row) => row[c])) };
  }
  if (operation === 'determinant') return { operation, result: determinant(a) };
  if (operation === 'inverse') return { operation, result: inverse(a) };
  if (operation === 'solve') {
    const n = requireSquare(a, 'a');
    if (!Array.isArray(b) || b.length !== n || b.some((v) => Array.isArray(v) || !Number.isFinite(v as number))) {
      throw new Error('For solve, b must be a numeric vector with one value per row of a.');
    }
    const inv = inverse(a);
    const vector = b as number[];
    return { operation, result: inv.map((row) => row.reduce((sum, v, i) => sum + v * vector[i], 0)) };
  }
  if (!Array.isArray(b) || b.length === 0 || !Array.isArray(b[0])) throw new Error(`${operation} requires matrix b.`);
  const bm = b as Matrix;
  const bd = validateMatrix(bm, 'b');
  if (operation === 'add' || operation === 'subtract') {
    if (ad.rows !== bd.rows || ad.cols !== bd.cols) throw new Error('a and b must have the same shape.');
    return {
      operation,
      result: a.map((row, i) => row.map((v, j) => operation === 'add' ? v + bm[i][j] : v - bm[i][j])),
    };
  }
  if (ad.cols !== bd.rows) throw new Error('For multiplication, columns(a) must equal rows(b).');
  const result = Array.from({ length: ad.rows }, (_, i) =>
    Array.from({ length: bd.cols }, (_, j) =>
      a[i].reduce((sum, v, k) => sum + v * bm[k][j], 0),
    ),
  );
  return { operation, result };
}

type Complex = { re: number; im: number };

function validComplex(z: Complex, name: string): Complex {
  if (!Number.isFinite(z.re) || !Number.isFinite(z.im)) throw new Error(`${name} must have finite re and im.`);
  return z;
}

function cmul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

function cpow(base: Complex, exponent: Complex): Complex {
  if (base.re === 0 && base.im === 0) {
    if (exponent.im !== 0 || exponent.re <= 0) throw new Error('0 cannot be raised to this complex exponent.');
    return { re: 0, im: 0 };
  }
  const r = Math.hypot(base.re, base.im);
  const theta = Math.atan2(base.im, base.re);
  const logRe = Math.log(r);
  const x = exponent.re * logRe - exponent.im * theta;
  const y = exponent.im * logRe + exponent.re * theta;
  const mag = Math.exp(x);
  return { re: mag * Math.cos(y), im: mag * Math.sin(y) };
}

export function calculateComplex(
  operation: 'add' | 'subtract' | 'multiply' | 'divide' | 'abs' | 'arg' | 'conjugate' | 'pow' | 'sqrt',
  a: Complex,
  b?: Complex,
): JsonRecord {
  validComplex(a, 'a');
  let result: Complex | number;
  if (operation === 'abs') result = Math.hypot(a.re, a.im);
  else if (operation === 'arg') result = Math.atan2(a.im, a.re);
  else if (operation === 'conjugate') result = { re: a.re, im: -a.im };
  else if (operation === 'sqrt') result = cpow(a, { re: 0.5, im: 0 });
  else {
    if (!b) throw new Error(`${operation} requires b.`);
    validComplex(b, 'b');
    if (operation === 'add') result = { re: a.re + b.re, im: a.im + b.im };
    else if (operation === 'subtract') result = { re: a.re - b.re, im: a.im - b.im };
    else if (operation === 'multiply') result = cmul(a, b);
    else if (operation === 'pow') result = cpow(a, b);
    else {
      const den = b.re ** 2 + b.im ** 2;
      if (den === 0) throw new Error('Cannot divide by zero complex number.');
      result = { re: (a.re * b.re + a.im * b.im) / den, im: (a.im * b.re - a.re * b.im) / den };
    }
  }
  return { operation, a, ...(b ? { b } : {}), result };
}

function oneVariableFunction(expression: string): (x: number) => number {
  if (expression.length > 2000) throw new Error('Expression is too long (max 2000 characters).');
  const parsed = parser.parse(expression);
  const unknown = parsed.variables().filter((v) => v !== 'x');
  if (unknown.length) throw new Error(`Only variable x is supported; found: ${unknown.join(', ')}`);
  return (x: number) => {
    const y = parsed.evaluate({ x });
    if (typeof y !== 'number' || !Number.isFinite(y)) throw new Error(`Expression is not finite at x=${x}.`);
    return y;
  };
}

export function calculateCalculus(
  operation: 'derivative' | 'integral',
  expression: string,
  x?: number,
  lower?: number,
  upper?: number,
  step = 1e-5,
  intervals = 1000,
): JsonRecord {
  const f = oneVariableFunction(expression);
  if (operation === 'derivative') {
    if (x === undefined || !Number.isFinite(x)) throw new Error('derivative requires finite x.');
    if (!(step > 0) || !Number.isFinite(step)) throw new Error('step must be positive and finite.');
    const h = step;
    const result = (-f(x + 2 * h) + 8 * f(x + h) - 8 * f(x - h) + f(x - 2 * h)) / (12 * h);
    return { operation, expression, x, step, method: 'five-point-central-difference', result };
  }
  if (lower === undefined || upper === undefined || !Number.isFinite(lower) || !Number.isFinite(upper)) {
    throw new Error('integral requires finite lower and upper.');
  }
  if (!Number.isInteger(intervals) || intervals < 2 || intervals > 1_000_000) throw new Error('intervals must be an integer from 2 to 1000000.');
  if (intervals % 2 !== 0) intervals++;
  const h = (upper - lower) / intervals;
  let sum = f(lower) + f(upper);
  for (let i = 1; i < intervals; i++) sum += (i % 2 === 0 ? 2 : 4) * f(lower + i * h);
  const result = sum * h / 3;
  return { operation, expression, lower, upper, intervals, method: 'simpson', result };
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return sign * y;
}

function logFactorial(n: number): number {
  if (!Number.isInteger(n) || n < 0) throw new Error('n must be a non-negative integer.');
  let sum = 0;
  for (let i = 2; i <= n; i++) sum += Math.log(i);
  return sum;
}

function combinationLog(n: number, k: number): number {
  return logFactorial(n) - logFactorial(k) - logFactorial(n - k);
}

export function calculateProbability(
  distribution: 'normal' | 'binomial' | 'poisson',
  operation: 'pdf' | 'pmf' | 'cdf',
  params: Record<string, number>,
): JsonRecord {
  for (const [name, value] of Object.entries(params)) if (!Number.isFinite(value)) throw new Error(`${name} must be finite.`);
  let result: number;
  if (distribution === 'normal') {
    if (operation === 'pmf') throw new Error('Normal distribution uses pdf or cdf, not pmf.');
    const { x, mean = 0, sd = 1 } = params;
    if (x === undefined) throw new Error('normal requires x.');
    if (!(sd > 0)) throw new Error('normal sd must be > 0.');
    const z = (x - mean) / sd;
    result = operation === 'pdf'
      ? Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI))
      : 0.5 * (1 + erf(z / Math.sqrt(2)));
  } else if (distribution === 'binomial') {
    if (operation === 'pdf') throw new Error('Binomial distribution uses pmf or cdf, not pdf.');
    const { k, n, p } = params;
    if (!Number.isInteger(n) || n < 0 || n > 100000) throw new Error('binomial n must be an integer from 0 to 100000.');
    if (!Number.isInteger(k)) throw new Error('binomial k must be an integer.');
    if (!(p >= 0 && p <= 1)) throw new Error('binomial p must be between 0 and 1.');
    const pmf = (i: number) => {
      if (i < 0 || i > n) return 0;
      if (p === 0) return i === 0 ? 1 : 0;
      if (p === 1) return i === n ? 1 : 0;
      return Math.exp(combinationLog(n, i) + i * Math.log(p) + (n - i) * Math.log1p(-p));
    };
    if (operation === 'pmf') result = pmf(k);
    else {
      if (k < 0) result = 0;
      else if (k >= n) result = 1;
      else {
        result = 0;
        for (let i = 0; i <= k; i++) result += pmf(i);
        result = Math.min(1, result);
      }
    }
  } else {
    if (operation === 'pdf') throw new Error('Poisson distribution uses pmf or cdf, not pdf.');
    const { k, lambda } = params;
    if (!Number.isInteger(k)) throw new Error('poisson k must be an integer.');
    if (!(lambda >= 0)) throw new Error('poisson lambda must be >= 0.');
    const pmf = (i: number) => i < 0 ? 0 : Math.exp(-lambda + i * Math.log(lambda || 1) - logFactorial(i)) * (lambda === 0 && i > 0 ? 0 : 1);
    if (operation === 'pmf') result = pmf(k);
    else {
      if (k < 0) result = 0;
      else {
        result = 0;
        for (let i = 0; i <= k; i++) result += pmf(i);
        result = Math.min(1, result);
      }
    }
  }
  return { distribution, operation, params, result };
}

const DAY_MS = 86_400_000;

function parseIsoDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error('Dates must use YYYY-MM-DD.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) throw new Error(`Invalid date: ${value}`);
  return date;
}

function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addCalendar(date: Date, amount: number, unit: 'days' | 'weeks' | 'months' | 'years'): Date {
  const d = new Date(date.getTime());
  if (unit === 'days' || unit === 'weeks') {
    d.setUTCDate(d.getUTCDate() + amount * (unit === 'weeks' ? 7 : 1));
    return d;
  }
  const originalDay = d.getUTCDate();
  d.setUTCDate(1);
  if (unit === 'months') d.setUTCMonth(d.getUTCMonth() + amount);
  else d.setUTCFullYear(d.getUTCFullYear() + amount);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(originalDay, lastDay));
  return d;
}

function businessDaysBetween(a: Date, b: Date): number {
  const sign = a <= b ? 1 : -1;
  let current = new Date((sign === 1 ? a : b).getTime());
  const end = sign === 1 ? b : a;
  let count = 0;
  while (current < end) {
    current.setUTCDate(current.getUTCDate() + 1);
    const dow = current.getUTCDay();
    if (current <= end && dow !== 0 && dow !== 6) count++;
  }
  return count * sign;
}

export function calculateDate(
  operation: 'add' | 'difference' | 'weekday' | 'business_days',
  date: string,
  otherDate?: string,
  amount?: number,
  unit: 'days' | 'weeks' | 'months' | 'years' = 'days',
): JsonRecord {
  const a = parseIsoDate(date);
  if (operation === 'weekday') {
    return { operation, date, weekday: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][a.getUTCDay()] };
  }
  if (operation === 'add') {
    if (amount === undefined || !Number.isInteger(amount) || Math.abs(amount) > 1_000_000) throw new Error('add requires integer amount with absolute value <= 1000000.');
    return { operation, date, amount, unit, result: formatIsoDate(addCalendar(a, amount, unit)) };
  }
  if (!otherDate) throw new Error(`${operation} requires otherDate.`);
  const b = parseIsoDate(otherDate);
  if (operation === 'difference') {
    return { operation, date, otherDate, days: Math.round((b.getTime() - a.getTime()) / DAY_MS) };
  }
  const span = Math.abs(Math.round((b.getTime() - a.getTime()) / DAY_MS));
  if (span > 5_000_000) throw new Error('business_days span is too large.');
  return { operation, date, otherDate, businessDays: businessDaysBetween(a, b), convention: 'Mon-Fri; public holidays not excluded' };
}
