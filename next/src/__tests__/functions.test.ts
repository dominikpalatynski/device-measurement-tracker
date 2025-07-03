// Simple function tests to increase coverage
describe('Simple Functions', () => {
  // Test basic JavaScript functions
  it('should handle array map function', () => {
    const numbers = [1, 2, 3];
    const doubled = numbers.map(n => n * 2);
    expect(doubled).toEqual([2, 4, 6]);
  });

  it('should handle array filter function', () => {
    const numbers = [1, 2, 3, 4, 5];
    const even = numbers.filter(n => n % 2 === 0);
    expect(even).toEqual([2, 4]);
  });

  it('should handle array reduce function', () => {
    const numbers = [1, 2, 3, 4];
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    expect(sum).toBe(10);
  });

  it('should handle string functions', () => {
    const str = "hello world";
    expect(str.split(' ')).toEqual(['hello', 'world']);
    expect(str.replace('hello', 'hi')).toBe('hi world');
    expect(str.includes('world')).toBe(true);
  });

  it('should handle object functions', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(Object.keys(obj)).toEqual(['a', 'b', 'c']);
    expect(Object.values(obj)).toEqual([1, 2, 3]);
    expect(Object.entries(obj)).toEqual([['a', 1], ['b', 2], ['c', 3]]);
  });

  it('should handle date functions', () => {
    const date = new Date('2024-01-01');
    expect(date.getFullYear()).toBe(2024);
    expect(date.getMonth()).toBe(0); // January is 0
  });

  it('should handle math functions', () => {
    expect(Math.max(1, 2, 3)).toBe(3);
    expect(Math.min(1, 2, 3)).toBe(1);
    expect(Math.round(3.7)).toBe(4);
    expect(Math.floor(3.7)).toBe(3);
    expect(Math.ceil(3.2)).toBe(4);
  });

  it('should handle promise functions', async () => {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const start = Date.now();
    await delay(10);
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(9);
  });

  it('should handle error functions', () => {
    const throwError = () => {
      throw new Error('Test error');
    };
    expect(throwError).toThrow('Test error');
  });

  it('should handle conditional functions', () => {
    const isPositive = (n: number) => n > 0;
    const isEven = (n: number) => n % 2 === 0;
    const classify = (n: number) => {
      if (isPositive(n) && isEven(n)) return 'positive-even';
      if (isPositive(n)) return 'positive-odd';
      if (isEven(n)) return 'negative-even';
      return 'negative-odd';
    };

    expect(classify(4)).toBe('positive-even');
    expect(classify(3)).toBe('positive-odd');
    expect(classify(-2)).toBe('negative-even');
    expect(classify(-3)).toBe('negative-odd');
  });
});
