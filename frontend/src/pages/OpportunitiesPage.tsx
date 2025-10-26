import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  getOpportunities,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  markOpportunityWon,
  markOpportunityLost,
  getOpportunityPipeline,
  getOpportunityForecast,
  CRMOpportunity,
} from '../services/crm';

type ViewMode = 'list' | 'pipeline' | 'forecast';

const OpportunitiesPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedOpp, setSelectedOpp] = useState<CRMOpportunity | null>(null);
  const [filters, setFilters] = useState({
    status: 'open',
    stage: '',
    forecast_category: '',
  });

  useEffect(() => {
    fetchData();
  }, [workspaceId, filters, viewMode]);

  const fetchData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);

      if (viewMode === 'list') {
        const data = await getOpportunities(workspaceId, {
          status: filters.status || undefined,
          stage: filters.stage || undefined,
          forecast_category: filters.forecast_category || undefined,
        });
        setOpportunities(data);
      } else if (viewMode === 'pipeline') {
        const pipeline = await getOpportunityPipeline(workspaceId);
        setPipelineData(pipeline);
      } else if (viewMode === 'forecast') {
        const forecast = await getOpportunityForecast(workspaceId);
        setForecastData(forecast);
      }
    } catch (error) {
      console.error('Error fetching opportunities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOpportunity = async (oppData: Partial<CRMOpportunity>) => {
    if (!workspaceId) return;
    try {
      await createOpportunity(workspaceId, oppData);
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Error creating opportunity:', error);
    }
  };

  const handleMarkWon = async (oppId: string) => {
    if (!workspaceId) return;
    try {
      await markOpportunityWon(workspaceId, oppId);
      fetchData();
    } catch (error) {
      console.error('Error marking opportunity as won:', error);
    }
  };

  const handleMarkLost = async (oppId: string) => {
    if (!workspaceId) return;
    const lossReason = prompt('Enter loss reason:');
    if (!lossReason) return;
    try {
      await markOpportunityLost(workspaceId, oppId, lossReason);
      fetchData();
    } catch (error) {
      console.error('Error marking opportunity as lost:', error);
    }
  };

  const handleDeleteOpportunity = async (oppId: string) => {
    if (!workspaceId || !confirm('Are you sure you want to delete this opportunity?')) return;
    try {
      await deleteOpportunity(workspaceId, oppId);
      fetchData();
    } catch (error) {
      console.error('Error deleting opportunity:', error);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const formatDate = (date?: Date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getStageBadge = (stage: string) => {
    const colors: Record<string, string> = {
      'Qualification': 'bg-blue-100 text-blue-800',
      'Needs Analysis': 'bg-purple-100 text-purple-800',
      'Proposal': 'bg-yellow-100 text-yellow-800',
      'Negotiation': 'bg-orange-100 text-orange-800',
      'Closed Won': 'bg-green-100 text-green-800',
      'Closed Lost': 'bg-red-100 text-red-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getForecastBadge = (category?: string) => {
    const colors: Record<string, string> = {
      pipeline: 'bg-blue-100 text-blue-800',
      best_case: 'bg-yellow-100 text-yellow-800',
      commit: 'bg-green-100 text-green-800',
      closed: 'bg-gray-100 text-gray-800',
    };
    return colors[category || ''] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities</h1>
          <p className="text-gray-600 mt-1">Track and forecast your sales pipeline</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          New Opportunity
        </button>
      </div>

      {/* View Mode Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setViewMode('list')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'list'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setViewMode('pipeline')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'pipeline'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('forecast')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              viewMode === 'forecast'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Forecast
          </button>
        </nav>
      </div>

      {/* List View */}
      {viewMode === 'list' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All</option>
                  <option value="open">Open</option>
                  <option value="won">Won</option>
                  <option value="lost">Lost</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                <select
                  value={filters.stage}
                  onChange={(e) => setFilters({ ...filters, stage: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All Stages</option>
                  <option value="Qualification">Qualification</option>
                  <option value="Needs Analysis">Needs Analysis</option>
                  <option value="Proposal">Proposal</option>
                  <option value="Negotiation">Negotiation</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Forecast</label>
                <select
                  value={filters.forecast_category}
                  onChange={(e) => setFilters({ ...filters, forecast_category: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                >
                  <option value="">All Categories</option>
                  <option value="pipeline">Pipeline</option>
                  <option value="best_case">Best Case</option>
                  <option value="commit">Commit</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Opportunities Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Opportunity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stage
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Probability
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Close Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Forecast
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {opportunities.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      No opportunities found. Create your first opportunity to get started!
                    </td>
                  </tr>
                ) : (
                  opportunities.map((opp) => (
                    <tr key={opp.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{opp.name}</div>
                          <div className="text-sm text-gray-500">{opp.account_name || '-'}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(opp.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStageBadge(opp.stage)}`}>
                          {opp.stage}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {opp.probability || 0}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(opp.close_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {opp.forecast_category && (
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getForecastBadge(opp.forecast_category)}`}>
                            {opp.forecast_category}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex space-x-2">
                          {opp.status === 'open' && (
                            <>
                              <button
                                onClick={() => handleMarkWon(opp.id)}
                                className="text-green-600 hover:text-green-900"
                              >
                                Won
                              </button>
                              <button
                                onClick={() => handleMarkLost(opp.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                Lost
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteOpportunity(opp.id)}
                            className="text-gray-600 hover:text-gray-900"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <div className="grid grid-cols-1 gap-4">
          {pipelineData.map((stage) => (
            <div key={stage.stage} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">{stage.stage}</h3>
                <div className="text-sm text-gray-500">
                  {stage.count} opportunities • {formatCurrency(stage.total_amount)}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Total Value</div>
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(stage.total_amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Avg Probability</div>
                  <div className="text-xl font-bold text-gray-900">{Math.round(stage.avg_probability || 0)}%</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Expected Revenue</div>
                  <div className="text-xl font-bold text-gray-900">{formatCurrency(stage.total_expected_revenue)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forecast View */}
      {viewMode === 'forecast' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {forecastData.map((category) => (
            <div key={category.forecast_category} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 capitalize">
                  {category.forecast_category.replace('_', ' ')}
                </h3>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getForecastBadge(category.forecast_category)}`}>
                  {category.count} opps
                </span>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(category.total_amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Expected Revenue</div>
                  <div className="text-xl font-bold text-indigo-600">{formatCurrency(category.total_expected_revenue)}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-1">Average Probability</div>
                  <div className="text-lg font-semibold text-gray-700">{Math.round(category.avg_probability || 0)}%</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Opportunity Modal */}
      {showCreateModal && (
        <CreateOpportunityModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateOpportunity}
        />
      )}
    </div>
  );
};

// Create Opportunity Modal
const CreateOpportunityModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: Partial<CRMOpportunity>) => void;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<Partial<CRMOpportunity>>({
    stage: 'Qualification',
    probability: 10,
    forecast_category: 'pipeline',
    status: 'open',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Create New Opportunity</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Opportunity Name *</label>
            <input
              type="text"
              required
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="e.g., Acme Corp - Q4 Deal"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Close Date</label>
              <input
                type="date"
                value={formData.close_date ? new Date(formData.close_date).toISOString().split('T')[0] : ''}
                onChange={(e) => setFormData({ ...formData, close_date: new Date(e.target.value) as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
              <select
                value={formData.stage}
                onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="Qualification">Qualification</option>
                <option value="Needs Analysis">Needs Analysis</option>
                <option value="Proposal">Proposal</option>
                <option value="Negotiation">Negotiation</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Probability (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.probability || 0}
                onChange={(e) => setFormData({ ...formData, probability: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="new_business">New Business</option>
                <option value="existing_business">Existing Business</option>
                <option value="renewal">Renewal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Forecast Category</label>
              <select
                value={formData.forecast_category}
                onChange={(e) => setFormData({ ...formData, forecast_category: e.target.value as any })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2"
              >
                <option value="pipeline">Pipeline</option>
                <option value="best_case">Best Case</option>
                <option value="commit">Commit</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              placeholder="Add opportunity details..."
            />
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Opportunity
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default OpportunitiesPage;
