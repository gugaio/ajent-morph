import StyleApplier from './StyleApplier'; // Ajuste o caminho conforme necessário

describe('captureElementState', () => {
  let styleApplier;

  beforeEach(() => {
    global.document = {
        createTextNode: jest.fn((text) => ({ nodeType: 3, textContent: text })),
    };
    styleApplier = new StyleApplier();
    styleApplier.validCSSProperties = ['color', 'fontSize', 'margin']; // Propriedades válidas para teste
    jest.spyOn(document, 'createTextNode').mockImplementation((text) => {
        return { nodeType: 3, textContent: text }; // Mimic a Text node
    });
});

  test('should return minimal state for invalid element', () => {
    const result = styleApplier.captureElementState(null);
    expect(result).toEqual({ inline: '' });
  });

  test('should return minimal state for non-element node', () => {
    const textNode = document.createTextNode('Test');
    const result = styleApplier.captureElementState(textNode);
    expect(result).toEqual({ inline: '' });
  });


});