import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getLeads,
  getOpportunities,
  getOpportunityForecast,
  getOpportunityPipeline,
  getWinLossAnalysis,
  CRMLead,
  CRMOpportunity,
} from '../services/crm';

const CRMDashboardPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([]);
  const [forecast, setForecast] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [winLoss, setWinLoss] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [workspaceId]);

  const fetchDashboardData = async () => {
    if (!workspaceId) return;
    try {
      setLoading(true);
      const [leadsData, oppsData, forecastData, pipelineData, winLossData] = await Promise.all([
        getLeads(workspaceId, { status: 'qualified' }),
        getOpportunities(workspaceId, { status: 'open' }),
        getOpportunityForecast(workspaceId),
        getOpportunityPipeline(workspaceId),
        getWinLossAnalysis(workspaceId),
      ]);
      setLeads(leadsData.slice(0, 5)); // Top 5 leads
      setOpportunities(oppsData.slice(0, 5)); // Top 5 opportunities
      setForecast(forecastData);
      setPipeline(pipelineData);
      setWinLoss(winLossData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '$0';
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

  const getTotalPipelineValue = () => {
    return opportunities.reduce((sum, opp) => sum + (opp.amount || 0), 0);
  };

  const getTotalExpectedRevenue = () => {
    return opportunities.reduce((sum, opp) => sum + (opp.expected_revenue || 0), 0);
  };

  const getWinRate = () => {
    const won = winLoss.find((w) => w.status === 'won');
    const lost = winLoss.find((w) => w.status === 'lost');
    const total = (won?.count || 0) + (lost?.count || 0);
    if (total === 0) return 0;
    return Math.round(((won?.count || 0) / total) * 100);
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
        <p className="text-gray-600 mt-1">Overview of your sales performance</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Pipeline</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {formatCurrency(getTotalPipelineValue())}
              </p>
            </div>
            <div className="p-3 bg-indigo-100 rounded-full">
              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">{opportunities.length} open opportunities</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expected Revenue</p>
              <p className="text-2xl font-bold text-green-600 mt-1">
                {formatCurrency(getTotalExpectedRevenue())}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Weighted by probability</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Qualified Leads</p>
              <p className="text-2xl font-bold text-blue-600 mt-1">{leads.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Ready to convert</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Win Rate</p>
              <p className="text-2xl font-bold text-purple-600 mt-1">{getWinRate()}%</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Historical performance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Pipeline by Stage */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Pipeline by Stage</h2>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/opportunities`)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {pipeline.map((stage) => (
              <div key={stage.stage} className="border-l-4 border-indigo-500 pl-3 py-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-gray-900">{stage.stage}</span>
                  <span className="text-sm font-semibold text-gray-700">{formatCurrency(stage.total_amount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>{stage.count} opportunities</span>
                  <span>{Math.round(stage.avg_probability || 0)}% avg probability</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forecast by Category */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Forecast Categories</h2>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/opportunities`)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View Forecast →
            </button>
          </div>
          <div className="space-y-4">
            {forecast.map((category) => (
              <div key={category.forecast_category} className="border rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {category.forecast_category.replace('_', ' ')}
                  </span>
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">{category.count} opps</span>
                </div>
                <div className="text-lg font-bold text-gray-900">{formatCurrency(category.total_amount)}</div>
                <div className="text-sm text-gray-600 mt-1">
                  Expected: {formatCurrency(category.total_expected_revenue)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Qualified Leads */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Qualified Leads</h2>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/leads`)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View All →
            </button>
          </div>
          {leads.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No qualified leads yet</p>
          ) : (
            <div className="space-y-3">
              {leads.map((lead) => (
                <div key={lead.id} className="border-b pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </div>
                      <div className="text-sm text-gray-600">{lead.company || 'No company'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-indigo-600">Score: {lead.lead_score || 0}</div>
                      {lead.rating && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          lead.rating === 'hot'
                            ? 'bg-red-100 text-red-800'
                            : lead.rating === 'warm'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {lead.rating}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Opportunities */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Opportunities</h2>
            <button
              onClick={() => navigate(`/workspace/${workspaceId}/opportunities`)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              View All →
            </button>
          </div>
          {opportunities.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No open opportunities yet</p>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div key={opp.id} className="border-b pb-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{opp.name}</div>
                      <div className="text-sm text-gray-600">{opp.stage}</div>
                    </div>
                    <div className="text-right ml-4">
                      <div className="font-semibold text-gray-900">{formatCurrency(opp.amount)}</div>
                      <div className="text-xs text-gray-500">{opp.probability}% probability</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Win/Loss Analysis */}
      {winLoss.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Win/Loss Analysis</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {winLoss.map((status) => (
              <div key={status.status} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-lg font-semibold ${status.status === 'won' ? 'text-green-600' : 'text-red-600'}`}>
                    {status.status === 'won' ? 'Won' : 'Lost'}
                  </span>
                  <span className="text-2xl font-bold text-gray-900">{status.count}</span>
                </div>
                <div className="text-sm text-gray-600">Total Value: {formatCurrency(status.total_amount)}</div>
                <div className="text-sm text-gray-600">Avg Value: {formatCurrency(status.avg_amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMDashboardPage;
