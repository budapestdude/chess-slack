import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Megaphone,
  Users,
  Image,
  Briefcase,
  Mail,
  Share2,
  Palette,
  Handshake,
  ArrowLeft,
  Plus,
  FileText,
  Calendar,
  Send,
} from 'lucide-react';

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

// Email Campaigns Tool
const EmailCampaignsTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const handleNewCampaign = () => {
    toast.success('Email campaign feature coming soon!', {
      icon: '📧',
      duration: 3000,
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-8 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Email Campaigns</h2>
            <button
              onClick={handleNewCampaign}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </button>
          </div>

          <div className="text-center py-12 text-gray-500">
            <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No email campaigns yet</p>
            <p className="text-sm">Create email campaigns to keep participants informed</p>
            <button
              onClick={handleNewCampaign}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Total Sent</p>
            <p className="text-2xl font-bold text-gray-900">0</p>
          </div>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Open Rate</p>
            <p className="text-2xl font-bold text-gray-900">0%</p>
          </div>
          <div className="bg-white rounded-lg border-2 border-gray-200 p-4">
            <p className="text-sm text-gray-600 mb-1">Click Rate</p>
            <p className="text-2xl font-bold text-gray-900">0%</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Social Media Tool
const SocialMediaTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const handleCreatePost = () => {
    toast.success('Social media post feature coming soon!', {
      icon: '📱',
      duration: 3000,
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Social Media Posts</h2>
            <button
              onClick={handleCreatePost}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </div>

          <div className="text-center py-12 text-gray-500">
            <Share2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No social posts yet</p>
            <p className="text-sm">Schedule posts to promote your tournament on social media</p>
            <button
              onClick={handleCreatePost}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Graphics Tool
const GraphicsTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const handleNewDesign = () => {
    toast.success('Graphics design feature coming soon!', {
      icon: '🎨',
      duration: 3000,
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Graphics & Posters</h2>
            <button
              onClick={handleNewDesign}
              className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Design
            </button>
          </div>

          <div className="text-center py-12 text-gray-500">
            <Palette className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No graphics yet</p>
            <p className="text-sm">Create posters, banners, and promotional graphics for your tournament</p>
            <button
              onClick={handleNewDesign}
              className="mt-4 px-4 py-2 bg-pink-600 text-white rounded-md hover:bg-pink-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Sponsorships Tool
const SponsorshipsTool: React.FC<{ workspaceId: string }> = ({ workspaceId }) => {
  const handleAddSponsor = () => {
    toast.success('Sponsorship management feature coming soon!', {
      icon: '🤝',
      duration: 3000,
    });
  };

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="bg-white rounded-lg border-2 border-gray-200 p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Sponsorships</h2>
            <button
              onClick={handleAddSponsor}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Sponsor
            </button>
          </div>

          <div className="text-center py-12 text-gray-500">
            <Handshake className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg mb-2">No sponsors yet</p>
            <p className="text-sm">Track sponsors, partnerships, and sponsorship packages</p>
            <button
              onClick={handleAddSponsor}
              className="mt-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketingPage;
