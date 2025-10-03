import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import agentService from '../services/agent';
import { Agent, AgentType, CreateAgentRequest } from '../types/agent';

export default function AgentDashboardPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAgent, setNewAgent] = useState<CreateAgentRequest>({
    name: '',
    type: 'general-purpose',
    description: '',
    capabilities: [],
  });

  useEffect(() => {
    if (workspaceId) {
      loadAgents();
    }
  }, [workspaceId]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const data = await agentService.getAgents(workspaceId!);
      setAgents(data);
    } catch (error) {
      console.error('Failed to load agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await agentService.createAgent(workspaceId!, newAgent);
      setShowCreateModal(false);
      setNewAgent({ name: '', type: 'general-purpose', description: '', capabilities: [] });
      loadAgents();
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const handleStartAgent = async (agentId: string) => {
    try {
      await agentService.startAgent(workspaceId!, agentId);
      loadAgents();
    } catch (error) {
      console.error('Failed to start agent:', error);
    }
  };

  const handleStopAgent = async (agentId: string) => {
    try {
      await agentService.stopAgent(workspaceId!, agentId);
      loadAgents();
    } catch (error) {
      console.error('Failed to stop agent:', error);
    }
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      try {
        await agentService.deleteAgent(workspaceId!, agentId);
        loadAgents();
      } catch (error) {
        console.error('Failed to delete agent:', error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'idle': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getTypeIcon = (type: AgentType) => {
    switch (type) {
      case 'boss': return '👑';
      case 'code-validator': return '🔍';
      case 'ui-designer': return '🎨';
      case 'general-purpose': return '⚙️';
      case 'database-specialist': return '🗄️';
      case 'test-engineer': return '🧪';
      default: return '🤖';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-xl">Loading agents...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Agent Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage autonomous agents for your workspace</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <span>+</span>
            Create Agent
          </button>
        </div>

        {/* Agents Grid */}
        {agents.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="text-6xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">No agents yet</h3>
            <p className="text-gray-600 mb-4">Create your first AI agent to start automating tasks</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Agent
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent) => (
              <div key={agent.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                {/* Agent Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="text-4xl">{getTypeIcon(agent.type)}</div>
                    <div>
                      <h3 className="font-semibold text-lg">{agent.name}</h3>
                      <span className="text-sm text-gray-500 capitalize">{agent.type.replace('-', ' ')}</span>
                    </div>
                  </div>
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} title={agent.status} />
                </div>

                {/* Description */}
                {agent.description && (
                  <p className="text-sm text-gray-600 mb-4">{agent.description}</p>
                )}

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded">
                  <div>
                    <div className="text-xs text-gray-500">Tasks</div>
                    <div className="text-lg font-semibold">{agent.metrics.totalTasks || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Success Rate</div>
                    <div className="text-lg font-semibold">{agent.metrics.successRate?.toFixed(0) || 0}%</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Completed</div>
                    <div className="text-lg font-semibold text-green-600">{agent.metrics.completedTasks || 0}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Failed</div>
                    <div className="text-lg font-semibold text-red-600">{agent.metrics.failedTasks || 0}</div>
                  </div>
                </div>

                {/* Capabilities */}
                {agent.capabilities.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-500 mb-2">Capabilities</div>
                    <div className="flex flex-wrap gap-1">
                      {agent.capabilities.slice(0, 3).map((cap, idx) => (
                        <span key={idx} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {cap}
                        </span>
                      ))}
                      {agent.capabilities.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                          +{agent.capabilities.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {agent.status === 'offline' ? (
                    <button
                      onClick={() => handleStartAgent(agent.id)}
                      className="flex-1 px-3 py-2 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                    >
                      Start
                    </button>
                  ) : (
                    <button
                      onClick={() => handleStopAgent(agent.id)}
                      className="flex-1 px-3 py-2 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700"
                    >
                      Stop
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Agent Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4">Create New Agent</h2>
              <form onSubmit={handleCreateAgent}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Agent Name</label>
                    <input
                      type="text"
                      value={newAgent.name}
                      onChange={(e) => setNewAgent({ ...newAgent, name: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="My Agent"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Agent Type</label>
                    <select
                      value={newAgent.type}
                      onChange={(e) => setNewAgent({ ...newAgent, type: e.target.value as AgentType })}
                      className="w-full px-3 py-2 border rounded-lg"
                    >
                      <option value="boss">Boss (Orchestrator)</option>
                      <option value="general-purpose">General Purpose</option>
                      <option value="code-validator">Code Validator</option>
                      <option value="ui-designer">UI Designer</option>
                      <option value="database-specialist">Database Specialist</option>
                      <option value="test-engineer">Test Engineer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description (Optional)</label>
                    <textarea
                      value={newAgent.description}
                      onChange={(e) => setNewAgent({ ...newAgent, description: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="What does this agent do?"
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Create
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
