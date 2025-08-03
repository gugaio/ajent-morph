import './styles/main.css';
import DesignSystemAgent from './core/DesignSystemAgent';
import ChatInterface from './ui/ChatInterface';
import ElementSelector from './core/ElementSelector';
import CommandProcessor from './core/CommandProcessor';

// Auto-initialize when script is loaded in browser
if (typeof window !== 'undefined') {
  window.DesignSystemAgent = DesignSystemAgent;
  
  // Auto-start the agent
  const agent = new DesignSystemAgent();
  window.dsAgent = agent;
  
  console.log('🤖 Frontable loaded! Type "frontable" to activate.');
}

export default DesignSystemAgent;
export { ChatInterface, ElementSelector, CommandProcessor };