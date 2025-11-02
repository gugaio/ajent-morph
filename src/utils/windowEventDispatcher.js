export default class WindowEventDispatcher {
  static dispatch(eventName, detail) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  }
}
  