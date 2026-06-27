import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ChartParser = require('../../js/chart-parser.js');

test('ChartParser.parse converts table rows into dimensions and series', () => {
  const result = ChartParser.parse({
    columns: ['month', 'sales', 'profit'],
    rows: [
      ['Jan', 12, 5],
      ['Feb', 20, 8]
    ]
  });

  assert.deepEqual(result.dimensions, ['Jan', 'Feb']);
  assert.equal(result.dimensionName, 'month');
  assert.deepEqual(result.seriesNames, ['sales', 'profit']);
  assert.deepEqual(result.series[0].data, [12, 20]);
  assert.deepEqual(result.seriesColumns, [1, 2]);
});

test('ChartParser.parsePie maps two-column data into pie chart points', () => {
  const result = ChartParser.parsePie({
    columns: ['name', 'value'],
    rows: [
      ['A', 10],
      ['B', null]
    ]
  });

  assert.deepEqual(result, [
    { name: 'A', value: 10 },
    { name: 'B', value: 0 }
  ]);
});

test('ChartParser.suggestChartType distinguishes pie, bar, and line', () => {
  assert.equal(ChartParser.suggestChartType({
    columns: ['name', 'value'],
    rows: [['A', 1], ['B', 2]]
  }), 'pie');

  assert.equal(ChartParser.suggestChartType({
    columns: ['name', 'v1', 'v2', 'v3', 'v4'],
    rows: [['A', 1, 2, 3, 4], ['B', 2, 3, 4, 5]]
  }), 'line');
});

test('ChartParser.validate reports malformed rows', () => {
  const result = ChartParser.validate({
    columns: ['id', 'name'],
    rows: [
      [1, 'Alice'],
      [2]
    ]
  });

  assert.equal(result.valid, false);
  assert.match(result.errors[0], /列数/);
});
