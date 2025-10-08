import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Users,
  FileText,
  DollarSign,
  Calendar,
  Plus,
  Trash2,
  Save,
  Check,
  ArrowRight,
  ArrowLeft,
  Mail,
  Phone,
  Building,
  Tag,
  Clock,
  Download,
  Upload,
  X,
  TrendingUp,
  AlertCircle,
  Search,
  Filter,
  BarChart3,
} from 'lucide-react';
import {
  CRMContact,
  CRMCompany,
  CRMDeal,
  CRMStats,
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  getCompanies,
  createCompany,
  getDeals,
  createDeal,
  updateDeal,
  deleteDeal,
  getCRMStats,
} from '../services/crm';
import CRMTool from '../components/CRMTool';

/**
 * BusinessPage Component
 * Hub for client and business management tools
 */
const BusinessPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeToolId, setActiveToolId] = useState<string | null>(null);

  useEffect(() => {
    const toolParam = searchParams.get('tool');
    if (toolParam && ['crm', 'invoicing', 'expenses', 'timeoff'].includes(toolParam)) {
      setActiveToolId(toolParam);
    }
  }, [searchParams]);

  const tools = [
    { id: 'crm', name: 'CRM', icon: Users, color: 'purple', description: 'Manage contacts, deals, and pipeline' },
    { id: 'invoicing', name: 'Invoicing', icon: FileText, color: 'blue', description: 'Create and track invoices' },
    { id: 'expenses', name: 'Expense Tracker', icon: DollarSign, color: 'green', description: 'Log expenses and budgets' },
    { id: 'timeoff', name: 'Time Off Manager', icon: Calendar, color: 'orange', description: 'PTO requests and approval' },
  ];

  const renderTool = (toolId: string) => {
    if (!workspaceId) return null;

    switch (toolId) {
      case 'crm':
        return <CRMTool workspaceId={workspaceId} />;
      case 'invoicing':
        return <InvoicingTool />;
      case 'expenses':
        return <ExpenseTrackerTool />;
      case 'timeoff':
        return <TimeOffTool />;
      default:
        return null;
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { gradient: string }> = {
      purple: { gradient: 'from-purple-500 to-purple-600' },
      blue: { gradient: 'from-blue-500 to-blue-600' },
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
              window.history.pushState({}, '', `/workspace/${workspaceId}/business`);
            }}
            className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-2"
          >
            ← Back to Business Tools
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          {renderTool(activeToolId)}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <button
          onClick={() => navigate(`/workspace/${workspaceId}`)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-gray-900 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workspace
        </button>

        <div className="mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Briefcase className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Client & Business Tools</h1>
          </div>
          <p className="text-gray-600 text-lg">
            Manage clients, invoices, expenses, and team time off all in one place.
          </p>
        </div>

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
// Invoicing Tool
// ============================================================================

interface Invoice {
  id: string;
  invoiceNumber: string;
  client: string;
  clientEmail: string;
  items: InvoiceItem[];
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  issueDate: Date;
  dueDate: Date;
  notes: string;
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  rate: number;
}

const InvoicingTool: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);

  const createNewInvoice = () => {
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      client: '',
      clientEmail: '',
      items: [],
      status: 'draft',
      issueDate: new Date(),
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      notes: '',
    };
    setEditingInvoice(newInvoice);
  };

  const saveInvoice = () => {
    if (!editingInvoice) return;

    const exists = invoices.find(i => i.id === editingInvoice.id);
    if (exists) {
      setInvoices(invoices.map(i => i.id === editingInvoice.id ? editingInvoice : i));
    } else {
      setInvoices([editingInvoice, ...invoices]);
    }
    setEditingInvoice(null);
  };

  const deleteInvoice = (invoiceId: string) => {
    setInvoices(invoices.filter(i => i.id !== invoiceId));
  };

  const addItem = () => {
    if (!editingInvoice) return;
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
    };
    setEditingInvoice({
      ...editingInvoice,
      items: [...editingInvoice.items, newItem],
    });
  };

  const updateItem = (itemId: string, updates: Partial<InvoiceItem>) => {
    if (!editingInvoice) return;
    setEditingInvoice({
      ...editingInvoice,
      items: editingInvoice.items.map(item => item.id === itemId ? { ...item, ...updates } : item),
    });
  };

  const deleteItem = (itemId: string) => {
    if (!editingInvoice) return;
    setEditingInvoice({
      ...editingInvoice,
      items: editingInvoice.items.filter(item => item.id !== itemId),
    });
  };

  const calculateTotal = (items: InvoiceItem[]) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const statusColors = {
    draft: 'bg-gray-100 text-gray-700',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  };

  if (editingInvoice) {
    const total = calculateTotal(editingInvoice.items);

    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Invoice {editingInvoice.invoiceNumber}</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingInvoice(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveInvoice}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Name *</label>
                <input
                  type="text"
                  value={editingInvoice.client}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, client: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Client name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Client Email</label>
                <input
                  type="email"
                  value={editingInvoice.clientEmail}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, clientEmail: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="client@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Issue Date</label>
                <input
                  type="date"
                  value={editingInvoice.issueDate.toISOString().split('T')[0]}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, issueDate: new Date(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={editingInvoice.dueDate.toISOString().split('T')[0]}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, dueDate: new Date(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                <select
                  value={editingInvoice.status}
                  onChange={(e) => setEditingInvoice({ ...editingInvoice, status: e.target.value as Invoice['status'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="draft">Draft</option>
                  <option value="sent">Sent</option>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Line Items</h3>
                <button
                  onClick={addItem}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {editingInvoice.items.map(item => (
                  <div key={item.id} className="flex gap-3 items-start p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm mb-2"
                        placeholder="Description"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, { quantity: parseFloat(e.target.value) || 0 })}
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Qty"
                          min="0"
                        />
                        <input
                          type="number"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, { rate: parseFloat(e.target.value) || 0 })}
                          className="px-3 py-2 border border-gray-300 rounded text-sm"
                          placeholder="Rate"
                          min="0"
                          step="0.01"
                        />
                        <div className="px-3 py-2 bg-white border border-gray-300 rounded text-sm flex items-center">
                          ${(item.quantity * item.rate).toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editingInvoice.notes}
                onChange={(e) => setEditingInvoice({ ...editingInvoice, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Payment terms, thank you note, etc."
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Invoicing</h2>
            <p className="text-gray-600 mt-1">Create and track invoices</p>
          </div>
          <button
            onClick={createNewInvoice}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Invoice
          </button>
        </div>

        {invoices.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No invoices yet. Create your first invoice!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map(invoice => {
              const total = calculateTotal(invoice.items);
              return (
                <div key={invoice.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-gray-900">{invoice.invoiceNumber}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                          {invoice.status ? invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1) : 'Unknown'}
                        </span>
                      </div>
                      <p className="text-gray-600 mb-2">{invoice.client}</p>
                      <div className="flex gap-6 text-sm text-gray-500">
                        <span>Due: {invoice.dueDate.toLocaleDateString()}</span>
                        <span className="font-semibold text-gray-900">${total.toFixed(2)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingInvoice(invoice)}
                        className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteInvoice(invoice.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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
// Expense Tracker Tool
// ============================================================================

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date: Date;
  receipt?: string;
  notes: string;
  reimbursed: boolean;
}

const ExpenseTrackerTool: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const categories = ['Travel', 'Meals', 'Office Supplies', 'Software', 'Equipment', 'Other'];

  const createNewExpense = () => {
    const newExpense: Expense = {
      id: Date.now().toString(),
      description: '',
      amount: 0,
      category: 'Other',
      date: new Date(),
      notes: '',
      reimbursed: false,
    };
    setEditingExpense(newExpense);
  };

  const saveExpense = () => {
    if (!editingExpense) return;

    const exists = expenses.find(e => e.id === editingExpense.id);
    if (exists) {
      setExpenses(expenses.map(e => e.id === editingExpense.id ? editingExpense : e));
    } else {
      setExpenses([editingExpense, ...expenses]);
    }
    setEditingExpense(null);
  };

  const deleteExpense = (expenseId: string) => {
    setExpenses(expenses.filter(e => e.id !== expenseId));
  };

  const filteredExpenses = filterCategory === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCategory);

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  const unreimbursed = filteredExpenses.filter(e => !e.reimbursed).reduce((sum, e) => sum + e.amount, 0);

  if (editingExpense) {
    return (
      <div className="h-full bg-gray-50 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Expense Details</h2>
            <div className="flex gap-2">
              <button
                onClick={() => setEditingExpense(null)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={saveExpense}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
              <input
                type="text"
                value={editingExpense.description}
                onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Lunch with client"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
                <input
                  type="number"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={editingExpense.category}
                  onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={editingExpense.date.toISOString().split('T')[0]}
                onChange={(e) => setEditingExpense({ ...editingExpense, date: new Date(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editingExpense.notes}
                onChange={(e) => setEditingExpense({ ...editingExpense, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                placeholder="Additional details..."
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editingExpense.reimbursed}
                onChange={(e) => setEditingExpense({ ...editingExpense, reimbursed: e.target.checked })}
                className="rounded"
              />
              <label className="text-sm font-medium text-gray-700">Reimbursed</label>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Expense Tracker</h2>
            <p className="text-gray-600 mt-1">Track expenses and reimbursements</p>
          </div>
          <button
            onClick={createNewExpense}
            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Expense
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Expenses</p>
                <p className="text-2xl font-bold text-gray-900">${totalExpenses.toFixed(2)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unreimbursed</p>
                <p className="text-2xl font-bold text-red-600">${unreimbursed.toFixed(2)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No expenses logged yet. Add your first expense!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredExpenses.map(expense => (
              <div key={expense.id} className="bg-white rounded-lg shadow-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{expense.description}</h3>
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        {expense.category}
                      </span>
                      {expense.reimbursed && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Reimbursed
                        </span>
                      )}
                    </div>
                    <div className="flex gap-6 text-sm text-gray-500">
                      <span>{expense.date.toLocaleDateString()}</span>
                      <span className="font-semibold text-gray-900">${expense.amount.toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingExpense(expense)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteExpense(expense.id)}
                      className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Time Off Manager Tool
// ============================================================================

interface TimeOffRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'vacation' | 'sick' | 'personal' | 'other';
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  reason: string;
  approver?: string;
}

const TimeOffTool: React.FC = () => {
  const [requests, setRequests] = useState<TimeOffRequest[]>([]);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [formData, setFormData] = useState({
    type: 'vacation' as TimeOffRequest['type'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    reason: '',
  });

  const submitRequest = () => {
    const newRequest: TimeOffRequest = {
      id: Date.now().toString(),
      userId: 'current-user',
      userName: 'You',
      type: formData.type,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      status: 'pending',
      reason: formData.reason,
    };

    setRequests([newRequest, ...requests]);
    setFormData({
      type: 'vacation',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: '',
    });
    setShowRequestForm(false);
  };

  const updateStatus = (requestId: string, status: TimeOffRequest['status']) => {
    setRequests(requests.map(r => r.id === requestId ? { ...r, status, approver: 'Manager' } : r));
  };

  const deleteRequest = (requestId: string) => {
    setRequests(requests.filter(r => r.id !== requestId));
  };

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
  };

  const typeColors = {
    vacation: 'bg-blue-100 text-blue-700',
    sick: 'bg-red-100 text-red-700',
    personal: 'bg-purple-100 text-purple-700',
    other: 'bg-gray-100 text-gray-700',
  };

  return (
    <div className="h-full bg-gray-50 overflow-y-auto">
      <div className="max-w-6xl mx-auto p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Time Off Manager</h2>
            <p className="text-gray-600 mt-1">Request and manage time off</p>
          </div>
          <button
            onClick={() => setShowRequestForm(!showRequestForm)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Request Time Off
          </button>
        </div>

        {showRequestForm && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">New Time Off Request</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as TimeOffRequest['type'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="vacation">Vacation</option>
                  <option value="sick">Sick Leave</option>
                  <option value="personal">Personal Day</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  placeholder="Brief description (optional)"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={submitRequest}
                  className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Submit Request
                </button>
                <button
                  onClick={() => setShowRequestForm(false)}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {requests.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No time off requests yet. Create your first request!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(request => {
              const days = Math.ceil((request.endDate.getTime() - request.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

              return (
                <div key={request.id} className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">{request.userName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeColors[request.type]}`}>
                          {request.type ? request.type.charAt(0).toUpperCase() + request.type.slice(1) : 'Unknown'}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[request.status]}`}>
                          {request.status ? request.status.charAt(0).toUpperCase() + request.status.slice(1) : 'Unknown'}
                        </span>
                      </div>
                      <div className="flex gap-6 text-sm text-gray-600 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {request.startDate.toLocaleDateString()} - {request.endDate.toLocaleDateString()}
                        </span>
                        <span className="font-medium">{days} day{days !== 1 ? 's' : ''}</span>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-gray-600">{request.reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => updateStatus(request.id, 'approved')}
                            className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateStatus(request.id, 'rejected')}
                            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => deleteRequest(request.id)}
                        className="p-2 text-gray-600 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
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

export default BusinessPage;
