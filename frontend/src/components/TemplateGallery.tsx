import { useState, useEffect } from 'react';
import { FileTextIcon, SearchIcon, XIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { getDocuments, createDocument } from '../services/document';

interface Template {
  id: string;
  title: string;
  description: string;
  content: string;
  icon: string;
  category: string;
  previewImage?: string;
}

interface TemplateGalleryProps {
  workspaceId: string;
  onSelectTemplate: (template: Template) => void;
  onClose: () => void;
}

const defaultTemplates: Template[] = [
  {
    id: 'blank',
    title: 'Blank Document',
    description: 'Start with an empty document',
    content: '<p>Start writing...</p>',
    icon: '📄',
    category: 'General',
  },
  {
    id: 'meeting-notes',
    title: 'Meeting Notes',
    description: 'Template for meeting notes with agenda and action items',
    content: `
<h1>Meeting Notes</h1>
<p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
<p><strong>Attendees:</strong> </p>
<h2>Agenda</h2>
<ul>
  <li>Topic 1</li>
  <li>Topic 2</li>
  <li>Topic 3</li>
</ul>
<h2>Discussion</h2>
<p></p>
<h2>Action Items</h2>
<ul>
  <li>[ ] Action item 1 - Owner: </li>
  <li>[ ] Action item 2 - Owner: </li>
</ul>
<h2>Next Steps</h2>
<p></p>
    `,
    icon: '📝',
    category: 'Meetings',
  },
  {
    id: 'project-proposal',
    title: 'Project Proposal',
    description: 'Comprehensive project proposal template',
    content: `
<h1>Project Proposal</h1>
<h2>Executive Summary</h2>
<p>Brief overview of the project...</p>
<h2>Problem Statement</h2>
<p>Describe the problem this project aims to solve...</p>
<h2>Proposed Solution</h2>
<p>Detail your proposed solution...</p>
<h2>Objectives</h2>
<ul>
  <li>Objective 1</li>
  <li>Objective 2</li>
  <li>Objective 3</li>
</ul>
<h2>Timeline</h2>
<table>
  <thead>
    <tr>
      <th>Phase</th>
      <th>Duration</th>
      <th>Deliverables</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>Phase 1</td>
      <td>2 weeks</td>
      <td></td>
    </tr>
  </tbody>
</table>
<h2>Budget</h2>
<p>Estimated costs...</p>
<h2>Team & Resources</h2>
<p>Required team members and resources...</p>
    `,
    icon: '📊',
    category: 'Projects',
  },
  {
    id: 'technical-spec',
    title: 'Technical Specification',
    description: 'Technical design document template',
    content: `
<h1>Technical Specification</h1>
<h2>Overview</h2>
<p>High-level description of the feature/system...</p>
<h2>Requirements</h2>
<h3>Functional Requirements</h3>
<ul>
  <li>Requirement 1</li>
  <li>Requirement 2</li>
</ul>
<h3>Non-Functional Requirements</h3>
<ul>
  <li>Performance</li>
  <li>Security</li>
  <li>Scalability</li>
</ul>
<h2>Architecture</h2>
<p>System architecture and design...</p>
<h2>Data Model</h2>
<p>Database schema and data structures...</p>
<h2>API Specification</h2>
<pre><code>
GET /api/endpoint
POST /api/endpoint
</code></pre>
<h2>Implementation Plan</h2>
<p>Step-by-step implementation approach...</p>
<h2>Testing Strategy</h2>
<p>Testing approach and test cases...</p>
<h2>Deployment</h2>
<p>Deployment process and considerations...</p>
    `,
    icon: '⚙️',
    category: 'Engineering',
  },
  {
    id: 'product-roadmap',
    title: 'Product Roadmap',
    description: 'Product planning and roadmap template',
    content: `
<h1>Product Roadmap - Q1 2025</h1>
<h2>Vision & Strategy</h2>
<p>Our product vision and strategic direction...</p>
<h2>Goals</h2>
<ul>
  <li>Goal 1: Increase user engagement by X%</li>
  <li>Goal 2: Launch new feature Y</li>
  <li>Goal 3: Improve performance metric Z</li>
</ul>
<h2>Q1 Priorities</h2>
<h3>January</h3>
<ul>
  <li><strong>Feature A</strong> - Description and impact</li>
  <li><strong>Feature B</strong> - Description and impact</li>
</ul>
<h3>February</h3>
<ul>
  <li><strong>Feature C</strong> - Description and impact</li>
</ul>
<h3>March</h3>
<ul>
  <li><strong>Feature D</strong> - Description and impact</li>
</ul>
<h2>Success Metrics</h2>
<table>
  <thead>
    <tr>
      <th>Metric</th>
      <th>Current</th>
      <th>Target</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>User Engagement</td>
      <td>X</td>
      <td>Y</td>
    </tr>
  </tbody>
</table>
    `,
    icon: '🗺️',
    category: 'Product',
  },
  {
    id: 'sprint-planning',
    title: 'Sprint Planning',
    description: 'Agile sprint planning template',
    content: `
<h1>Sprint Planning - Sprint ${Math.ceil((new Date().getMonth() + 1) / 0.5)}</h1>
<p><strong>Sprint Duration:</strong> 2 weeks</p>
<p><strong>Sprint Goal:</strong> </p>
<h2>Team Capacity</h2>
<ul>
  <li>Developer 1: X points</li>
  <li>Developer 2: X points</li>
</ul>
<h2>Sprint Backlog</h2>
<table>
  <thead>
    <tr>
      <th>Story</th>
      <th>Points</th>
      <th>Assignee</th>
      <th>Status</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>User Story 1</td>
      <td>3</td>
      <td></td>
      <td>Not Started</td>
    </tr>
  </tbody>
</table>
<h2>Definition of Done</h2>
<ul>
  <li>[ ] Code complete and reviewed</li>
  <li>[ ] Tests written and passing</li>
  <li>[ ] Documentation updated</li>
  <li>[ ] Deployed to staging</li>
</ul>
    `,
    icon: '🏃',
    category: 'Agile',
  },
];

export default function TemplateGallery({ workspaceId, onSelectTemplate, onClose }: TemplateGalleryProps) {
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isLoading, setIsLoading] = useState(false);

  const categories = ['All', ...new Set(templates.map((t) => t.category))];

  useEffect(() => {
    loadCustomTemplates();
  }, [workspaceId]);

  const loadCustomTemplates = async () => {
    try {
      setIsLoading(true);
      // Load custom templates from workspace
      const docs = await getDocuments(workspaceId);
      // Filter for templates on the client side
      const customTemplates: Template[] = docs
        .filter((doc: any) => doc.isTemplate)
        .map((doc: any) => ({
          id: doc.id,
          title: doc.title,
          description: doc.description || 'Custom template',
          content: doc.content,
          icon: doc.icon || '📄',
          category: 'Custom',
        }));
      setTemplates([...defaultTemplates, ...customTemplates]);
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredTemplates = templates.filter((template) => {
    const matchesSearch =
      template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: Template) => {
    onSelectTemplate(template);
    toast.success(`Selected template: ${template.title}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Template Gallery</h2>
            <p className="text-sm text-gray-500 mt-1">Choose a template to get started quickly</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <XIcon className="h-6 w-6 text-gray-500" />
          </button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <FileTextIcon className="h-12 w-12 mb-4" />
              <p>No templates found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="text-left p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start space-x-3">
                    <div className="text-3xl">{template.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {template.title}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{template.description}</p>
                      <span className="inline-block mt-2 text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
                        {template.category}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
