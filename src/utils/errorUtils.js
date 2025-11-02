export class ErrorUtils {
  static handle(context, message, dispatchError) {
    console.warn(`[${context}] ${message}`);
    dispatchError(context, message);
    return `❌ ERRO: ${message}`;
  }
}
  