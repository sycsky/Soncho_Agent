import React, { useState, useEffect, useCallback } from 'react';
import { Agent, Role } from '../types';
import { getRoles, createAgent, getAgents, updateAgent, CreateAgentRequest, UpdateAgentRequest } from '../services/adminService';
import { AddAgentForm } from './AddAgentForm';
import { ChevronLeft, ChevronRight, Plus, User, X, ArrowUpDown } from 'lucide-react';

// Edit Agent Form Component (assuming it exists and is styled)
interface EditAgentFormProps {
  agent: Agent;
  roles: Role[];
  onClose: () => void;
  onSubmit: (id: string, data: UpdateAgentRequest) => void;
}

const EditAgentForm: React.FC<EditAgentFormProps> = ({ agent, roles, onClose, onSubmit }) => {
  const [name, setName] = useState(agent.name);
  // Use agent.roleId directly
  const [roleId, setRoleId] = useState(agent.roleId || (roles.length > 0 ? roles[0].id : ''));
  const [status, setStatus] = useState(agent.status);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(agent.id, { name, roleId, status });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Edit Agent</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select value={roleId} onChange={e => setRoleId(e.target.value)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
              {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select value={status} onChange={e => setStatus(e.target.value as any)} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" required>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="BUSY">Busy</option>
            </select>
          </div>
          <div className="flex justify-end gap-4">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300">Cancel</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const TeamView: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  
  // Pagination & Sorting & Filtering State
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [sort, setSort] = useState('name,asc');
  const [filterName, setFilterName] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const fetchAgents = useCallback(async () => {
    try {
      const agentData = await getAgents(page, 10, sort, filterName, filterRole);
      setAgents(agentData.content);
      setTotalPages(agentData.totalPages);
    } catch (error) {
      // Error already handled by API service
    }
  }, [page, sort, filterName, filterRole]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const roleData = await getRoles();
        setRoles(roleData);
      } catch (error) {
        // Error already handled by API service
      }
    };
    fetchRoles();
  }, []);

  const handleAddAgent = async (data: CreateAgentRequest) => {
    try {
      await createAgent(data);
      setShowAddForm(false);
      fetchAgents();
    } catch (error) {
      // Error already handled by API service
    }
  };

  const handleUpdateAgent = async (id: string, data: UpdateAgentRequest) => {
    try {
      await updateAgent(id, data);
      setEditingAgent(null);
      fetchAgents();
    } catch (error) {
      // Error already handled by API service
    }
  };

  const handleSort = (field: string) => {
    const [currentField, currentDirection] = sort.split(',');
    let newDirection = 'asc';
    if (field === currentField && currentDirection === 'asc') {
      newDirection = 'desc';
    }
    setSort(`${field},${newDirection}`);
  };

  const getRoleName = (roleId: string) => roles.find(r => r.id === roleId)?.name || 'Unknown';

  return (
    <div className="p-8 max-w-6xl mx-auto w-full relative animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Team Management</h2>
        <button onClick={() => setShowAddForm(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2">
          <Plus size={16} /> Add Member
        </button>
      </div>

      {showAddForm && <AddAgentForm roles={roles} onClose={() => setShowAddForm(false)} onSubmit={handleAddAgent} />}
      {editingAgent && <EditAgentForm agent={editingAgent} roles={roles} onClose={() => setEditingAgent(null)} onSubmit={handleUpdateAgent} />}

      <div className="mb-4 flex gap-4">
        <input type="text" placeholder="Filter by name..." value={filterName} onChange={e => setFilterName(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none" />
        <select value={filterRole} onChange={e => setFilterRole(e.target.value)} className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none bg-white">
          <option value="">All Roles</option>
          {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
        <table className="w-full whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('name')}>
                <div className="flex items-center gap-1">Agent <ArrowUpDown size={12} /></div>
              </th>
              <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('role')}>
                <div className="flex items-center gap-1">Role <ArrowUpDown size={12} /></div>
              </th>
               <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase cursor-pointer" onClick={() => handleSort('status')}>
                <div className="flex items-center gap-1">Status <ArrowUpDown size={12} /></div>
              </th>
              <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map(agent => (
              <tr key={agent.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                <td className="py-4 px-6 flex items-center gap-3">
                  {agent.avatar ? <img src={agent.avatar} className="w-8 h-8 rounded-full object-cover" alt={agent.name} /> : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center"><User size={16} className="text-gray-500" /></div>}
                  <span className="font-medium text-gray-900">{agent.name}</span>
                </td>
                <td className="py-4 px-6"><span className={`px-2 py-1 rounded-full text-xs font-medium border ${(agent.roleName || getRoleName(agent.roleId)) === 'Admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>{agent.roleName || getRoleName(agent.roleId)}</span></td>
                <td className="py-4 px-6">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${agent.status === 'ONLINE' ? 'bg-green-500' : agent.status === 'BUSY' ? 'bg-yellow-500' : 'bg-gray-400'}`} />
                    <span className="text-sm text-gray-600 capitalize">{agent.status.toLowerCase()}</span>
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <button onClick={() => setEditingAgent(agent)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Edit</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {totalPages > 1 && (
        <div className="flex justify-between items-center mt-6">
          <span className="text-sm text-gray-600">Page {page + 1} of {totalPages}</span>
          <div className="flex items-center gap-2">
            <button onClick={() => setPage(p => p - 1)} disabled={page === 0} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronLeft size={20} /></button>
            <span className="text-sm font-medium">{page + 1} / {totalPages}</span>
            <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages - 1} className="p-2 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"><ChevronRight size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
};
