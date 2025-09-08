import './styles/main.css';
import Frontable from './core/Frontable';
import ChatInterface from './ui/ChatInterface';
import ElementSelector from './core/ElementSelector';
import CommandProcessor from './core/CommandProcessor';

// Auto-initialize when script is loaded in browser
if (typeof window !== 'undefined') {  
  const agent = new Frontable();
  agent.init();
  window.frontable = agent; // Expose to global scope for easy access
  console.log('🤖 Frontable loaded! Type "frontable" to activate.');
}

export default Frontable;
export { ChatInterface, ElementSelector, CommandProcessor };