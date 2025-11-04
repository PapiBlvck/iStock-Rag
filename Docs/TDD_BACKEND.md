# Test-Driven Development (TDD) - Backend Documentation

## Overview
This document describes the TDD approach, testing strategy, and coverage requirements for the backend codebase.

## Table of Contents
1. [TDD Principles](#tdd-principles)
2. [Testing Strategy](#testing-strategy)
3. [Test Coverage Requirements](#test-coverage-requirements)
4. [Test Structure](#test-structure)
5. [Running Tests](#running-tests)
6. [Test Examples](#test-examples)
7. [Continuous Integration](#continuous-integration)

## TDD Principles

### Red-Green-Refactor Cycle
1. **Red**: Write a failing test
2. **Green**: Write minimal code to pass
3. **Refactor**: Improve code while keeping tests green

### Testing Philosophy
- **Test First**: Write tests before implementation
- **Test Behavior**: Test what the code does, not how
- **Pure Functions**: Prioritize testable, pure functions
- **High Coverage**: Aim for ≥80% coverage on critical paths

## Testing Strategy

### Test Pyramid
```
        ┌─────────┐
        │   E2E   │  (Future - Full system tests)
        └─────────┘
      ┌─────────────┐
      │ Integration │  (Future - Router + Firebase)
      └─────────────┘
    ┌─────────────────┐
    │    Unit Tests   │  (Current - Pure functions)
    └─────────────────┘
```

### Current Focus: Unit Tests
- **Pure Functions**: Feed solver, utilities
- **Business Logic**: Isolated, testable components
- **No Dependencies**: Mock-free, deterministic tests

### Future: Integration Tests
- Router procedures
- Firebase operations
- External API calls

## Test Coverage Requirements

### Coverage Targets

#### Critical Functions: ≥80% Coverage
- **Feed Solver**: ✅ **84% functions, 81.15% lines**
- **Pure Functions**: All utility functions

#### Coverage Metrics
```bash
# Current Feed Solver Coverage
Statements: 79.64% (target: 80%)
Branches:   74%    (target: 80%)
Functions:  84%    (target: 80%) ✅
Lines:      81.15% (target: 80%) ✅
```

### Coverage Configuration
```javascript
// jest.config.js
coverageThreshold: {
  './src/lib/feed-solver.ts': {
    branches: 80,
    functions: 80,
    lines: 80,
    statements: 80,
  },
}
```

## Test Structure

### Directory Layout
```
functions/src/
├── lib/
│   ├── feed-solver.ts
│   └── __tests__/
│       └── feed-solver.test.ts
└── routers/
    └── (integration tests - future)
```

### Test File Naming
- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts` (future)
- Spec files: `*.spec.ts` (alternative)

### Test Organization
```typescript
describe('FunctionName', () => {
  describe('Feature Category', () => {
    it('should do something specific', () => {
      // Arrange
      const input = { /* ... */ };
      
      // Act
      const result = functionName(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

## Running Tests

### Commands
```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Watch mode
pnpm test:watch

# Run specific test file
npx jest feed-solver.test.ts

# Run with coverage for specific file
npx jest feed-solver.test.ts --coverage
```

### Test Output
```
PASS src/lib/__tests__/feed-solver.test.ts
  solveLeastCostFeedFormulation
    Basic functionality
      ✓ should solve a simple 2-ingredient problem
      ✓ should handle a single ingredient
    ...
```

## Test Examples

### Example 1: Pure Function Test
```typescript
describe('solveLeastCostFeedFormulation', () => {
  it('should solve a simple 2-ingredient problem', () => {
    // Arrange
    const input: FeedOptimizationInput = {
      targetAnimal: 'Dairy Cattle',
      totalAmount: 100,
      unit: 'kg',
      ingredients: [
        {
          id: '1',
          name: 'Corn',
          unitPrice: 0.2,
          nutritionalValues: { protein: 8, energy: 3.5 },
        },
        {
          id: '2',
          name: 'Soybean Meal',
          unitPrice: 0.5,
          nutritionalValues: { protein: 44, energy: 3.2 },
        },
      ],
    };

    // Act
    const result = solveLeastCostFeedFormulation(input);

    // Assert
    expect(result).toBeDefined();
    expect(result.targetAnimal).toBe('Dairy Cattle');
    expect(result.components.length).toBeGreaterThan(0);
    expect(result.totalCost).toBeGreaterThanOrEqual(0);
    
    // Check percentages sum to ~100%
    const totalPercentage = result.components.reduce(
      (sum, c) => sum + c.percentage,
      0
    );
    expect(totalPercentage).toBeCloseTo(100, 1);
  });
});
```

### Example 2: Edge Case Test
```typescript
it('should throw error when no ingredients provided', () => {
  const input: FeedOptimizationInput = {
    targetAnimal: 'Dairy Cattle',
    totalAmount: 100,
    unit: 'kg',
    ingredients: [],
  };

  expect(() => solveLeastCostFeedFormulation(input)).toThrow(
    'At least one ingredient is required'
  );
});
```

### Example 3: Constraint Test
```typescript
it('should respect ingredient constraints', () => {
  const input: FeedOptimizationInput = {
    // ... setup with constraints
    ingredients: [{
      id: '1',
      name: 'Corn',
      unitPrice: 0.2,
      nutritionalValues: { protein: 8 },
      constraints: {
        minPercentage: 30,
        maxPercentage: 70,
      },
    }],
  };

  const result = solveLeastCostFeedFormulation(input);
  const cornComponent = result.components.find(
    (c) => c.ingredientName === 'Corn'
  );

  expect(cornComponent?.percentage).toBeGreaterThanOrEqual(30);
  expect(cornComponent?.percentage).toBeLessThanOrEqual(70);
});
```

## Test Categories

### 1. Unit Tests
**Scope**: Individual functions
**Dependencies**: None (pure functions)
**Speed**: Fast (<1ms per test)
**Examples**: Feed solver, utilities

### 2. Integration Tests (Future)
**Scope**: Multiple components
**Dependencies**: Mocked Firebase
**Speed**: Medium (10-100ms per test)
**Examples**: Router procedures, Firebase operations

### 3. E2E Tests (Future)
**Scope**: Full system
**Dependencies**: Test environment
**Speed**: Slow (100ms+ per test)
**Examples**: Complete user flows

## Test Best Practices

### ✅ Do
- Test one thing per test
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Test edge cases and error conditions
- Keep tests independent
- Use test data builders for complex inputs

### ❌ Don't
- Test implementation details
- Create tests that depend on each other
- Use magic numbers (use constants)
- Skip error cases
- Test external dependencies (mock them)

## Coverage Analysis

### Current Coverage: Feed Solver
```
File            | % Stmts | % Branch | % Funcs | % Lines
----------------|---------|----------|---------|--------
feed-solver.ts  |  79.64  |    74    |   84    |  81.15
```

### Uncovered Lines
- Lines 242-282: Optimization improvement loop (complex branches)
- Some edge cases in constraint handling

### Improving Coverage
1. Add tests for optimization loop branches
2. Test constraint edge cases
3. Add tests for normalization scenarios

## Continuous Integration

### Current State
- Manual testing before commits
- Coverage reports generated locally

### Future CI/CD
```yaml
# .github/workflows/test.yml (future)
- Run tests on every PR
- Enforce coverage thresholds
- Block merge if coverage drops
- Generate coverage reports
```

## Test Data Management

### Test Fixtures
Create reusable test data:
```typescript
const createTestIngredient = (overrides = {}) => ({
  id: 'test-id',
  name: 'Test Ingredient',
  unitPrice: 0.2,
  nutritionalValues: { protein: 10 },
  ...overrides,
});
```

### Mock Data
- Use realistic but minimal data
- Isolate test data from real data
- Clear naming conventions

## Debugging Tests

### Common Issues
1. **Type Errors**: Check TypeScript configuration
2. **Import Errors**: Verify package exports
3. **Timeout**: Increase timeout for slow tests
4. **Coverage Gaps**: Use `--coverage` to identify gaps

### Debugging Tips
```bash
# Run with verbose output
npx jest --verbose

# Run single test
npx jest -t "should solve"

# Debug with Node inspector
node --inspect-brk node_modules/.bin/jest
```

## References
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [TDD Guide](https://www.agilealliance.org/glossary/tdd/)

