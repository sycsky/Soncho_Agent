import React, { useState, useEffect } from 'react';
import customerServiceAPI, { Customer, CustomerChannel, CreateCustomerRequest } from '../services/customerService';
import notificationService from '../services/notificationService';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  MoreHorizontal, 
  Trash2, 
  Edit2, 
  Globe, 
  MessageCircle, 
  Smartphone, 
  Mail, 
  Facebook, 
  Phone, 
  X, 
  Save, 
  ChevronLeft, 
  ChevronRight,
  MessageSquare,
  SmartphoneNfc
} from 'lucide-react';

export const CustomerView: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchName, setSearchName] = useState('');
  const [filterChannel, setFilterChannel] = useState<CustomerChannel | ''>('');
  const [filterActive, setFilterActive] = useState<boolean | ''>('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);

  useEffect(() => {
    loadCustomers();
  }, [searchName, filterChannel, filterActive, currentPage]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await customerServiceAPI.getCustomers({
        name: searchName || undefined,
        channel: filterChannel || undefined,
        active: filterActive === '' ? undefined : filterActive,
        page: currentPage,
        size: 20,
      });

      setCustomers(response.content);
      setTotalPages(response.totalPages);
    } catch (error) {
      console.error('Failed to load customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCustomer = async (request: CreateCustomerRequest) => {
    try {
      await customerServiceAPI.createCustomer(request);
      notificationService.success('Customer created successfully');
      setShowCreateForm(false);
      loadCustomers();
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    try {
      await customerServiceAPI.deleteCustomer(customerId);
      notificationService.success('Customer deleted successfully');
      loadCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const getChannelIcon = (channel: CustomerChannel) => {
    const iconClass = "w-5 h-5 text-gray-500";
    switch (channel) {
      case CustomerChannel.WEB: return <Globe className={iconClass} />;
      case CustomerChannel.WECHAT: return <MessageCircle className={iconClass} />;
      case CustomerChannel.WHATSAPP: return <MessageCircle className={iconClass} />;
      case CustomerChannel.LINE: return <MessageCircle className={iconClass} />;
      case CustomerChannel.TELEGRAM: return <MessageSquare className={iconClass} />;
      case CustomerChannel.FACEBOOK: return <Facebook className={iconClass} />;
      case CustomerChannel.EMAIL: return <Mail className={iconClass} />;
      case CustomerChannel.SMS: return <MessageSquare className={iconClass} />;
      case CustomerChannel.PHONE: return <Phone className={iconClass} />;
      case CustomerChannel.APP: return <SmartphoneNfc className={iconClass} />;
      default: return <Smartphone className={iconClass} />;
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full relative animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Users className="text-blue-600" /> Customer Management
        </h2>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm transition-colors"
        >
          <Plus size={16} /> Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by name..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select
              value={filterChannel}
              onChange={(e) => setFilterChannel(e.target.value as CustomerChannel | '')}
              className="pl-9 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer hover:border-gray-300 transition-colors"
            >
              <option value="">All Channels</option>
              {Object.values(CustomerChannel).map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
          <div className="relative">
            <select
              value={filterActive === '' ? '' : String(filterActive)}
              onChange={(e) => setFilterActive(e.target.value === '' ? '' : e.target.value === 'true')}
              className="pl-4 pr-8 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white appearance-none cursor-pointer hover:border-gray-300 transition-colors"
            >
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-500 flex flex-col items-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            Loading customers...
          </div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Users size={48} className="mx-auto mb-4 opacity-20" />
            <p>No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Channel</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Tags</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Last Interaction</th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {customers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => setSelectedCustomer(customer)}
                  >
                    <td className="py-4 px-6">
                      <div className="bg-gray-100 p-2 rounded-lg w-fit">
                        {getChannelIcon(customer.primaryChannel)}
                      </div>
                    </td>
                    <td className="py-4 px-6 font-medium text-gray-900">{customer.name}</td>
                    <td className="py-4 px-6 text-sm text-gray-600">
                      {customer.email || customer.phone || '-'}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex gap-1 flex-wrap">
                        {customer.tags.slice(0, 3).map((tag, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100"
                          >
                            {tag}
                          </span>
                        ))}
                        {customer.tags.length > 3 && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs border border-gray-200">
                            +{customer.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
                          customer.active 
                            ? 'bg-green-50 text-green-700 border-green-200' 
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${customer.active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                        {customer.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {customer.lastInteractionAt
                        ? new Date(customer.lastInteractionAt).toLocaleString()
                        : '-'}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCustomer(customer);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomer(customer.id);
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-600">
            Page {currentPage + 1} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
              disabled={currentPage === totalPages - 1}
              className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Create Modal */}
      <CreateCustomerModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        onSubmit={handleCreateCustomer}
      />

      {/* Detail Modal */}
      {selectedCustomer && (
        <CustomerDetailModal
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          onUpdate={loadCustomers}
        />
      )}
    </div>
  );
};

// Create Customer Modal
const CreateCustomerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: CreateCustomerRequest) => void;
}> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<CreateCustomerRequest>({
    name: '',
    primaryChannel: CustomerChannel.WEB,
    tags: [],
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h3 className="font-bold text-gray-800">Add Customer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
            <input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="Customer Name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Channel <span className="text-red-500">*</span></label>
            <select
              value={formData.primaryChannel}
              onChange={(e) => setFormData({ ...formData, primaryChannel: e.target.value as CustomerChannel })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
            >
              {Object.values(CustomerChannel).map((channel) => (
                <option key={channel} value={channel}>
                  {channel}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="email@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
            <input
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="+1 234 567 890"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Customer Detail Modal
const CustomerDetailModal: React.FC<{
  customer: Customer;
  onClose: () => void;
  onUpdate: () => void;
}> = ({ customer, onClose, onUpdate }) => {
  const [notes, setNotes] = useState(customer.notes || '');
  const [tags, setTags] = useState(customer.tags.join(', '));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);
      await customerServiceAPI.updateCustomer(customer.id, {
        notes,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });
      notificationService.success('Customer updated successfully');
      onUpdate();
      onClose();
    } catch (error) {
      console.error('Update failed:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{customer.name}</h3>
              <p className="text-xs text-gray-500">ID: {customer.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Basic Info</h4>
              <div className="grid grid-cols-[100px_1fr] gap-2 text-sm">
                <span className="text-gray-500">Channel:</span>
                <span className="font-medium text-gray-900">{customer.primaryChannel}</span>
                
                <span className="text-gray-500">Email:</span>
                <span className="font-medium text-gray-900">{customer.email || '-'}</span>
                
                <span className="text-gray-500">Phone:</span>
                <span className="font-medium text-gray-900">{customer.phone || '-'}</span>
                
                <span className="text-gray-500">Created:</span>
                <span className="font-medium text-gray-900">{new Date(customer.createdAt).toLocaleString()}</span>
                
                <span className="text-gray-500">Status:</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium w-fit ${customer.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {customer.active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
            
            <div className="space-y-4">
               <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b pb-1">Edit Info</h4>
               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma separated)</label>
                <input 
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="vip, new, support..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-h-[100px] resize-none"
                  placeholder="Internal notes about this customer..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Close
          </button>
          <button 
            onClick={handleSave} 
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomerView;
