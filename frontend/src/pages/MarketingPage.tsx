import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Megaphone,
  Mail,
  Share2,
  Palette,
  Handshake,
  ArrowLeft,
  Plus,
  X,
  Trash2,
  ExternalLink,
  Calendar,
  Send,
  Edit,
  Twitter,
  Facebook,
  Instagram,
  Linkedin,
  Award,
  DollarSign,
  Globe,
  Phone,
  User,
  FileText,
} from 'lucide-react';
import * as marketingService from '../services/marketing';

/**
 * MarketingPage Component
 * Hub for tournament marketing and promotion tools
 */
const MarketingPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam && ['emails', 'social', 'graphics', 'sponsors'].includes(toolParam)) {
      setActiveToolId(toolParam);
    }
  }, [searchParams]);

  const tools = [
    { id: 'emails', name: 'Email Campaigns', icon: Mail, color: 'purple', description: 'Send updates and announcements to participants' },
    { id: 'social', name: 'Social Media', icon: Share2, color: 'blue', description: 'Manage social media posts and promotion' },
    { id: 'graphics', name: 'Graphics & Posters', icon: Palette, color: 'pink', description: 'Create promotional materials and graphics' },
    { id: 'sponsors', name: 'Sponsorships', icon: Handshake, color: 'green', description: 'Manage sponsors and partnerships' },
  ];

  const renderTool = (toolId: string) => {
    if (!workspaceId) return null;

    switch (toolId) {
      case 'emails':
        return <EmailCampaignsTool workspaceId={workspaceId} />;
      case 'social':
        return <SocialMediaTool workspaceId={workspaceId} />;
      case 'graphics':
        return <GraphicsTool workspaceId={workspaceId} />;
      case 'sponsors':
        return <SponsorshipsTool workspaceId={workspaceId} />;
      default:
        return null;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { gradient: string; border: string; bg: string }> = {
      purple: { gradient: 'from-purple-500 to-purple-600', border: 'border-purple-500', bg: 'bg-purple-50' },
      blue: { gradient: 'from-blue-500 to-blue-600', border: 'border-blue-500', bg: 'bg-blue-50' },
      pink: { gradient: 'from-pink-500 to-pink-600', border: 'border-pink-500', bg: 'bg-pink-50' },
      green: { gradient: 'from-green-500 to-green-600', border: 'border-green-500', bg: 'bg-green-50' },
    };
    return colors[color] || colors.blue;
  };

  if (activeToolId) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/marketing`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketing Tools</span>
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            {tools.find((t) => t.id === activeToolId)?.name}
          </h1>
        </div>
        <div className="flex-1 overflow-auto">{renderTool(activeToolId)}</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gradient-to-br from-gray-50 via-white to-gray-50">
      <div className="max-w-7xl mx-auto p-8">
        <div className="mb-8">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="w-8 h-8 text-purple-600" />
            <h1 className="text-3xl font-bold text-gray-900">Marketing & Promotion</h1>
          </div>
          <p className="text-gray-600">
            Tools to help you promote your tournament and engage with participants
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colorClasses = getColorClasses(tool.color);

            return (
              <div
                key={tool.id}
                onClick={() => navigate(`/workspace/${workspaceId}/marketing?tool=${tool.id}`)}
                className="group cursor-pointer bg-white rounded-xl shadow-lg border-2 border-gray-200 hover:border-gray-900 p-6 transition-all hover:shadow-xl"
              >
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${colorClasses.gradient} flex items-center justify-center mb-4`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{tool.name}</h3>
                <p className="text-gray-600 mb-4">{tool.description}</p>
                <div className="flex items-center text-purple-600 font-medium group-hover:gap-2 transition-all">
                  <span>Open Tool</span>
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">→</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============ SPONSORS TOOL ============

const SponsorshipsTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [sponsors, setSponsors] = useState<marketingService.Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSponsor, setEditingSponsor] = useState<marketingService.Sponsor | null>(null);

  useEffect(() => {
    loadSponsors();
  }, [workspaceId]);

  const loadSponsors = async () => {
    try {
      setLoading(true);
      const data = await marketingService.getSponsors(workspaceId);
      setSponsors(data);
    } catch (error) {
      toast.error('Failed to load sponsors');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sponsorId: string) => {
    if (!confirm('Are you sure you want to delete this sponsor?')) return;

    try {
      await marketingService.deleteSponsor(workspaceId, sponsorId);
      toast.success('Sponsor deleted successfully');
      loadSponsors();
    } catch (error) {
      toast.error('Failed to delete sponsor');
    }
  };

  const getTierColor = (tier: string) => {
    const colors: Record<string, string> = {
      gold: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      silver: 'bg-gray-100 text-gray-800 border-gray-300',
      bronze: 'bg-orange-100 text-orange-800 border-orange-300',
      custom: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    return colors[tier] || colors.custom;
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Sponsorships</h2>
          <button
            onClick={() => {
              setEditingSponsor(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Sponsor
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : sponsors.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="text-center py-12 text-gray-500">
              <Handshake className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No sponsors yet</p>
              <p className="text-sm">Track sponsors, partnerships, and sponsorship packages</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sponsors.map((sponsor) => (
              <div key={sponsor.id} className="bg-white rounded-lg border-2 border-gray-200 p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{sponsor.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-md border ${getTierColor(sponsor.tier)}`}>
                        {sponsor.tier.toUpperCase()}
                      </span>
                    </div>
                    {sponsor.contribution_amount && (
                      <p className="text-sm text-gray-600 flex items-center gap-1 mb-2">
                        <DollarSign className="w-4 h-4" />
                        ${sponsor.contribution_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(sponsor.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {sponsor.benefits && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{sponsor.benefits}</p>
                )}

                <div className="space-y-2 text-sm text-gray-600">
                  {sponsor.contact_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {sponsor.contact_name}
                    </div>
                  )}
                  {sponsor.contact_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {sponsor.contact_email}
                    </div>
                  )}
                  {sponsor.website_url && (
                    <a
                      href={sponsor.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700"
                    >
                      <Globe className="w-4 h-4" />
                      Visit Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <SponsorModal
            workspaceId={workspaceId}
            sponsor={editingSponsor}
            onClose={() => {
              setShowModal(false);
              setEditingSponsor(null);
            }}
            onSuccess={() => {
              setShowModal(false);
              setEditingSponsor(null);
              loadSponsors();
            }}
          />
        )}
      </div>
    </div>
  );
};

const SponsorModal: React.FC<{
  workspaceId: string;
  sponsor: marketingService.Sponsor | null;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ workspaceId, sponsor, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<marketingService.CreateSponsorData>({
    name: sponsor?.name || '',
    tier: sponsor?.tier || 'bronze',
    logoUrl: sponsor?.logo_url || '',
    websiteUrl: sponsor?.website_url || '',
    contactName: sponsor?.contact_name || '',
    contactEmail: sponsor?.contact_email || '',
    contactPhone: sponsor?.contact_phone || '',
    contributionAmount: sponsor?.contribution_amount || undefined,
    benefits: sponsor?.benefits || '',
    notes: sponsor?.notes || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      if (sponsor) {
        await marketingService.updateSponsor(workspaceId, sponsor.id, formData);
        toast.success('Sponsor updated successfully');
      } else {
        await marketingService.createSponsor(workspaceId, formData);
        toast.success('Sponsor added successfully');
      }
      onSuccess();
    } catch (error) {
      toast.error('Failed to save sponsor');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">
            {sponsor ? 'Edit Sponsor' : 'Add Sponsor'}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tier</label>
            <select
              value={formData.tier}
              onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="bronze">Bronze</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo URL</label>
              <input
                type="url"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
              <input
                type="url"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input
                type="text"
                value={formData.contactName}
                onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input
                type="email"
                value={formData.contactEmail}
                onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
              <input
                type="tel"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Amount ($)</label>
            <input
              type="number"
              step="0.01"
              value={formData.contributionAmount || ''}
              onChange={(e) => setFormData({ ...formData, contributionAmount: parseFloat(e.target.value) || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
            <textarea
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="What benefits does this sponsor receive?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Additional notes..."
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Saving...' : sponsor ? 'Update Sponsor' : 'Add Sponsor'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ EMAIL CAMPAIGNS TOOL ============

const EmailCampaignsTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [campaigns, setCampaigns] = useState<marketingService.EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadCampaigns();
  }, [workspaceId]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await marketingService.getEmailCampaigns(workspaceId);
      setCampaigns(data);
    } catch (error) {
      toast.error('Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (campaignId: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await marketingService.deleteEmailCampaign(workspaceId, campaignId);
      toast.success('Campaign deleted successfully');
      loadCampaigns();
    } catch (error) {
      toast.error('Failed to delete campaign');
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      sent: 'bg-green-100 text-green-800',
    };
    return colors[status] || colors.draft;
  };

  const totalSent = campaigns.filter((c) => c.status === 'sent').length;

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Email Campaigns</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Campaigns</p>
            <p className="text-2xl font-bold text-gray-900">{campaigns.length}</p>
          </div>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Sent</p>
            <p className="text-2xl font-bold text-gray-900">{totalSent}</p>
          </div>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Draft</p>
            <p className="text-2xl font-bold text-gray-900">
              {campaigns.filter((c) => c.status === 'draft').length}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="text-center py-12 text-gray-500">
              <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No email campaigns yet</p>
              <p className="text-sm">Create email campaigns to keep participants informed</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-bold text-gray-900">{campaign.name}</h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      <strong>Subject:</strong> {campaign.subject}
                    </p>
                    <p className="text-sm text-gray-500 line-clamp-2">{campaign.body}</p>
                    {campaign.scheduled_at && (
                      <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDelete(campaign.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <EmailCampaignModal
            workspaceId={workspaceId}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              loadCampaigns();
            }}
          />
        )}
      </div>
    </div>
  );
};

const EmailCampaignModal: React.FC<{
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ workspaceId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<marketingService.CreateEmailCampaignData>({
    name: '',
    subject: '',
    body: '',
    scheduledAt: undefined,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await marketingService.createEmailCampaign(workspaceId, formData);
      toast.success('Campaign created successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create campaign');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Create Email Campaign</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Tournament Registration Open"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="e.g., Join Our Spring Chess Tournament!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Body <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Write your email content here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Send (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt || ''}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft</p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ SOCIAL MEDIA TOOL ============

const SocialMediaTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [posts, setPosts] = useState<marketingService.SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadPosts();
  }, [workspaceId]);

  const loadPosts = async () => {
    try {
      setLoading(true);
      const data = await marketingService.getSocialMediaPosts(workspaceId);
      setPosts(data);
    } catch (error) {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await marketingService.deleteSocialMediaPost(workspaceId, postId);
      toast.success('Post deleted successfully');
      loadPosts();
    } catch (error) {
      toast.error('Failed to delete post');
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, any> = {
      twitter: Twitter,
      facebook: Facebook,
      instagram: Instagram,
      linkedin: Linkedin,
    };
    return icons[platform] || Share2;
  };

  const getPlatformColor = (platform: string) => {
    const colors: Record<string, string> = {
      twitter: 'bg-sky-100 text-sky-800',
      facebook: 'bg-blue-100 text-blue-800',
      instagram: 'bg-pink-100 text-pink-800',
      linkedin: 'bg-indigo-100 text-indigo-800',
    };
    return colors[platform] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      published: 'bg-green-100 text-green-800',
    };
    return colors[status] || colors.draft;
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Social Media Posts</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Post
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="text-center py-12 text-gray-500">
              <Share2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No social posts yet</p>
              <p className="text-sm">Schedule posts to promote your tournament on social media</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((post) => {
              const PlatformIcon = getPlatformIcon(post.platform);
              return (
                <div key={post.id} className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${getPlatformColor(post.platform)}`}>
                        <PlatformIcon className="w-3 h-3 inline mr-1" />
                        {post.platform}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-md ${getStatusColor(post.status)}`}>
                        {post.status}
                      </span>
                    </div>
                    <button
                      onClick={() => handleDelete(post.id)}
                      className="text-red-600 hover:text-red-700 p-1 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{post.content}</p>
                  {post.scheduled_at && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(post.scheduled_at).toLocaleString()}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {showModal && (
          <SocialMediaModal
            workspaceId={workspaceId}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              loadPosts();
            }}
          />
        )}
      </div>
    </div>
  );
};

const SocialMediaModal: React.FC<{
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ workspaceId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<marketingService.CreateSocialMediaPostData>({
    platform: 'twitter',
    content: '',
    mediaUrl: undefined,
    scheduledAt: undefined,
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await marketingService.createSocialMediaPost(workspaceId, formData);
      toast.success('Post created successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Create Social Media Post</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Platform <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="twitter">Twitter</option>
              <option value="facebook">Facebook</option>
              <option value="instagram">Instagram</option>
              <option value="linkedin">LinkedIn</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write your post content here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Media URL (Optional)</label>
            <input
              type="url"
              value={formData.mediaUrl || ''}
              onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Schedule Post (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt || ''}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft</p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Post'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ GRAPHICS TOOL ============

const GraphicsTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [templates, setTemplates] = useState<marketingService.PosterTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    loadTemplates();
  }, [workspaceId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await marketingService.getPosterTemplates(workspaceId);
      setTemplates(data);
    } catch (error) {
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      await marketingService.deletePosterTemplate(workspaceId, templateId);
      toast.success('Template deleted successfully');
      loadTemplates();
    } catch (error) {
      toast.error('Failed to delete template');
    }
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      poster: 'bg-purple-100 text-purple-800',
      banner: 'bg-blue-100 text-blue-800',
      social_media: 'bg-pink-100 text-pink-800',
    };
    return colors[type] || colors.poster;
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Graphics & Posters</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Design
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">Loading...</div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
            <div className="text-center py-12 text-gray-500">
              <Palette className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">No graphics yet</p>
              <p className="text-sm">Create posters, banners, and promotional graphics for your tournament</p>
              <button
                onClick={() => setShowModal(true)}
                className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
              >
                Get Started
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.map((template) => (
              <div key={template.id} className="bg-white rounded-lg border-2 border-gray-200 p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-md ${getTypeColor(template.template_type)}`}>
                      {template.template_type.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-md transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
                  <Palette className="w-12 h-12 text-gray-300 mx-auto" />
                  <p className="text-xs text-gray-500 text-center mt-2">Design Preview</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <GraphicsModal
            workspaceId={workspaceId}
            onClose={() => setShowModal(false)}
            onSuccess={() => {
              setShowModal(false);
              loadTemplates();
            }}
          />
        )}
      </div>
    </div>
  );
};

const GraphicsModal: React.FC<{
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ workspaceId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<marketingService.CreatePosterTemplateData>({
    name: '',
    templateType: 'poster',
    designData: { backgroundColor: '#ffffff', title: '', description: '' },
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await marketingService.createPosterTemplate(workspaceId, formData);
      toast.success('Template created successfully');
      onSuccess();
    } catch (error) {
      toast.error('Failed to create template');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-gray-900">Create Design Template</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="e.g., Tournament Poster 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Template Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.templateType}
              onChange={(e) => setFormData({ ...formData, templateType: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            >
              <option value="poster">Poster</option>
              <option value="banner">Banner</option>
              <option value="social_media">Social Media</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              value={formData.designData.title || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  designData: { ...formData.designData, title: e.target.value },
                })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Design title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.designData.description || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  designData: { ...formData.designData, description: e.target.value },
                })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder="Design description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Background Color</label>
            <input
              type="color"
              value={formData.designData.backgroundColor || '#ffffff'}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  designData: { ...formData.designData, backgroundColor: e.target.value },
                })
              }
              className="w-full h-10 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-pink-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MarketingPage;
