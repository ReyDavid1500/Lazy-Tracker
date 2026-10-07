---
description: This file describes the testing guidelines and standards for the project.
globs: 
  - "**/*.ts"
  - "**/*.js"
alwaysApply: true
---
### Testing Guidelines

#### Core Testing Principles

- Follow the Arrange-Act-Assert pattern strictly
- Write unit tests for each public function and class
- Maintain minimum 90% code coverage
- Write acceptance/e2e tests for each module
- Use meaningful test descriptions that explain the expected behavior
- Follow the standard Jest framework with @nestjs/testing
- Organize tests in `__tests__` folders mirroring source structure
- Create `__fixtures__` folder for mock data and constants
- Use Table Testing Pattern for multiple test scenarios
- Mock all external dependencies unless testing integration

#### Test Style and Structure

- Always leave a blank line between describe blocks
- Always leave a blank line between it blocks
- Group related expects without blank lines between them
- Use consistent indentation (2 spaces)
- Keep test descriptions in a single line
- Place mock setup at the beginning of the test
- Group related test configuration in beforeEach blocks

#### 1. Framework and Structure

- Use Jest as the primary testing framework with @nestjs/testing module
- Organize tests in a `__tests__` folder following the same path structure as source files
- Create a `__fixtures__` folder for mock data and testing constants
- Follow a clear file naming convention: `[name].spec.ts` for unit tests, `[name].e2e-spec.ts` for e2e tests

#### 2. Test Suite Organization

- Group related tests using nested describe blocks
- First describe block: Name of the class/service being tested
- Second describe block: Method name with parentheses
- Inner describe blocks: Specific conditions or branches
- Use beforeEach for branch-specific setup
- Place happy path tests first
- Group related error cases together

Example structure:

```typescript
describe('ServiceName', () => {
  describe('methodName()', () => {
    // Happy path first
    it('completes successfully with valid input', async () => {
      // implementation
    });

    // Then branches
    describe('when validation fails', () => {
      beforeEach(() => {
        // branch setup
      });

      it('throws ValidationException', async () => {
        // implementation
      });
    });
  });
});
```

#### 3. Test Case Naming

- Use clear, action-based naming for test cases
- Follow the pattern: `it('does/invokes/calls/returns [expected outcome] when [condition]')`
- Avoid using 'should' in test names
- Examples:
  ```typescript
  it('returns null when user not found');
  it('throws UnauthorizedException when invalid credentials');
  it('creates new record with provided data');
  ```
- Do not use `should` at the beginning of a test case `it`

#### 4. Test Setup and Teardown

- Use `beforeAll()` for one-time setup
- Use `beforeEach()` for per-test initialization
- Clear all mocks in `beforeEach` using `jest.clearAllMocks()`
- Use `afterEach()` for per-test cleanup
- Use `afterAll()` for one-time teardown

#### 5. Mocking Guidelines

- Prefer const mocks over spyOn
- Mock all external dependencies unless testing integration
- Use spyOn only when mocking public methods that cannot be injected
- Place mock constants in **__fixtures__** folder

Standard Mock Structure:

```typescript
const mockService = {
  method: jest.fn().mockResolvedValue(expectedResult),
};

// For model mocking:
const mockModel = {
  findOne: jest.fn().mockResolvedValue(expectedEntity),
  find: jest.fn().mockResolvedValue([expectedEntity]),
  create: jest.fn().mockResolvedValue(expectedEntity),
  update: jest.fn().mockResolvedValue(expectedEntity),
  delete: jest.fn().mockResolvedValue(true),
};
```

#### 6. Test Module Setup

```typescript
beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [],
    providers: [
      TestedService,
      {
        provide: DependencyService,
        useValue: mockDependencyService,
      },
    ],
  }).compile();
  service = module.get<TestedService>(TestedService);
});
```

#### 7. Assertion Best Practices

- Use type-safe assertions
- Test both positive and negative cases
- Verify all side effects and dependencies calls
- Examples:
  ```typescript
  expect(result).toEqual(expectedValue);
  expect(mockService.method).toHaveBeenCalledWith(expectedArgs);
  await expect(promise).rejects.toThrow(SpecificError);
  ```

#### 8. Anti-patterns to Avoid

- **Do not assert logger calls in unit tests.** Logging is an implementation detail and tying assertions to it makes tests brittle, couples them to message wording or log levels, and does not guarantee functional correctness.
  - Instead, verify observable outcomes or state changes.
  - When logging accompanies an early return, assert that the behavior was skipped (e.g., the function exited early or produced no side effects) rather than checking the log output.

  ```typescript
  if (conditionNotMet()) {
    loggerService.info('condition is not met, skipping');
    return;
  }
  ```

  | ❌ Bad test                                   | ✅ Good test                                              |
  | --------------------------------------------- | --------------------------------------------------------- |
  | `expect(loggerService.info).toHaveBeenCalledWith('condition is not met, skipping');` | `expect(service.doWork()).toBeUndefined();` (or assert that dependent actions were skipped) |

#### 9. Coverage Requirements

- Maintain minimum 90% code coverage
- Test all public methods
- Test error handling paths
- Test edge cases and boundary conditions


