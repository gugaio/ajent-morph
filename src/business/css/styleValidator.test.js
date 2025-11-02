// styleValidator.test.js
import StyleValidator from './styleValidator';

describe('StyleValidator', () => {
  let styleValidator;

  beforeEach(() => {
    styleValidator = new StyleValidator();
  });

  test('deve validar estilos válidos corretamente', () => {
    const styles = {
      display: 'block',
      color: 'red',
      margin: '10px',
    };

    const result = styleValidator.validate(styles);

    expect(result.isValid).toBe(true);
    expect(result.valid).toEqual(styles);
    expect(result.errors).toEqual([]);
  });

  test('deve detectar propriedades CSS inválidas', () => {
    const styles = {
      display: 'block',
      invalidProperty: 'value',
      color: 'blue',
    };

    const result = styleValidator.validate(styles);

    expect(result.isValid).toBe(false);
    expect(result.valid).toEqual({
      display: 'block',
      color: 'blue',
    });
    expect(result.errors).toEqual(['Invalid CSS property: invalidProperty']);
  });

  test('deve lidar com estilos fornecidos como string JSON', () => {
    const styles = JSON.stringify({
      position: 'absolute',
      top: '10px',
      invalidProperty: 'value',
    });

    const result = styleValidator.validate(styles);

    expect(result.isValid).toBe(false);
    expect(result.valid).toEqual({
      position: 'absolute',
      top: '10px',
    });
    expect(result.errors).toEqual(['Invalid CSS property: invalidProperty']);
  });

  test('deve retornar erro ao passar um JSON inválido como string', () => {
    const styles = '{invalidJson}';

    expect(() => styleValidator.validate(styles)).toThrow(SyntaxError);
  });

  test('deve retornar válido para um objeto vazio', () => {
    const styles = {};

    const result = styleValidator.validate(styles);

    expect(result.isValid).toBe(true);
    expect(result.valid).toEqual({});
    expect(result.errors).toEqual([]);
  });

  test('deve retornar inválido para propriedades CSS desconhecidas', () => {
    const styles = {
      unknownProperty: 'value',
    };

    const result = styleValidator.validate(styles);

    expect(result.isValid).toBe(false);
    expect(result.valid).toEqual({});
    expect(result.errors).toEqual(['Invalid CSS property: unknownProperty']);
  });
});