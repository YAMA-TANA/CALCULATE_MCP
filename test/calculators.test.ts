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
