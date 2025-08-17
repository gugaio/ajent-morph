import './styles/main.css';
import Frontable from './core/Frontable';
import ChatInterface from './ui/ChatInterface';
import ElementSelector from './core/ElementSelector';
import CommandProcessor from './core/CommandProcessor';

// Auto-initialize when script is loaded in browser
if (typeof window !== 'undefined') {
  window.Frontable = Frontable;
  
  // Auto-start the agent
  const agent = new Frontable();
  window.dsAgent = agent;
  
  console.log('🤖 Frontable loaded! Type "frontable" to activate.');
}

export default Frontable;
export { ChatInterface, ElementSelector, CommandProcessor };