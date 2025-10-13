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
  Eye,
  TrendingUp,
  Users,
  Filter,
  Search,
  Download,
  Copy,
  Check,
  Image as ImageIcon,
  BarChart3,
  Clock,
  Briefcase,
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
    {
      id: 'sponsors',
      name: 'Sponsorships',
      icon: Handshake,
      color: 'green',
      description: 'Manage sponsors and partnerships with visual branding',
      features: ['Logo Management', 'Tier System', 'Contact Tracking']
    },
    {
      id: 'emails',
      name: 'Email Campaigns',
      icon: Mail,
      color: 'purple',
      description: 'Create beautiful email campaigns with analytics',
      features: ['Rich Editor', 'Scheduling', 'Analytics']
    },
    {
      id: 'social',
      name: 'Social Media',
      icon: Share2,
      color: 'blue',
      description: 'Schedule posts across multiple platforms',
      features: ['Multi-Platform', 'Preview', 'Scheduling']
    },
    {
      id: 'graphics',
      name: 'Graphics & Posters',
      icon: Palette,
      color: 'pink',
      description: 'Design promotional materials with templates',
      features: ['Templates', 'Export', 'Branding']
    },
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
    const colors: Record<string, { gradient: string; border: string; bg: string; text: string }> = {
      purple: { gradient: 'from-purple-500 to-purple-600', border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-600' },
      blue: { gradient: 'from-blue-500 to-blue-600', border: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-600' },
      pink: { gradient: 'from-pink-500 to-pink-600', border: 'border-pink-500', bg: 'bg-pink-50', text: 'text-pink-600' },
      green: { gradient: 'from-green-500 to-green-600', border: 'border-green-500', bg: 'bg-green-50', text: 'text-green-600' },
    };
    return colors[color] || colors.blue;
  };

  if (activeToolId) {
    return (
      <div className="h-full flex flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
          <button
            onClick={() => navigate(`/workspace/${workspaceId}/marketing`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Marketing Tools</span>
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">
              {tools.find((t) => t.id === activeToolId)?.name}
            </h1>
          </div>
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
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Workspace</span>
          </button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl">
              <Megaphone className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Marketing & Promotion</h1>
              <p className="text-gray-600">
                Professional tools to promote your tournament and engage with participants
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colorClasses = getColorClasses(tool.color);

            return (
              <div
                key={tool.id}
                onClick={() => navigate(`/workspace/${workspaceId}/marketing?tool=${tool.id}`)}
                className="group cursor-pointer bg-white rounded-2xl shadow-lg border-2 border-gray-200 hover:border-gray-400 p-6 transition-all duration-300 hover:shadow-2xl hover:scale-105"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${colorClasses.gradient} flex items-center justify-center shadow-lg`}>
                    <Icon className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{tool.name}</h3>
                    <p className="text-gray-600 text-sm">{tool.description}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-4">
                  {tool.features.map((feature) => (
                    <span
                      key={feature}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${colorClasses.bg} ${colorClasses.text}`}
                    >
                      {feature}
                    </span>
                  ))}
                </div>

                <div className="flex items-center text-gray-900 font-medium group-hover:gap-2 transition-all">
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
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTier, setFilterTier] = useState<string>('all');

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
    const colors: Record<string, { bg: string; text: string; border: string; icon: string }> = {
      gold: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300', icon: '🥇' },
      silver: { bg: 'bg-gray-200', text: 'text-gray-800', border: 'border-gray-400', icon: '🥈' },
      bronze: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', icon: '🥉' },
      custom: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', icon: '⭐' },
    };
    return colors[tier] || colors.custom;
  };

  const filteredSponsors = sponsors.filter((sponsor) => {
    const matchesSearch = sponsor.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier === 'all' || sponsor.tier === filterTier;
    return matchesSearch && matchesTier;
  });

  const totalContributions = sponsors.reduce((sum, s) => sum + (s.contribution_amount || 0), 0);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Handshake className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{sponsors.length}</p>
            <p className="text-green-100 text-sm">Total Sponsors</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Award className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-2xl font-bold">{sponsors.filter((s) => s.tier === 'gold').length}</p>
            <p className="text-yellow-100 text-sm">Gold Sponsors</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-2xl font-bold">${totalContributions.toLocaleString()}</p>
            <p className="text-blue-100 text-sm">Total Contributions</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Users className="w-8 h-8 opacity-80" />
            </div>
            <p className="text-2xl font-bold">{sponsors.filter((s) => s.contact_email).length}</p>
            <p className="text-purple-100 text-sm">With Contacts</p>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search sponsors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="all">All Tiers</option>
                <option value="gold">Gold</option>
                <option value="silver">Silver</option>
                <option value="bronze">Bronze</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <button
              onClick={() => {
                setEditingSponsor(null);
                setShowModal(true);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Add Sponsor
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
            <p className="text-gray-500 mt-4">Loading sponsors...</p>
          </div>
        ) : filteredSponsors.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12">
            <div className="text-center text-gray-500">
              <Handshake className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              {searchTerm || filterTier !== 'all' ? (
                <>
                  <p className="text-lg mb-2">No sponsors match your filters</p>
                  <p className="text-sm">Try adjusting your search or filter criteria</p>
                </>
              ) : (
                <>
                  <p className="text-lg mb-2">No sponsors yet</p>
                  <p className="text-sm mb-6">Start building your sponsor portfolio</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-md"
                  >
                    Add Your First Sponsor
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSponsors.map((sponsor) => {
              const tierColors = getTierColor(sponsor.tier);
              return (
                <div
                  key={sponsor.id}
                  className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Logo/Header Section */}
                  <div className="relative h-32 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center overflow-hidden">
                    {sponsor.logo_url ? (
                      <img
                        src={sponsor.logo_url}
                        alt={sponsor.name}
                        className="w-full h-full object-contain p-4"
                      />
                    ) : (
                      <div className="text-center">
                        <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs text-gray-500">No logo</p>
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(sponsor.id)}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Content Section */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{sponsor.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full border ${tierColors.bg} ${tierColors.text} ${tierColors.border}`}>
                          <span>{tierColors.icon}</span>
                          {sponsor.tier.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {sponsor.contribution_amount && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-xl font-bold text-green-900">
                              ${sponsor.contribution_amount.toLocaleString()}
                            </p>
                            <p className="text-xs text-green-600">Contribution</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {sponsor.benefits && (
                      <div className="mb-3 p-3 bg-purple-50 rounded-lg border border-purple-100">
                        <p className="text-xs font-semibold text-purple-900 mb-1">Benefits</p>
                        <p className="text-sm text-purple-700 line-clamp-2">{sponsor.benefits}</p>
                      </div>
                    )}

                    <div className="space-y-2 text-sm">
                      {sponsor.contact_name && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{sponsor.contact_name}</span>
                        </div>
                      )}
                      {sponsor.contact_email && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Mail className="w-4 h-4 text-gray-400" />
                          <span className="truncate">{sponsor.contact_email}</span>
                        </div>
                      )}
                      {sponsor.website_url && (
                        <a
                          href={sponsor.website_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Globe className="w-4 h-4" />
                          <span className="truncate">Visit Website</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        setEditingSponsor(sponsor);
                        setShowModal(true);
                      }}
                      className="mt-4 w-full py-2 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    >
                      <Edit className="w-4 h-4 inline mr-2" />
                      Edit Sponsor
                    </button>
                  </div>
                </div>
              );
            })}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold">
              {sponsor ? 'Edit Sponsor' : 'Add New Sponsor'}
            </h3>
            <p className="text-green-100 text-sm">Manage sponsor details and partnership information</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-green-500 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-green-600" />
              Basic Information
            </h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sponsor Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="e.g., Acme Corporation"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tier</label>
                <select
                  value={formData.tier}
                  onChange={(e) => setFormData({ ...formData, tier: e.target.value as any })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                >
                  <option value="gold">🥇 Gold</option>
                  <option value="silver">🥈 Silver</option>
                  <option value="bronze">🥉 Bronze</option>
                  <option value="custom">⭐ Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contribution ($)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="number"
                    step="0.01"
                    value={formData.contributionAmount || ''}
                    onChange={(e) => setFormData({ ...formData, contributionAmount: parseFloat(e.target.value) || undefined })}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                    placeholder="5000.00"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Branding Section */}
          <div className="space-y-4 pt-4 border-t-2 border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-green-600" />
              Branding
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Logo URL</label>
                <input
                  type="url"
                  value={formData.logoUrl}
                  onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="https://example.com/logo.png"
                />
                {formData.logoUrl && (
                  <div className="mt-2 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                    <p className="text-xs text-gray-600 mb-2">Preview:</p>
                    <img src={formData.logoUrl} alt="Logo preview" className="h-20 object-contain" />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Website URL</label>
                <input
                  type="url"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="https://example.com"
                />
              </div>
            </div>
          </div>

          {/* Contact Section */}
          <div className="space-y-4 pt-4 border-t-2 border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5 text-green-600" />
              Contact Information
            </h4>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="john@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="+1 234 567 8900"
                />
              </div>
            </div>
          </div>

          {/* Additional Details */}
          <div className="space-y-4 pt-4 border-t-2 border-gray-100">
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              Additional Details
            </h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sponsorship Benefits</label>
              <textarea
                value={formData.benefits}
                onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="Logo on website, booth at event, social media mentions..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Internal Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="Internal notes about this sponsor..."
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-6 border-t-2 border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md"
            >
              {submitting ? 'Saving...' : sponsor ? 'Update Sponsor' : 'Add Sponsor'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ EMAIL CAMPAIGNS TOOL (Enhanced) ============

const EmailCampaignsTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [campaigns, setCampaigns] = useState<marketingService.EmailCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [previewCampaign, setPreviewCampaign] = useState<marketingService.EmailCampaign | null>(null);

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
    const colors: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Edit },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      sent: { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
    };
    return colors[status] || colors.draft;
  };

  const totalSent = campaigns.filter((c) => c.status === 'sent').length;
  const scheduled = campaigns.filter((c) => c.status === 'scheduled').length;
  const drafts = campaigns.filter((c) => c.status === 'draft').length;

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Mail className="w-8 h-8 opacity-80" />
              <BarChart3 className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{campaigns.length}</p>
            <p className="text-purple-100 text-sm">Total Campaigns</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Send className="w-8 h-8 opacity-80" />
              <Check className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{totalSent}</p>
            <p className="text-green-100 text-sm">Sent</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Clock className="w-8 h-8 opacity-80" />
              <Calendar className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{scheduled}</p>
            <p className="text-blue-100 text-sm">Scheduled</p>
          </div>

          <div className="bg-gradient-to-br from-gray-500 to-gray-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Edit className="w-8 h-8 opacity-80" />
              <FileText className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{drafts}</p>
            <p className="text-gray-100 text-sm">Drafts</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Email Campaigns</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Campaign
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-purple-600"></div>
            <p className="text-gray-500 mt-4">Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12">
            <div className="text-center text-gray-500">
              <Mail className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold mb-2">No email campaigns yet</p>
              <p className="text-sm mb-6">Create your first campaign to engage with participants</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-md"
              >
                Create First Campaign
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map((campaign) => {
              const statusColors = getStatusColor(campaign.status);
              const StatusIcon = statusColors.icon;

              return (
                <div
                  key={campaign.id}
                  className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:shadow-lg transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-xl font-bold text-gray-900">{campaign.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                          <StatusIcon className="w-3 h-3" />
                          {campaign.status.toUpperCase()}
                        </span>
                      </div>

                      <div className="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <p className="text-sm font-semibold text-gray-700 mb-1">
                          <Mail className="w-4 h-4 inline mr-1" />
                          Subject:
                        </p>
                        <p className="text-gray-900">{campaign.subject}</p>
                      </div>

                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{campaign.body}</p>

                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        {campaign.scheduled_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            Scheduled: {new Date(campaign.scheduled_at).toLocaleString()}
                          </span>
                        )}
                        {campaign.sent_at && (
                          <span className="flex items-center gap-1">
                            <Check className="w-4 h-4 text-green-600" />
                            Sent: {new Date(campaign.sent_at).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => setPreviewCampaign(campaign)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(campaign.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

        {previewCampaign && (
          <EmailPreviewModal
            campaign={previewCampaign}
            onClose={() => setPreviewCampaign(null)}
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold">Create Email Campaign</h3>
            <p className="text-purple-100 text-sm">Compose and schedule your campaign</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-purple-500 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campaign Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="e.g., Tournament Registration Open"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject Line <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              placeholder="e.g., Join Our Spring Chess Tournament!"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              value={formData.body}
              onChange={(e) => setFormData({ ...formData, body: e.target.value })}
              rows={10}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all font-mono text-sm"
              placeholder="Write your email content here..."
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.body.length} characters
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Schedule Send (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt || ''}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value || undefined })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft</p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 font-semibold shadow-md"
            >
              {submitting ? 'Creating...' : 'Create Campaign'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EmailPreviewModal: React.FC<{
  campaign: marketingService.EmailCampaign;
  onClose: () => void;
}> = ({ campaign, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold">Email Preview</h3>
            <p className="text-blue-100 text-sm">{campaign.name}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="border-2 border-gray-200 rounded-lg p-6 bg-gray-50">
            <div className="bg-white rounded-lg p-6 shadow-sm">
              <div className="border-b pb-4 mb-4">
                <p className="text-sm text-gray-600">Subject:</p>
                <p className="text-xl font-bold text-gray-900">{campaign.subject}</p>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700">{campaign.body}</div>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="mt-6 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ SOCIAL MEDIA TOOL (Enhanced) ============

const SocialMediaTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const [posts, setPosts] = useState<marketingService.SocialMediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filterPlatform, setFilterPlatform] = useState<string>('all');

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
    const colors: Record<string, { bg: string; text: string; gradient: string }> = {
      twitter: { bg: 'bg-sky-100', text: 'text-sky-800', gradient: 'from-sky-500 to-sky-600' },
      facebook: { bg: 'bg-blue-100', text: 'text-blue-800', gradient: 'from-blue-500 to-blue-600' },
      instagram: { bg: 'bg-pink-100', text: 'text-pink-800', gradient: 'from-pink-500 to-pink-600' },
      linkedin: { bg: 'bg-indigo-100', text: 'text-indigo-800', gradient: 'from-indigo-500 to-indigo-600' },
    };
    return colors[platform] || colors.twitter;
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, { bg: string; text: string; icon: any }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', icon: Edit },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', icon: Clock },
      published: { bg: 'bg-green-100', text: 'text-green-800', icon: Check },
    };
    return colors[status] || colors.draft;
  };

  const filteredPosts = posts.filter((post) => {
    return filterPlatform === 'all' || post.platform === filterPlatform;
  });

  const platformCounts = {
    twitter: posts.filter((p) => p.platform === 'twitter').length,
    facebook: posts.filter((p) => p.platform === 'facebook').length,
    instagram: posts.filter((p) => p.platform === 'instagram').length,
    linkedin: posts.filter((p) => p.platform === 'linkedin').length,
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Platform Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-sky-500 to-sky-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Twitter className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{platformCounts.twitter}</p>
            <p className="text-sky-100 text-sm">Twitter Posts</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Facebook className="w-8 h-8 opacity-80" />
              <Users className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{platformCounts.facebook}</p>
            <p className="text-blue-100 text-sm">Facebook Posts</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Instagram className="w-8 h-8 opacity-80" />
              <ImageIcon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{platformCounts.instagram}</p>
            <p className="text-pink-100 text-sm">Instagram Posts</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Linkedin className="w-8 h-8 opacity-80" />
              <Briefcase className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold">{platformCounts.linkedin}</p>
            <p className="text-indigo-100 text-sm">LinkedIn Posts</p>
          </div>
        </div>

        {/* Filter and Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border-2 border-gray-200 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterPlatform}
                onChange={(e) => setFilterPlatform(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Platforms</option>
                <option value="twitter">Twitter</option>
                <option value="facebook">Facebook</option>
                <option value="instagram">Instagram</option>
                <option value="linkedin">LinkedIn</option>
              </select>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
            >
              <Plus className="w-5 h-5" />
              Create Post
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-blue-600"></div>
            <p className="text-gray-500 mt-4">Loading posts...</p>
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12">
            <div className="text-center text-gray-500">
              <Share2 className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              {filterPlatform !== 'all' ? (
                <>
                  <p className="text-lg mb-2">No {filterPlatform} posts yet</p>
                  <p className="text-sm">Create your first post for {filterPlatform}</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-semibold mb-2">No social posts yet</p>
                  <p className="text-sm mb-6">Start promoting your tournament on social media</p>
                  <button
                    onClick={() => setShowModal(true)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    Create First Post
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredPosts.map((post) => {
              const PlatformIcon = getPlatformIcon(post.platform);
              const platformColors = getPlatformColor(post.platform);
              const statusColors = getStatusColor(post.status);
              const StatusIcon = statusColors.icon;
              const charLimit = post.platform === 'twitter' ? 280 : 3000;
              const isOverLimit = post.content.length > charLimit;

              return (
                <div
                  key={post.id}
                  className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Platform Header */}
                  <div className={`h-2 bg-gradient-to-r ${platformColors.gradient}`} />

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${platformColors.bg}`}>
                          <PlatformIcon className={`w-5 h-5 ${platformColors.text}`} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 capitalize">{post.platform}</p>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${statusColors.bg} ${statusColors.text}`}>
                            <StatusIcon className="w-3 h-3" />
                            {post.status}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Post Preview */}
                    <div className="mb-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-4">{post.content}</p>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-200">
                        <span className={`text-xs ${isOverLimit ? 'text-red-600' : 'text-gray-500'}`}>
                          {post.content.length} / {charLimit} characters
                        </span>
                        {isOverLimit && (
                          <span className="text-xs text-red-600 font-medium">Over limit!</span>
                        )}
                      </div>
                    </div>

                    {post.media_url && (
                      <div className="mb-3 p-2 bg-gray-100 rounded-lg">
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <ImageIcon className="w-4 h-4" />
                          <span className="truncate">Media attached</span>
                        </div>
                      </div>
                    )}

                    {post.scheduled_at && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Clock className="w-4 h-4" />
                        {new Date(post.scheduled_at).toLocaleString()}
                      </div>
                    )}
                  </div>
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

  const platformLimits: Record<string, number> = {
    twitter: 280,
    facebook: 3000,
    instagram: 2200,
    linkedin: 3000,
  };

  const charLimit = platformLimits[formData.platform];
  const isOverLimit = formData.content.length > charLimit;

  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, any> = {
      twitter: Twitter,
      facebook: Facebook,
      instagram: Instagram,
      linkedin: Linkedin,
    };
    return icons[platform] || Share2;
  };

  const PlatformIcon = getPlatformIcon(formData.platform);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold">Create Social Media Post</h3>
            <p className="text-blue-100 text-sm">Schedule your post across platforms</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-500 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platform <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-3">
              {['twitter', 'facebook', 'instagram', 'linkedin'].map((platform) => {
                const Icon = getPlatformIcon(platform);
                const isSelected = formData.platform === platform;
                return (
                  <button
                    key={platform}
                    type="button"
                    onClick={() => setFormData({ ...formData, platform: platform as any })}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                    <p className={`text-xs font-medium capitalize ${isSelected ? 'text-blue-900' : 'text-gray-700'}`}>
                      {platform}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <textarea
                required
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={8}
                className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all ${
                  isOverLimit ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={`What's happening? (Max ${charLimit} characters for ${formData.platform})`}
              />
              <div className="absolute bottom-3 right-3">
                <span className={`text-sm font-medium ${isOverLimit ? 'text-red-600' : formData.content.length > charLimit * 0.9 ? 'text-yellow-600' : 'text-gray-500'}`}>
                  {formData.content.length} / {charLimit}
                </span>
              </div>
            </div>
            {isOverLimit && (
              <p className="text-xs text-red-600 mt-1">
                Content exceeds {formData.platform} character limit by {formData.content.length - charLimit} characters
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Media URL (Optional)
            </label>
            <input
              type="url"
              value={formData.mediaUrl || ''}
              onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value || undefined })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="https://example.com/image.jpg"
            />
            {formData.mediaUrl && (
              <div className="mt-2 p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
                <p className="text-xs text-gray-600 mb-2">Preview:</p>
                <img src={formData.mediaUrl} alt="Media preview" className="h-32 rounded object-cover" />
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Clock className="w-4 h-4 inline mr-1" />
              Schedule Post (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt || ''}
              onChange={(e) => setFormData({ ...formData, scheduledAt: e.target.value || undefined })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to save as draft</p>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-100">
            <button
              type="submit"
              disabled={submitting || isOverLimit}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md"
            >
              {submitting ? 'Creating...' : 'Create Post'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============ GRAPHICS TOOL (Enhanced) ============

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
    const colors: Record<string, { bg: string; text: string; gradient: string; icon: any }> = {
      poster: { bg: 'bg-purple-100', text: 'text-purple-800', gradient: 'from-purple-500 to-purple-600', icon: FileText },
      banner: { bg: 'bg-blue-100', text: 'text-blue-800', gradient: 'from-blue-500 to-blue-600', icon: ImageIcon },
      social_media: { bg: 'bg-pink-100', text: 'text-pink-800', gradient: 'from-pink-500 to-pink-600', icon: Share2 },
    };
    return colors[type] || colors.poster;
  };

  const typeCounts = {
    poster: templates.filter((t) => t.template_type === 'poster').length,
    banner: templates.filter((t) => t.template_type === 'banner').length,
    social_media: templates.filter((t) => t.template_type === 'social_media').length,
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Template Type Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-8 h-8 opacity-80" />
              <Award className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{typeCounts.poster}</p>
            <p className="text-purple-100 text-sm">Poster Templates</p>
          </div>

          <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <ImageIcon className="w-8 h-8 opacity-80" />
              <TrendingUp className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{typeCounts.banner}</p>
            <p className="text-blue-100 text-sm">Banner Templates</p>
          </div>

          <div className="bg-gradient-to-br from-pink-500 to-pink-600 text-white rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <Share2 className="w-8 h-8 opacity-80" />
              <Users className="w-5 h-5" />
            </div>
            <p className="text-3xl font-bold">{typeCounts.social_media}</p>
            <p className="text-pink-100 text-sm">Social Media Templates</p>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Design Templates</h2>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            New Template
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-pink-600"></div>
            <p className="text-gray-500 mt-4">Loading templates...</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-gray-300 p-12">
            <div className="text-center text-gray-500">
              <Palette className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-xl font-semibold mb-2">No graphics templates yet</p>
              <p className="text-sm mb-6">Create your first template to start designing promotional materials</p>
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors shadow-md"
              >
                Create First Template
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {templates.map((template) => {
              const typeColors = getTypeColor(template.template_type);
              const TypeIcon = typeColors.icon;

              return (
                <div
                  key={template.id}
                  className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  {/* Template Preview */}
                  <div
                    className="relative h-48 bg-gradient-to-br flex items-center justify-center"
                    style={{
                      background: template.design_data?.backgroundColor || '#f3f4f6',
                    }}
                  >
                    {template.preview_url ? (
                      <img
                        src={template.preview_url}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-center p-4">
                        <Palette className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                        {template.design_data?.title && (
                          <p className="text-lg font-bold text-gray-700">{template.design_data.title}</p>
                        )}
                        {template.design_data?.description && (
                          <p className="text-xs text-gray-600 mt-1">{template.design_data.description}</p>
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Template Info */}
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                        <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-full ${typeColors.bg} ${typeColors.text}`}>
                          <TypeIcon className="w-3 h-3" />
                          {template.template_type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <button className="flex-1 py-2 px-3 border-2 border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
                        <Edit className="w-3 h-3 inline mr-1" />
                        Edit
                      </button>
                      <button className="flex-1 py-2 px-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-sm font-medium">
                        <Download className="w-3 h-3 inline mr-1" />
                        Export
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
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

  const templateTypes = [
    { value: 'poster', label: 'Poster', icon: FileText, description: 'Large format promotional posters' },
    { value: 'banner', label: 'Banner', icon: ImageIcon, description: 'Web and venue banners' },
    { value: 'social_media', label: 'Social Media', icon: Share2, description: 'Social media graphics' },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-pink-600 to-pink-700 text-white px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div>
            <h3 className="text-2xl font-bold">Create Design Template</h3>
            <p className="text-pink-100 text-sm">Design promotional materials for your tournament</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-pink-500 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="e.g., Championship Poster 2024"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {templateTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = formData.templateType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, templateType: type.value as any })}
                    className={`p-4 border-2 rounded-lg transition-all text-left ${
                      isSelected
                        ? 'border-pink-600 bg-pink-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className={`w-8 h-8 mb-2 ${isSelected ? 'text-pink-600' : 'text-gray-600'}`} />
                    <p className={`font-semibold mb-1 ${isSelected ? 'text-pink-900' : 'text-gray-900'}`}>
                      {type.label}
                    </p>
                    <p className="text-xs text-gray-600">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Design Title</label>
              <input
                type="text"
                value={formData.designData.title || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    designData: { ...formData.designData, title: e.target.value },
                  })
                }
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                placeholder="Main headline"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Background Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={formData.designData.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      designData: { ...formData.designData, backgroundColor: e.target.value },
                    })
                  }
                  className="h-12 w-20 border-2 border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.designData.backgroundColor || '#ffffff'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      designData: { ...formData.designData, backgroundColor: e.target.value },
                    })
                  }
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all font-mono"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.designData.description || ''}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  designData: { ...formData.designData, description: e.target.value },
                })
              }
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="Design description or subtitle..."
            />
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
            <div
              className="h-48 rounded-lg border-2 border-gray-200 flex items-center justify-center p-6"
              style={{
                background: formData.designData.backgroundColor || '#ffffff',
              }}
            >
              <div className="text-center">
                <Palette className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                {formData.designData.title && (
                  <p className="text-2xl font-bold text-gray-700 mb-2">{formData.designData.title}</p>
                )}
                {formData.designData.description && (
                  <p className="text-sm text-gray-600">{formData.designData.description}</p>
                )}
                {!formData.designData.title && !formData.designData.description && (
                  <p className="text-sm text-gray-500">Your design preview will appear here</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t-2 border-gray-100">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-md"
            >
              {submitting ? 'Creating...' : 'Create Template'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-semibold"
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
