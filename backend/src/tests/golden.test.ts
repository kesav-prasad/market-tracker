import { CalculationEngine } from '../services/CalculationEngine';
import { ValidationEngine } from '../services/ValidationEngine';

console.log('Running Golden Test Case...');

const refPrice = 100;
let passed = true;

function assertCloseTo(actual: number | null, expected: number, margin = 0.01, testName: string) {
  if (actual === null) {
    console.error(`FAILED: ${testName} (Expected ${expected}, got null)`);
    passed = false;
    return;
  }
  if (Math.abs(actual - expected) > margin) {
    console.error(`FAILED: ${testName} (Expected ${expected}, got ${actual})`);
    passed = false;
  } else {
    console.log(`PASSED: ${testName}`);
  }
}

// 28-Jul: 0.00%
// 29-Jul: +5.00%
// 30-Jul: +3.00%
// 31-Jul: +10.00%
assertCloseTo(CalculationEngine.calculateSeriesChange(100, refPrice), 0, 0.01, 'Series Change 28-Jul');
assertCloseTo(CalculationEngine.calculateSeriesChange(105, refPrice), 5, 0.01, 'Series Change 29-Jul');
assertCloseTo(CalculationEngine.calculateSeriesChange(103, refPrice), 3, 0.01, 'Series Change 30-Jul');
assertCloseTo(CalculationEngine.calculateSeriesChange(110, refPrice), 10, 0.01, 'Series Change 31-Jul');

// Expected Today Change:
// 29-Jul (prev 100): +5.00%
// 30-Jul (prev 105): -1.9047619...%
// 31-Jul (prev 103): +6.7961165...%
assertCloseTo(CalculationEngine.calculateTodayChange(105, 100), 5, 0.01, 'Today Change 29-Jul');
assertCloseTo(CalculationEngine.calculateTodayChange(103, 105), -1.90476, 0.001, 'Today Change 30-Jul');
assertCloseTo(CalculationEngine.calculateTodayChange(110, 103), 6.79611, 0.001, 'Today Change 31-Jul');

console.log(passed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED');
process.exit(passed ? 0 : 1);
