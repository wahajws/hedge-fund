export class AgentRegistry {
  constructor() {
    this.agents = new Map();
  }

  register(agent) {
    this.agents.set(agent.name, agent);
  }

  get(name) {
    const agent = this.agents.get(name);
    if (!agent) throw new Error(`Agent ${name} is not registered`);
    return agent;
  }

  list() {
    return [...this.agents.values()].map((agent) => agent.describe());
  }
}

export const agentRegistry = new AgentRegistry();
