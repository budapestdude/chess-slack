import React, { useState, useRef, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  Lightbulb,
  GitBranch,
  BarChart3,
  FileText,
  Pencil,
  Eraser,
  Download,
  Plus,
  Trash2,
  Check,
  X,
  ArrowRight,
  Circle,
  Square,
  MousePointer,
  Undo,
  Redo,
  Save,
  Sparkles,
} from 'lucide-react';

/**
 * CollaborationPage Component
 * Hub for brainstorming and collaboration tools
 */
const CollaborationPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [searchParams] = useSearchParams();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  // Check if a tool was specified in the URL
  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam && ['whiteboard', 'mindmap', 'polls', 'forms'].includes(toolParam)) {
      setActiveToolId(toolParam);
    }
  }, [searchParams]);

  const tools = [
    { id: 'whiteboard', name: 'Whiteboard', icon: Pencil, color: 'blue', description: 'Infinite canvas for sketching ideas' },
    { id: 'mindmap', name: 'Mind Map', icon: GitBranch, color: 'purple', description: 'Visual idea organization' },
    { id: 'polls', name: 'Polls & Voting', icon: BarChart3, color: 'green', description: 'Quick team decisions' },
    { id: 'forms', name: 'Forms Builder', icon: FileText, color: 'orange', description: 'Custom surveys and forms' },
  ];

  const renderTool = (toolId: string) => {
    switch (toolId) {
      case 'whiteboard':
        return <WhiteboardTool />;
      case 'mindmap':
        return <MindMapTool />;
      case 'polls':
        return <PollsTool />;
      case 'forms':
        return <FormsBuilderTool />;
      default:
        return null;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { gradient: string }> = {
      blue: { gradient: 'from-blue-500 to-blue-600' },
      purple: { gradient: 'from-purple-500 to-purple-600' },
      green: { gradient: 'from-green-500 to-green-600' },
      orange: { gradient: 'from-orange-500 to-orange-600' },
    };
    return colors[color] || colors.blue;
  };

  if (activeToolId) {
    return (
      <div className="h-screen bg-gray-50 overflow-hidden flex flex-col">
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <button
            onClick={() => {
              setActiveToolId(null);
              window.history.pushState({}, '', `/workspace/${workspaceId}/collaboration`);
            }}
            className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
          >
            ← Back to Collaboration Tools
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderTool(activeToolId)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-white to-pink-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Lightbulb className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Collaboration & Brainstorming</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Visual tools to help your team brainstorm, organize ideas, and make decisions together.
          </p>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const colors = getColorClasses(tool.color);
            return (
              <button
                key={tool.id}
                onClick={() => setActiveToolId(tool.id)}
                className="group bg-white border-2 border-gray-200 rounded-2xl p-8 hover:border-transparent hover:shadow-xl transition-all duration-300 text-left"
              >
                <div className={`w-16 h-16 bg-gradient-to-br ${colors.gradient} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                  <Icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                  {tool.name}
                </h3>
                <p className="text-gray-600 mb-4">
                  {tool.description}
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-purple-600 group-hover:text-purple-700">
                  Open tool
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Whiteboard Tool
// ============================================================================

const WhiteboardTool: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'pen' | 'eraser' | 'circle' | 'square'>('pen');
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    // Fill with white background
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save initial state
    saveToHistory();
  }, []);

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep <= 0) return;
    setHistoryStep(historyStep - 1);
    restoreFromHistory(historyStep - 1);
  };

  const redo = () => {
    if (historyStep >= history.length - 1) return;
    setHistoryStep(historyStep + 1);
    restoreFromHistory(historyStep + 1);
  };

  const restoreFromHistory = (step: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = history[step];
    if (imageData) {
      ctx.putImageData(imageData, 0, 0);
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setIsDrawing(true);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (tool === 'pen') {
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'eraser') {
      ctx.clearRect(x - lineWidth / 2, y - lineWidth / 2, lineWidth * 2, lineWidth * 2);
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveToHistory();
  };

  const downloadCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = 'whiteboard.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  const colors = ['#000000', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'];

  return (
    <div className="h-full flex flex-col bg-gray-100">
      {/* Toolbar */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTool('pen')}
              className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="Pen"
            >
              <Pencil className="w-5 h-5" />
            </button>
            <button
              onClick={() => setTool('eraser')}
              className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
              title="Eraser"
            >
              <Eraser className="w-5 h-5" />
            </button>
          </div>

          <div className="w-px h-8 bg-gray-300" />

          {/* Colors */}
          <div className="flex items-center gap-2">
            {colors.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${color === c ? 'border-blue-500 scale-110' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <div className="w-px h-8 bg-gray-300" />

          {/* Line Width */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Width:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={lineWidth}
              onChange={(e) => setLineWidth(Number(e.target.value))}
              className="w-24"
            />
            <span className="text-sm text-gray-600 w-8">{lineWidth}px</span>
          </div>

          <div className="w-px h-8 bg-gray-300" />

          {/* History */}
          <button
            onClick={undo}
            disabled={historyStep <= 0}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Undo"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={redo}
            disabled={historyStep >= history.length - 1}
            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Redo"
          >
            <Redo className="w-5 h-5" />
          </button>

          <div className="w-px h-8 bg-gray-300" />

          {/* Actions */}
          <button
            onClick={clearCanvas}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Clear
          </button>
          <button
            onClick={downloadCanvas}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 p-4 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full bg-white rounded-lg shadow-lg cursor-crosshair"
        />
      </div>
    </div>
  );
};

// ============================================================================
// Mind Map Tool
// ============================================================================

type NodeShape = 'rectangle' | 'circle' | 'diamond' | 'hexagon' | 'cloud' | 'star';
type ConnectionStyle = 'straight' | 'curved' | 'bezier' | 'stepped';
type ThemeName = 'default' | 'ocean' | 'sunset' | 'forest' | 'minimal' | 'vibrant';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  children: string[];
  shape?: NodeShape;
  fontSize?: number;
}

interface Theme {
  name: ThemeName;
  colors: string[];
  bgFrom: string;
  bgTo: string;
  connectionColor: string;
}

const themes: Record<ThemeName, Theme> = {
  default: {
    name: 'default',
    colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'],
    bgFrom: 'from-gray-50',
    bgTo: 'to-gray-100',
    connectionColor: '#CBD5E0'
  },
  ocean: {
    name: 'ocean',
    colors: ['#0EA5E9', '#06B6D4', '#14B8A6', '#3B82F6', '#6366F1', '#8B5CF6'],
    bgFrom: 'from-cyan-50',
    bgTo: 'to-blue-100',
    connectionColor: '#67E8F9'
  },
  sunset: {
    name: 'sunset',
    colors: ['#F59E0B', '#F97316', '#EF4444', '#EC4899', '#F472B6', '#FB923C'],
    bgFrom: 'from-orange-50',
    bgTo: 'to-pink-100',
    connectionColor: '#FDE68A'
  },
  forest: {
    name: 'forest',
    colors: ['#10B981', '#14B8A6', '#22C55E', '#16A34A', '#84CC16', '#65A30D'],
    bgFrom: 'from-emerald-50',
    bgTo: 'to-lime-100',
    connectionColor: '#86EFAC'
  },
  minimal: {
    name: 'minimal',
    colors: ['#000000', '#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'],
    bgFrom: 'from-white',
    bgTo: 'to-gray-50',
    connectionColor: '#E5E7EB'
  },
  vibrant: {
    name: 'vibrant',
    colors: ['#FF0080', '#00D9FF', '#FFD700', '#00FF9F', '#FF00FF', '#FFAA00'],
    bgFrom: 'from-purple-100',
    bgTo: 'to-pink-100',
    connectionColor: '#FCD34D'
  }
};

const MindMapTool: React.FC = () => {
  const [nodes, setNodes] = useState<MindMapNode[]>([
    { id: '1', text: 'Main Idea', x: 400, y: 300, color: '#3B82F6', children: [], shape: 'rectangle', fontSize: 16 }
  ]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentTheme, setCurrentTheme] = useState<ThemeName>('default');
  const [connectionStyle, setConnectionStyle] = useState<ConnectionStyle>('curved');
  const [showDesignPanel, setShowDesignPanel] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  const theme = themes[currentTheme];
  const colors = theme.colors;

  const addChildNode = (parentId: string) => {
    const parent = nodes.find(n => n.id === parentId);
    if (!parent) return;

    const newNode: MindMapNode = {
      id: Date.now().toString(),
      text: 'New Node',
      x: parent.x + 250,
      y: parent.y + (parent.children.length * 120 - 60),
      color: colors[Math.floor(Math.random() * colors.length)],
      children: [],
      shape: parent.shape || 'rectangle',
      fontSize: 14
    };

    setNodes([...nodes, newNode]);
    setNodes(prev => prev.map(n =>
      n.id === parentId
        ? { ...n, children: [...n.children, newNode.id] }
        : n
    ));
    setEditingNodeId(newNode.id);
  };

  const updateNodeText = (nodeId: string, text: string) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, text } : n));
  };

  const updateNodeShape = (nodeId: string, shape: NodeShape) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, shape } : n));
  };

  const updateNodeColor = (nodeId: string, color: string) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, color } : n));
  };

  const updateNodeSize = (nodeId: string, fontSize: number) => {
    setNodes(nodes.map(n => n.id === nodeId ? { ...n, fontSize } : n));
  };

  const deleteNode = (nodeId: string) => {
    if (nodeId === '1') return; // Don't delete root

    // Remove from parent's children
    setNodes(prev => prev.map(n => ({
      ...n,
      children: n.children.filter(id => id !== nodeId)
    })));

    // Remove node and its children recursively
    const toDelete = new Set<string>();
    const findChildren = (id: string) => {
      toDelete.add(id);
      const node = nodes.find(n => n.id === id);
      if (node) {
        node.children.forEach(findChildren);
      }
    };
    findChildren(nodeId);

    setNodes(prev => prev.filter(n => !toDelete.has(n.id)));
  };

  const handleMouseDown = (e: React.MouseEvent, nodeId: string) => {
    if (editingNodeId) return;

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;

    setDraggedNodeId(nodeId);
    setDragOffset({
      x: e.clientX - node.x,
      y: e.clientY - node.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNodeId) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    setNodes(prev => prev.map(n =>
      n.id === draggedNodeId ? { ...n, x: newX, y: newY } : n
    ));
  };

  const handleMouseUp = () => {
    setDraggedNodeId(null);
  };

  // Generate connection path based on style
  const getConnectionPath = (x1: number, y1: number, x2: number, y2: number, style: ConnectionStyle): string => {
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;

    switch (style) {
      case 'straight':
        return `M ${x1} ${y1} L ${x2} ${y2}`;

      case 'curved':
        const dx = x2 - x1;
        const dy = y2 - y1;
        const offset = Math.abs(dx) * 0.5;
        return `M ${x1} ${y1} C ${x1 + offset} ${y1}, ${x2 - offset} ${y2}, ${x2} ${y2}`;

      case 'bezier':
        return `M ${x1} ${y1} Q ${midX} ${y1}, ${midX} ${midY} T ${x2} ${y2}`;

      case 'stepped':
        return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

      default:
        return `M ${x1} ${y1} L ${x2} ${y2}`;
    }
  };

  // Get node center point based on shape
  const getNodeCenter = (node: MindMapNode): { x: number; y: number } => {
    const baseX = node.x;
    const baseY = node.y;

    switch (node.shape) {
      case 'circle':
        return { x: baseX + 75, y: baseY + 75 };
      case 'diamond':
        return { x: baseX + 75, y: baseY + 75 };
      case 'hexagon':
        return { x: baseX + 75, y: baseY + 60 };
      default:
        return { x: baseX + 75, y: baseY + 25 };
    }
  };

  // Get node shape-specific styling
  const getNodeShapeStyles = (shape?: NodeShape) => {
    switch (shape) {
      case 'circle':
        return 'rounded-full w-[150px] h-[150px] flex items-center justify-center';
      case 'diamond':
        return 'w-[150px] h-[150px] transform rotate-45';
      case 'hexagon':
        return 'hexagon-shape';
      case 'cloud':
        return 'cloud-shape rounded-3xl';
      case 'star':
        return 'star-shape';
      default:
        return 'rounded-xl min-w-[150px]';
    }
  };

  return (
    <div
      className={`h-full bg-gradient-to-br ${theme.bgFrom} ${theme.bgTo} relative overflow-hidden`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      style={{
        backgroundImage: showGrid
          ? 'radial-gradient(circle, #00000008 1px, transparent 1px)'
          : 'none',
        backgroundSize: showGrid ? '20px 20px' : 'auto'
      }}
    >
      {/* Design Panel Toggle */}
      <button
        onClick={() => setShowDesignPanel(!showDesignPanel)}
        className="absolute top-4 right-4 z-20 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
      >
        <Sparkles className="w-5 h-5 text-purple-600" />
        <span className="font-medium">Design</span>
      </button>

      {/* Design Panel */}
      {showDesignPanel && (
        <div className="absolute top-16 right-4 z-20 bg-white rounded-lg shadow-2xl p-6 w-80 max-h-[80vh] overflow-y-auto">
          <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Design Options
          </h3>

          {/* Theme Selection */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Theme</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(themes) as ThemeName[]).map(themeName => (
                <button
                  key={themeName}
                  onClick={() => setCurrentTheme(themeName)}
                  className={`p-3 rounded-lg border-2 transition-all capitalize ${
                    currentTheme === themeName
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex gap-1 mb-2">
                    {themes[themeName].colors.slice(0, 3).map((c, i) => (
                      <div
                        key={i}
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="text-xs font-medium">{themeName}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Connection Style */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Connection Style</label>
            <div className="space-y-2">
              {(['straight', 'curved', 'bezier', 'stepped'] as ConnectionStyle[]).map(style => (
                <button
                  key={style}
                  onClick={() => setConnectionStyle(style)}
                  className={`w-full px-4 py-2 rounded-lg border-2 transition-all capitalize text-left ${
                    connectionStyle === style
                      ? 'border-purple-500 bg-purple-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Node Shape (for selected node) */}
          {selectedNodeId && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Node Shape</label>
              <div className="grid grid-cols-3 gap-2">
                {(['rectangle', 'circle', 'diamond', 'hexagon', 'cloud', 'star'] as NodeShape[]).map(shape => (
                  <button
                    key={shape}
                    onClick={() => updateNodeShape(selectedNodeId, shape)}
                    className={`p-3 rounded-lg border-2 transition-all capitalize text-xs ${
                      nodes.find(n => n.id === selectedNodeId)?.shape === shape
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {shape}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Node Color (for selected node) */}
          {selectedNodeId && (
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Node Color</label>
              <div className="grid grid-cols-6 gap-2">
                {colors.map(color => (
                  <button
                    key={color}
                    onClick={() => updateNodeColor(selectedNodeId, color)}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      nodes.find(n => n.id === selectedNodeId)?.color === color
                        ? 'border-purple-500 scale-110'
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Background Grid */}
          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium text-gray-700">Show Grid</span>
            </label>
          </div>
        </div>
      )}

      {/* SVG for connections */}
      <svg className="absolute inset-0 pointer-events-none">
        {nodes.map(node =>
          node.children.map(childId => {
            const child = nodes.find(n => n.id === childId);
            if (!child) return null;

            const nodeCenter = getNodeCenter(node);
            const childCenter = getNodeCenter(child);
            const path = getConnectionPath(nodeCenter.x, nodeCenter.y, childCenter.x, childCenter.y, connectionStyle);

            return (
              <path
                key={`${node.id}-${childId}`}
                d={path}
                stroke={theme.connectionColor}
                strokeWidth="3"
                fill="none"
                strokeLinecap="round"
              />
            );
          })
        )}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const isDiamond = node.shape === 'diamond';
        return (
          <div
            key={node.id}
            style={{
              position: 'absolute',
              left: node.x,
              top: node.y,
              zIndex: selectedNodeId === node.id ? 20 : 10
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              setSelectedNodeId(node.id);
            }}
          >
            <div
              className={`
                bg-white shadow-2xl p-4 cursor-move
                border-4 transition-all
                ${getNodeShapeStyles(node.shape)}
                ${selectedNodeId === node.id ? 'scale-110 shadow-purple-300' : ''}
              `}
              style={{
                borderColor: selectedNodeId === node.id ? '#8B5CF6' : node.color,
                fontSize: `${node.fontSize || 14}px`
              }}
              onMouseDown={(e) => handleMouseDown(e, node.id)}
              onDoubleClick={() => setEditingNodeId(node.id)}
            >
              <div className={isDiamond ? 'transform -rotate-45' : ''}>
                {editingNodeId === node.id ? (
                  <input
                    type="text"
                    value={node.text}
                    onChange={(e) => updateNodeText(node.id, e.target.value)}
                    onBlur={() => setEditingNodeId(null)}
                    onKeyDown={(e) => e.key === 'Enter' && setEditingNodeId(null)}
                    autoFocus
                    className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 bg-transparent text-center"
                  />
                ) : (
                  <div className="font-bold text-gray-900 text-center leading-tight" style={{ color: node.color }}>
                    {node.text}
                  </div>
                )}

                {selectedNodeId === node.id && !editingNodeId && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => addChildNode(node.id)}
                      className="flex-1 px-2 py-1.5 text-white rounded-lg text-xs hover:opacity-90 shadow-lg transition-all"
                      style={{ backgroundColor: node.color }}
                    >
                      <Plus className="w-4 h-4 mx-auto" />
                    </button>
                    {node.id !== '1' && (
                      <button
                        onClick={() => deleteNode(node.id)}
                        className="flex-1 px-2 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600 shadow-lg transition-all"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// Polls Tool
// ============================================================================

interface Poll {
  id: string;
  question: string;
  options: { id: string; text: string; votes: number }[];
  multipleChoice: boolean;
  createdAt: Date;
}

const PollsTool: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [multipleChoice, setMultipleChoice] = useState(false);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());

  const createPoll = () => {
    if (!question.trim() || options.filter(o => o.trim()).length < 2) {
      alert('Please enter a question and at least 2 options');
      return;
    }

    const newPoll: Poll = {
      id: Date.now().toString(),
      question,
      options: options.filter(o => o.trim()).map((text, idx) => ({
        id: `opt-${idx}`,
        text,
        votes: 0
      })),
      multipleChoice,
      createdAt: new Date()
    };

    setPolls([newPoll, ...polls]);
    setQuestion('');
    setOptions(['', '']);
    setMultipleChoice(false);
    setShowCreateForm(false);
  };

  const vote = (pollId: string, optionId: string) => {
    setPolls(polls.map(poll => {
      if (poll.id === pollId) {
        return {
          ...poll,
          options: poll.options.map(opt =>
            opt.id === optionId ? { ...opt, votes: opt.votes + 1 } : opt
          )
        };
      }
      return poll;
    }));
    setVotedPolls(new Set([...votedPolls, pollId]));
  };

  const deletePoll = (pollId: string) => {
    setPolls(polls.filter(p => p.id !== pollId));
  };

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Polls & Voting</h2>
            <p className="text-gray-600 mt-1">Make quick team decisions</p>
          </div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Poll
          </button>
        </div>

        {/* Create Form */}
        {showCreateForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Create New Poll</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="What's your question?"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Options
                </label>
                {options.map((opt, idx) => (
                  <div key={idx} className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...options];
                        newOptions[idx] = e.target.value;
                        setOptions(newOptions);
                      }}
                      placeholder={`Option ${idx + 1}`}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    {options.length > 2 && (
                      <button
                        onClick={() => setOptions(options.filter((_, i) => i !== idx))}
                        className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setOptions([...options, ''])}
                  className="text-sm text-green-600 hover:text-green-700 font-medium"
                >
                  + Add Option
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="multipleChoice"
                  checked={multipleChoice}
                  onChange={(e) => setMultipleChoice(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="multipleChoice" className="text-sm text-gray-700">
                  Allow multiple choices
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={createPoll}
                  className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                >
                  Create Poll
                </button>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Polls List */}
        {polls.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No polls yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {polls.map(poll => {
              const totalVotes = poll.options.reduce((sum, opt) => sum + opt.votes, 0);
              const hasVoted = votedPolls.has(poll.id);

              return (
                <div key={poll.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">
                        {poll.question}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {totalVotes} votes • {poll.createdAt.toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => deletePoll(poll.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {poll.options.map(option => {
                      const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;

                      return (
                        <div key={option.id}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-700">{option.text}</span>
                            <span className="text-sm text-gray-500">
                              {option.votes} ({percentage.toFixed(0)}%)
                            </span>
                          </div>
                          <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                            <div
                              className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-300"
                              style={{ width: `${percentage}%` }}
                            />
                            {!hasVoted && (
                              <button
                                onClick={() => vote(poll.id, option.id)}
                                className="absolute inset-0 flex items-center justify-center text-sm font-medium text-gray-700 hover:bg-gray-200/50 transition-colors"
                              >
                                Click to vote
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Forms Builder Tool
// ============================================================================

interface FormField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  label: string;
  required: boolean;
  options?: string[];
}

interface Form {
  id: string;
  title: string;
  description: string;
  fields: FormField[];
}

const FormsBuilderTool: React.FC = () => {
  const [forms, setForms] = useState<Form[]>([]);
  const [editingForm, setEditingForm] = useState<Form | null>(null);
  const [previewForm, setPreviewForm] = useState<Form | null>(null);

  const createNewForm = () => {
    const newForm: Form = {
      id: Date.now().toString(),
      title: 'Untitled Form',
      description: '',
      fields: []
    };
    setEditingForm(newForm);
  };

  const saveForm = () => {
    if (!editingForm) return;

    const exists = forms.find(f => f.id === editingForm.id);
    if (exists) {
      setForms(forms.map(f => f.id === editingForm.id ? editingForm : f));
    } else {
      setForms([...forms, editingForm]);
    }
    setEditingForm(null);
  };

  const addField = (type: FormField['type']) => {
    if (!editingForm) return;

    const newField: FormField = {
      id: Date.now().toString(),
      type,
      label: 'New Field',
      required: false,
      options: type === 'select' || type === 'radio' ? ['Option 1', 'Option 2'] : undefined
    };

    setEditingForm({
      ...editingForm,
      fields: [...editingForm.fields, newField]
    });
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    if (!editingForm) return;

    setEditingForm({
      ...editingForm,
      fields: editingForm.fields.map(f =>
        f.id === fieldId ? { ...f, ...updates } : f
      )
    });
  };

  const deleteField = (fieldId: string) => {
    if (!editingForm) return;

    setEditingForm({
      ...editingForm,
      fields: editingForm.fields.filter(f => f.id !== fieldId)
    });
  };

  const deleteForm = (formId: string) => {
    setForms(forms.filter(f => f.id !== formId));
  };

  if (previewForm) {
    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-2xl mx-auto p-8">
          <button
            onClick={() => setPreviewForm(null)}
            className="mb-6 text-gray-600 hover:text-gray-900 font-medium"
          >
            ← Back to Forms
          </button>

          <div className="bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">{previewForm.title}</h2>
            {previewForm.description && (
              <p className="text-gray-600 mb-6">{previewForm.description}</p>
            )}

            <div className="space-y-6">
              {previewForm.fields.map(field => (
                <div key={field.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {field.type === 'text' && (
                    <input
                      type="text"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}

                  {field.type === 'textarea' && (
                    <textarea
                      rows={4}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  )}

                  {field.type === 'select' && (
                    <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option>Select an option...</option>
                      {field.options?.map((opt, idx) => (
                        <option key={idx}>{opt}</option>
                      ))}
                    </select>
                  )}

                  {field.type === 'checkbox' && (
                    <input type="checkbox" className="rounded" />
                  )}

                  {field.type === 'radio' && (
                    <div className="space-y-2">
                      {field.options?.map((opt, idx) => (
                        <label key={idx} className="flex items-center gap-2">
                          <input type="radio" name={field.id} />
                          <span className="text-gray-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button className="mt-8 w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
              Submit
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (editingForm) {
    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Form Builder</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingForm(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveForm}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save Form
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {/* Form Editor */}
            <div className="col-span-2 space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <input
                  type="text"
                  value={editingForm.title}
                  onChange={(e) => setEditingForm({ ...editingForm, title: e.target.value })}
                  className="w-full text-3xl font-bold border-none focus:outline-none mb-4"
                  placeholder="Form Title"
                />
                <textarea
                  value={editingForm.description}
                  onChange={(e) => setEditingForm({ ...editingForm, description: e.target.value })}
                  className="w-full text-gray-600 border-none focus:outline-none resize-none"
                  placeholder="Form description (optional)"
                  rows={2}
                />
              </div>

              {editingForm.fields.map(field => (
                <div key={field.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-3">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateField(field.id, { label: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Field label"
                      />

                      {(field.type === 'select' || field.type === 'radio') && (
                        <div className="space-y-2">
                          {field.options?.map((opt, idx) => (
                            <input
                              key={idx}
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const newOptions = [...(field.options || [])];
                                newOptions[idx] = e.target.value;
                                updateField(field.id, { options: newOptions });
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                              placeholder={`Option ${idx + 1}`}
                            />
                          ))}
                        </div>
                      )}

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateField(field.id, { required: e.target.checked })}
                          className="rounded"
                        />
                        <span className="text-sm text-gray-700">Required field</span>
                      </label>
                    </div>

                    <button
                      onClick={() => deleteField(field.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Field Types Sidebar */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg shadow-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Add Field</h3>
                <div className="space-y-2">
                  <button
                    onClick={() => addField('text')}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm"
                  >
                    Short Text
                  </button>
                  <button
                    onClick={() => addField('textarea')}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm"
                  >
                    Long Text
                  </button>
                  <button
                    onClick={() => addField('select')}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm"
                  >
                    Dropdown
                  </button>
                  <button
                    onClick={() => addField('radio')}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm"
                  >
                    Multiple Choice
                  </button>
                  <button
                    onClick={() => addField('checkbox')}
                    className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-left text-sm"
                  >
                    Checkbox
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-4xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Forms</h2>
            <p className="text-gray-600 mt-1">Create custom forms and surveys</p>
          </div>
          <button
            onClick={createNewForm}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Form
          </button>
        </div>

        {forms.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No forms yet. Create one to get started!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {forms.map(form => (
              <div key={form.id} className="bg-white rounded-lg shadow-lg p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{form.title}</h3>
                {form.description && (
                  <p className="text-gray-600 text-sm mb-4">{form.description}</p>
                )}
                <p className="text-sm text-gray-500 mb-4">{form.fields.length} fields</p>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingForm(form)}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => setPreviewForm(form)}
                    className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                  >
                    Preview
                  </button>
                  <button
                    onClick={() => deleteForm(form.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CollaborationPage;
