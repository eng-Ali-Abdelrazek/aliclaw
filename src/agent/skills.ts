import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Skill {
  id: string;
  name: string;
  description: string;
  prompt: string;
  keywords: string[];
}

const SKILLS_DIR = path.join(__dirname, '../../skills');

const SKILL_METADATA: Record<string, { name: string, description: string, keywords: string[] }> = {
  'mckinsey-strategist': {
    name: 'McKinsey Strategist',
    description: 'Advanced business strategy, market analysis, and structured problem solving.',
    keywords: ['strategy', 'market', 'analysis', 'business', 'mckinsey']
  },
  'prompt-engineer': {
    name: 'Prompt Engineer',
    description: 'Optimizing and crafting high-performance AI prompts.',
    keywords: ['prompt', 'engineer', 'optimize', 'craft', 'instruction']
  },
  'deep-research': {
    name: 'Deep Research',
    description: 'Comprehensive data gathering and synthesis on complex topics.',
    keywords: ['research', 'data', 'gather', 'information', 'study']
  },
  'writing-plans': {
    name: 'Writing Plans',
    description: 'Designing detailed execution and project plans.',
    keywords: ['plan', 'project', 'writing', 'roadmap']
  },
  'executing-plans': {
    name: 'Executing Plans',
    description: 'Step-by-step guidance on implementing complex projects.',
    keywords: ['execute', 'implement', 'run', 'action']
  },
  'senior-solution-architect': {
      name: 'Senior Solution Architect',
      description: 'Designing robust, scalable technical architectures.',
      keywords: ['architecture', 'system', 'design', 'scale', 'scaling']
  },
  'product-strategy': {
      name: 'Product Strategy',
      description: 'Long-term product vision and market positioning.',
      keywords: ['product', 'vision', 'positioning', 'roadmap']
  },
  'brainstorming': {
      name: 'Brainstorming',
      description: 'Creative divergent thinking and idea generation.',
      keywords: ['brainstorm', 'ideas', 'creative', 'generate']
  },
  'storytelling-expert': {
      name: 'Storytelling Expert',
      description: 'Compelling narrative building and communication.',
      keywords: ['story', 'narrative', 'tell', 'communication']
  },
  'agent-skill-orchestrator': {
      name: 'Agent Skill Orchestrator',
      description: 'Coordinating multiple AI skills for complex objectives.',
      keywords: ['orchestrate', 'coordinate', 'complex', 'workflow']
  }
};

export async function loadSkills(): Promise<Skill[]> {
  const skills: Skill[] = [];
  
  for (const [id, meta] of Object.entries(SKILL_METADATA)) {
    try {
      const skillPath = path.join(SKILLS_DIR, id, 'SKILL.md');
      const content = await fs.readFile(skillPath, 'utf8');
      skills.push({
        id,
        ...meta,
        prompt: content
      });
    } catch (err) {
      console.warn(`Could not load skill ${id}:`, err);
    }
  }
  
  return skills;
}

export function detectSkills(text: string, allSkills: Skill[]): Skill[] {
  const detected: Skill[] = [];
  const lowerText = text.toLowerCase();
  
  for (const skill of allSkills) {
    if (skill.keywords.some(kw => lowerText.includes(kw))) {
      detected.push(skill);
    }
  }
  
  return detected;
}
