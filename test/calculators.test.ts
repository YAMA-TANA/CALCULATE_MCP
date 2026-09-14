import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateDecimal,
  calculateExpression,
  convertUnits,
  finance,
  percentage,
  solveRoot,
  summarizeStatistics,
} from '../src/calculators.js';
import {
  calculateCalculus,
  calculateComplex,
  calculateDate,
  calculateMatrix,
  calculateProbability,
} from '../src/advanced.js';

test('calculate_expression evaluates arithmetic and constants', () => {
  const result = calculateExpression('sqrt(2)^2 + sin(pi/2)');
  assert.ok(Math.abs((result.result as number) - 3) < 1e-12);
});

test('calculate_expression accepts variables', () => {
  const result = calculateExpression('a*b + c', { a: 4, b: 5, c: 2 });
  assert.equal(result.result, 22);
});

test('calculate_decimal avoids binary floating point surprise', () => {
  const result = calculateDecimal('add', '0.1', '0.2', 50);
  assert.equal(result.result, '0.3');
});

test('convert_units converts distance and temperature', () => {
  assert.equal(convertUnits('length', 1, 'km', 'm').result, 1000);
  assert.equal(convertUnits('temperature', 32, 'F', 'C').result, 0);
});

test('statistics computes common summary values', () => {
  const result = summarizeStatistics([1, 2, 3, 4, 5]);
  assert.equal(result.mean, 3);
  assert.equal(result.median, 3);
  assert.equal(result.q1, 2);
  assert.equal(result.q3, 4);
});

test('percentage change works', () => {
  assert.equal(percentage('change', 100, 125).result, 25);
});

test('finance loan payment is finite', () => {
  const payment = finance('loan_payment', 300000, 6, 30, 12).result as number;
  assert.ok(payment > 1700 && payment < 1900);
});

test('solve_root finds a bracketed root', () => {
  const result = solveRoot('x^3 - x - 2', 1, 2, 1e-12, 300);
  assert.ok(Math.abs((result.root as number) - 1.5213797068045676) < 1e-9);
});

test('matrix multiplication and determinant work', () => {
  assert.deepEqual(calculateMatrix('multiply', [[1, 2], [3, 4]], [[2, 0], [1, 2]]).result, [[4, 4], [10, 8]]);
  assert.equal(calculateMatrix('determinant', [[1, 2], [3, 4]]).result, -2);
});

test('matrix solve computes Ax=b', () => {
  const result = calculateMatrix('solve', [[2, 1], [1, -1]], [5, 1]).result as number[];
  assert.ok(Math.abs(result[0] - 2) < 1e-12);
  assert.ok(Math.abs(result[1] - 1) < 1e-12);
});

test('complex multiplication works', () => {
  assert.deepEqual(calculateComplex('multiply', { re: 1, im: 2 }, { re: 3, im: 4 }).result, { re: -5, im: 10 });
});

test('calculus derivative and integral are accurate', () => {
  const derivative = calculateCalculus('derivative', 'x^3', 2).result as number;
  const integral = calculateCalculus('integral', 'sin(x)', undefined, 0, Math.PI, 1e-5, 1000).result as number;
  assert.ok(Math.abs(derivative - 12) < 1e-7);
  assert.ok(Math.abs(integral - 2) < 1e-9);
});

test('normal CDF at mean is approximately one half', () => {
  const result = calculateProbability('normal', 'cdf', { x: 0, mean: 0, sd: 1 }).result as number;
  assert.ok(Math.abs(result - 0.5) < 1e-7);
});

test('binomial PMF works', () => {
  const result = calculateProbability('binomial', 'pmf', { k: 2, n: 4, p: 0.5 }).result as number;
  assert.ok(Math.abs(result - 0.375) < 1e-12);
});

test('date calculation handles leap years and weekdays', () => {
  assert.equal(calculateDate('add', '2024-02-28', undefined, 1, 'days').result, '2024-02-29');
  assert.equal(calculateDate('weekday', '2026-09-14').weekday, 'Monday');
  assert.equal(calculateDate('difference', '2026-09-14', '2026-09-21').days, 7);
});
