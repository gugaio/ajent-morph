// styleNormalizer.test.js
import StyleNormalizer from './styleNormalizer';

describe('StyleNormalizer', () => {
  let normalizer;

  beforeEach(() => {
    normalizer = new StyleNormalizer();
  });

  test('should normalize color values to lowercase', () => {
    const styles = { color: 'RED', backgroundColor: 'BLUE', borderColor: 'Green' };
    const normalized = normalizer.normalize(styles);

    expect(normalized).toEqual({
      color: 'red',
      backgroundColor: 'blue',
      borderColor: 'green',
    });
  });

  test('should normalize size values to include px', () => {
    const styles = { width: 100, height: 200, margin: 10, padding: 5 };
    const normalized = normalizer.normalize(styles);

    expect(normalized).toEqual({
      width: '100px',
      height: '200px',
      margin: '10px',
      padding: '5px',
    });
  });

  test('should keep other values as-is', () => {
    const styles = { display: 'flex', position: 'absolute' };
    const normalized = normalizer.normalize(styles);

    expect(normalized).toEqual({
      display: 'flex',
      position: 'absolute',
    });
  });

  test('should handle mixed styles correctly', () => {
    const styles = {
      color: 'RED',
      width: 100,
      display: 'block',
      margin: '10px',
    };
    const normalized = normalizer.normalize(styles);

    expect(normalized).toEqual({
      color: 'red',
      width: '100px',
      display: 'block',
      margin: '10px',
    });
  });

  test('should return an empty object for empty styles', () => {
    const styles = {};
    const normalized = normalizer.normalize(styles);

    expect(normalized).toEqual({});
  });
});