import React, { useState, useEffect } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Save,
  Mail,
  Phone,
  Building,
  Search,
  Filter,
  BarChart3,
  TrendingUp,
  DollarSign,
  Target,
} from 'lucide-react';
import {
  CRMContact,
  CRMDeal,
  CRMStats,
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  getCRMStats,
} from '../services/crm';

interface CRMToolProps {
  workspaceId: string;
}

const CRMTool: React.FC<CRMToolProps> = ({ workspaceId }) => {
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [stats, setStats] = useState<CRMStats | null>(null);
  const [editingContact, setEditingContact] = useState<CRMContact | null>(null);
  const [view, setView] = useState<'contacts' | 'pipeline' | 'analytics'>('contacts');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [contactsData, dealsData, statsData] = await Promise.all([
        getContacts(workspaceId),
        getDeals(workspaceId),
        getCRMStats(workspaceId),
      ]);
      setContacts(contactsData);
      setDeals(dealsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading CRM data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewContact = () => {
    setEditingContact({
      id: '',
      workspace_id: workspaceId,
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      mobile: '',
      job_title: '',
      department: '',
      notes: '',
      tags: [],
      created_at: new Date(),
      updated_at: new Date(),
    });
  };

  const saveContact = async () => {
    if (!editingContact || !editingContact.first_name || !editingContact.last_name) return;

    try {
      if (editingContact.id) {
        await updateContact(workspaceId, editingContact.id, editingContact);
      } else {
        await createContact(workspaceId, editingContact);
      }
      setEditingContact(null);
      loadData();
    } catch (error) {
      console.error('Error saving contact:', error);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await deleteContact(workspaceId, contactId);
      loadData();
    } catch (error) {
      console.error('Error deleting contact:', error);
    }
  };

  const stageColors = {
    lead: 'bg-gray-100 text-gray-700',
    qualified: 'bg-blue-100 text-blue-700',
    proposal: 'bg-purple-100 text-purple-700',
    negotiation: 'bg-yellow-100 text-yellow-700',
    'closed-won': 'bg-green-100 text-green-700',
    'closed-lost': 'bg-red-100 text-red-700',
  };

  const filteredContacts = contacts.filter(
    (c) =>
      c.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (editingContact) {
    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {editingContact.id ? 'Edit Contact' : 'New Contact'}
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingContact(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveContact}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={editingContact.first_name}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, first_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={editingContact.last_name}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, last_name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={editingContact.email || ''}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, email: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={editingContact.phone || ''}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Title</label>
                <input
                  type="text"
                  value={editingContact.job_title || ''}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, job_title: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="CEO, Developer, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                <input
                  type="text"
                  value={editingContact.department || ''}
                  onChange={(e) =>
                    setEditingContact({ ...editingContact, department: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Engineering, Sales, etc."
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={editingContact.tags?.join(', ') || ''}
                onChange={(e) =>
                  setEditingContact({
                    ...editingContact,
                    tags: e.target.value.split(',').map((t) => t.trim()).filter(Boolean),
                  })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="VIP, lead, customer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editingContact.notes || ''}
                onChange={(e) =>
                  setEditingContact({ ...editingContact, notes: e.target.value })
                }
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Additional notes..."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">CRM</h2>
            <p className="text-gray-600 mt-1">Manage your contacts, deals, and pipeline</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setView('contacts')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'contacts'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Contacts
            </button>
            <button
              onClick={() => setView('pipeline')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'pipeline'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <Target className="w-4 h-4 inline mr-2" />
              Pipeline
            </button>
            <button
              onClick={() => setView('analytics')}
              className={`px-4 py-2 rounded-lg font-medium ${
                view === 'analytics'
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Analytics
            </button>
            {view === 'contacts' && (
              <button
                onClick={createNewContact}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Contact
              </button>
            )}
          </div>
        </div>

        {view === 'contacts' && (
          <>
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {filteredContacts.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg shadow">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">
                  {searchTerm
                    ? 'No contacts found matching your search.'
                    : 'No contacts yet. Add your first contact to get started!'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredContacts.map((contact) => (
                  <div key={contact.id} className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {contact.first_name} {contact.last_name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {contact.job_title}
                          {contact.company_name && ` at ${contact.company_name}`}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditingContact(contact)}
                          className="text-purple-600 hover:text-purple-700 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteContact(contact.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {contact.email && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Mail className="w-4 h-4" />
                          <a href={`mailto:${contact.email}`} className="hover:text-purple-600">
                            {contact.email}
                          </a>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Phone className="w-4 h-4" />
                          <a href={`tel:${contact.phone}`} className="hover:text-purple-600">
                            {contact.phone}
                          </a>
                        </div>
                      )}
                      {contact.company_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Building className="w-4 h-4" />
                          {contact.company_name}
                        </div>
                      )}
                    </div>

                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {contact.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {contact.deal_count !== undefined && contact.deal_count > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 text-sm text-gray-600">
                        <TrendingUp className="w-4 h-4 inline mr-1" />
                        {contact.deal_count} active {contact.deal_count === 1 ? 'deal' : 'deals'}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {view === 'pipeline' && (
          <PipelineView workspaceId={workspaceId} deals={deals} onUpdate={loadData} />
        )}

        {view === 'analytics' && stats && (
          <AnalyticsView stats={stats} />
        )}
      </div>
    </div>
  );
};

// Pipeline View Component (placeholder - will be enhanced)
const PipelineView: React.FC<{
  workspaceId: string;
  deals: CRMDeal[];
  onUpdate: () => void;
}> = ({ workspaceId, deals, onUpdate }) => {
  const stages: Array<CRMDeal['stage']> = [
    'lead',
    'qualified',
    'proposal',
    'negotiation',
    'closed-won',
    'closed-lost',
  ];

  const stageNames = {
    lead: 'Leads',
    qualified: 'Qualified',
    proposal: 'Proposal',
    negotiation: 'Negotiation',
    'closed-won': 'Won',
    'closed-lost': 'Lost',
  };

  const stageColors = {
    lead: 'border-gray-300 bg-gray-50',
    qualified: 'border-blue-300 bg-blue-50',
    proposal: 'border-purple-300 bg-purple-50',
    negotiation: 'border-yellow-300 bg-yellow-50',
    'closed-won': 'border-green-300 bg-green-50',
    'closed-lost': 'border-red-300 bg-red-50',
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {stages.map((stage) => {
        const stageDeals = deals.filter((d) => d.stage === stage);
        const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);

        return (
          <div key={stage} className={`border-2 rounded-lg p-4 ${stageColors[stage]}`}>
            <h3 className="font-semibold text-gray-900 mb-1">{stageNames[stage]}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {stageDeals.length} deals · ${stageValue.toLocaleString()}
            </p>

            <div className="space-y-2">
              {stageDeals.map((deal) => (
                <div
                  key={deal.id}
                  className="bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  <h4 className="font-medium text-gray-900 text-sm mb-1">{deal.title}</h4>
                  <p className="text-xs text-gray-600 mb-2">
                    {deal.company_name || deal.contact_first_name + ' ' + deal.contact_last_name}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-900">
                      ${deal.value.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">{deal.probability}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Analytics View Component
const AnalyticsView: React.FC<{ stats: CRMStats }> = ({ stats }) => {
  return (
    <div className="space-y-6">
      {/* Revenue Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Revenue</h3>
            <DollarSign className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${(stats.deals.total_revenue || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">{stats.deals.won} deals won</p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Pipeline Value</h3>
            <TrendingUp className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">
            ${(stats.deals.pipeline_value || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            ${(stats.deals.weighted_pipeline || 0).toLocaleString()} weighted
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Active Deals</h3>
            <Target className="w-5 h-5 text-purple-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.deals.total_deals}</p>
          <p className="text-sm text-gray-500 mt-1">
            {stats.deals.won + stats.deals.lost} closed
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600">Total Contacts</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.contacts.total_contacts}</p>
          <p className="text-sm text-gray-500 mt-1">{stats.contacts.customers} customers</p>
        </div>
      </div>

      {/* Lead Funnel */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Funnel</h3>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">New Leads</span>
              <span className="text-sm text-gray-600">{stats.contacts.new_leads}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-gray-500 h-2 rounded-full"
                style={{
                  width: `${(stats.contacts.new_leads / stats.contacts.total_contacts) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Contacted</span>
              <span className="text-sm text-gray-600">{stats.contacts.contacted}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{
                  width: `${(stats.contacts.contacted / stats.contacts.total_contacts) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Qualified</span>
              <span className="text-sm text-gray-600">{stats.contacts.qualified}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-purple-500 h-2 rounded-full"
                style={{
                  width: `${(stats.contacts.qualified / stats.contacts.total_contacts) * 100}%`,
                }}
              ></div>
            </div>
          </div>

          <div>
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">Customers</span>
              <span className="text-sm text-gray-600">{stats.contacts.customers}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{
                  width: `${(stats.contacts.customers / stats.contacts.total_contacts) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* Deal Pipeline Stats */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Pipeline Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-2xl font-bold text-gray-700">{stats.deals.leads}</p>
            <p className="text-sm text-gray-600">Leads</p>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <p className="text-2xl font-bold text-blue-700">{stats.deals.qualified}</p>
            <p className="text-sm text-gray-600">Qualified</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <p className="text-2xl font-bold text-purple-700">{stats.deals.proposals}</p>
            <p className="text-sm text-gray-600">Proposals</p>
          </div>
          <div className="text-center p-4 bg-yellow-50 rounded-lg">
            <p className="text-2xl font-bold text-yellow-700">{stats.deals.negotiations}</p>
            <p className="text-sm text-gray-600">Negotiations</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <p className="text-2xl font-bold text-green-700">{stats.deals.won}</p>
            <p className="text-sm text-gray-600">Won</p>
          </div>
          <div className="text-center p-4 bg-red-50 rounded-lg">
            <p className="text-2xl font-bold text-red-700">{stats.deals.lost}</p>
            <p className="text-sm text-gray-600">Lost</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CRMTool;
