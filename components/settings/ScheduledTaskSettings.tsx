import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Calendar, 
  Plus, 
  Trash2, 
  Edit2, 
  Clock, 
  Play, 
  Pause,
  Search,
  Users,
  User,
  GitBranch,
  Terminal,
  Loader2,
  Check,
  ChevronsUpDown,
  X
} from 'lucide-react';
import { ScheduledTask, ScheduleType, SaveScheduledTaskRequest } from '../../types';
import { scheduledTaskApi } from '../../services/scheduledTaskApi';
import { workflowApi } from '../../services/workflowApi';
import customerService from '../../services/customerService';
import { AiWorkflow } from '../../types/workflow';
import { Customer, CustomerRole } from '../../services/customerService';

const FREQUENCY_OPTIONS: { value: ScheduleType; label: string }[] = [
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const DAYS_OF_WEEK = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const ScheduledTaskSettings = () => {
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<ScheduledTask | null>(null);

  // Reference data
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [customerRoles, setCustomerRoles] = useState<CustomerRole[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const roleNameById = useMemo(() => {
    return new Map(customerRoles.map(role => [String(role.id), role.name]));
  }, [customerRoles]);

  useEffect(() => {
    loadTasks();
    loadReferenceData();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await scheduledTaskApi.getTasks();
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReferenceData = async () => {
    try {
      const [wfData, rolesData] = await Promise.all([
        workflowApi.getAllWorkflows(),
        customerService.getCustomerRoles()
      ]);
      setWorkflows(wfData);
      setCustomerRoles(rolesData);
    } catch (error) {
      console.error('Failed to load reference data:', error);
    }
  };
  
  // Search customers on demand
  const searchCustomers = async (query: string) => {
      try {
          const res = await customerService.getCustomers({ name: query, page: 0, size: 20 });
          setCustomers(res.content);
      } catch (err) {
          console.error(err);
      }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      try {
        await scheduledTaskApi.deleteTask(id);
        loadTasks();
      } catch (error) {
        console.error('Failed to delete task:', error);
      }
    }
  };

  const handleToggle = async (task: ScheduledTask) => {
    try {
      // Construct update request with inverted enabled status
      const updateRequest: SaveScheduledTaskRequest = {
          name: task.name,
          description: task.description,
          workflowId: task.workflowId,
          scheduleConfig: task.scheduleConfig,
          customerMode: task.customerMode,
          targetIds: task.targetIds,
          initialInput: task.initialInput,
          enabled: !task.enabled
      };
      
      await scheduledTaskApi.updateTask(task.id, updateRequest);
      loadTasks();
    } catch (error) {
      console.error('Failed to toggle task:', error);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Scheduled Tasks</h2>
          <p className="text-gray-500 mt-1">Manage automated workflow executions</p>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setIsDialogOpen(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={18} />
          <span>Create Task</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
            <div className="p-12 flex justify-center text-gray-400">
                <Loader2 size={32} className="animate-spin" />
            </div>
        ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
                <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                <p>No scheduled tasks found</p>
            </div>
        ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Task Name</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Frequency</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Target</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Workflow</th>
                  <th className="text-left py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="text-right py-3 px-6 text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="font-medium text-gray-900">{task.name}</div>
                      {task.description && <div className="text-xs text-gray-500 truncate max-w-[200px]">{task.description}</div>}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Clock size={14} className="text-gray-400" />
                        <span className="capitalize">{task.scheduleConfig.type.toLowerCase()}</span>
                        <span className="text-gray-400 text-xs">
                             {task.scheduleConfig.time}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm">
                            {task.customerMode === 'CUSTOMER_ROLE' ? <Users size={14} className="text-purple-500"/> : <User size={14} className="text-blue-500"/>}
                            <span>
                                {task.targetIds && task.targetIds.length > 0 
                                    ? (task.customerMode === 'CUSTOMER_ROLE'
                                        ? task.targetIds.map(id => roleNameById.get(String(id)) || id).join(', ')
                                        : (task.targetIds.length > 1 ? `${task.targetIds.length} targets` : task.targetIds[0]))
                                    : 'No target'}
                            </span>
                        </div>
                    </td>
                    <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm">
                            <GitBranch size={14} className="text-gray-400"/>
                            <span>{task.workflowName || task.workflowId}</span>
                        </div>
                    </td>
                    <td className="py-4 px-6">
                        <button 
                            onClick={() => handleToggle(task)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                                task.enabled 
                                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                        >
                            {task.enabled ? <Play size={10} /> : <Pause size={10} />}
                            {task.enabled ? 'Active' : 'Paused'}
                        </button>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => {
                            setEditingTask(task);
                            setIsDialogOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(task.id)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>

      {isDialogOpen && (
        <TaskDialog 
            task={editingTask} 
            isOpen={isDialogOpen} 
            onClose={() => setIsDialogOpen(false)}
            onSave={() => {
                setIsDialogOpen(false);
                loadTasks();
            }}
            workflows={workflows}
            roles={customerRoles}
            searchCustomers={searchCustomers}
            customers={customers}
        />
      )}
    </div>
  );
};

// Dialog Component
const TaskDialog = ({ 
    task, 
    isOpen, 
    onClose, 
    onSave,
    workflows,
    roles,
    searchCustomers,
    customers
}: { 
    task: ScheduledTask | null, 
    isOpen: boolean, 
    onClose: () => void, 
    onSave: () => void,
    workflows: AiWorkflow[],
    roles: CustomerRole[],
    searchCustomers: (q: string) => void,
    customers: Customer[]
}) => {
    // Helper to parse time string HH:mm:ss to {hour, minute, second}
    const parseTime = (timeStr?: string) => {
        if (!timeStr) return { hour: 0, minute: 0, second: 0 };
        const [h, m, s] = timeStr.split(':').map(Number);
        return { hour: h || 0, minute: m || 0, second: s || 0 };
    };

    const initialTime = parseTime(task?.scheduleConfig.time);

    const [formData, setFormData] = useState<Partial<SaveScheduledTaskRequest>>({
        name: '',
        description: '',
        workflowId: '',
        scheduleConfig: {
            type: 'DAILY',
            time: '00:00:00',
            daysOfWeek: [],
            daysOfMonth: []
        },
        customerMode: 'CUSTOMER_ROLE',
        targetIds: [],
        initialInput: '',
        enabled: true
    });
    
    // Separate state for time inputs to handle UI logic
    const [timeState, setTimeState] = useState({
        hour: initialTime.hour,
        minute: initialTime.minute,
        second: initialTime.second
    });

    // Customer search state
    const [searchTerm, setSearchTerm] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [selectedCustomerDetails, setSelectedCustomerDetails] = useState<Customer[]>([]);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchTerm.trim()) {
                searchCustomers(searchTerm);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Helper to format time object to HH:mm:ss
    const formatTime = (h: number, m: number, s: number) => {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Update time string in formData when time inputs change
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            scheduleConfig: {
                ...prev.scheduleConfig!,
                time: formatTime(timeState.hour, timeState.minute, timeState.second)
            }
        }));
    }, [timeState]);
    
    useEffect(() => {
        if (task) {
            const time = parseTime(task.scheduleConfig.time);
            setTimeState(time);

            setFormData({
                name: task.name,
                description: task.description,
                workflowId: task.workflowId,
                scheduleConfig: task.scheduleConfig,
                customerMode: task.customerMode,
                targetIds: task.targetIds || [],
                initialInput: task.initialInput,
                enabled: task.enabled
            });

            // Fetch customer details if mode is specific customer
            if (task.customerMode === 'SPECIFIC_CUSTOMER' && task.targetIds?.length) {
                Promise.all(task.targetIds.map(id => customerService.getCustomerById(id)))
                    .then(customers => {
                         setSelectedCustomerDetails(customers);
                    })
                    .catch(err => console.error("Failed to load selected customers", err));
            } else {
                setSelectedCustomerDetails([]);
            }
        } else {
            // Reset for new task
            setFormData({
                name: '',
                description: '',
                workflowId: '',
                scheduleConfig: {
                    type: 'DAILY',
                    time: '00:00:00',
                    daysOfWeek: [],
                    daysOfMonth: []
                },
                customerMode: 'CUSTOMER_ROLE',
                targetIds: [],
                initialInput: '',
                enabled: true
            });
            setTimeState({ hour: 0, minute: 0, second: 0 });
            setSelectedCustomerDetails([]);
        }
    }, [task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (task) {
                await scheduledTaskApi.updateTask(task.id, formData as SaveScheduledTaskRequest);
            } else {
                await scheduledTaskApi.createTask(formData as SaveScheduledTaskRequest);
            }
            onSave();
        } catch (error) {
            console.error(error);
        }
    };
    
    // Helper to toggle array item
    const toggleArrayItem = (arr: number[], item: number) => {
        return arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item].sort((a,b) => a-b);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                    <h3 className="text-lg font-semibold text-gray-800">{task ? 'Edit Task' : 'Create New Task'}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><Trash2 size={20} className="rotate-45" /></button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task Name</label>
                            <input 
                                type="text" 
                                required
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div className="col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                            <input 
                                type="text" 
                                value={formData.description || ''}
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>

                    {/* Schedule */}
                    <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                        <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                            <Clock size={16} /> Schedule Configuration
                        </h4>
                        
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Frequency</label>
                                <select 
                                    value={formData.scheduleConfig?.type}
                                    onChange={e => setFormData({
                                        ...formData, 
                                        scheduleConfig: {
                                            ...formData.scheduleConfig!,
                                            type: e.target.value as ScheduleType,
                                            daysOfWeek: [],
                                            daysOfMonth: []
                                        }
                                    })}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                >
                                    {FREQUENCY_OPTIONS.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-3 gap-2 col-span-2">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Hour (0-23)</label>
                                    <input 
                                        type="number" min="0" max="23"
                                        value={timeState.hour}
                                        onChange={e => setTimeState({...timeState, hour: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Minute (0-59)</label>
                                    <input 
                                        type="number" min="0" max="59"
                                        value={timeState.minute}
                                        onChange={e => setTimeState({...timeState, minute: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Second (0-59)</label>
                                    <input 
                                        type="number" min="0" max="59"
                                        value={timeState.second}
                                        onChange={e => setTimeState({...timeState, second: parseInt(e.target.value)})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {formData.scheduleConfig?.type === 'WEEKLY' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Days of Week</label>
                                <div className="flex gap-2 flex-wrap">
                                    {DAYS_OF_WEEK.map(day => (
                                        <button
                                            key={day.value}
                                            type="button"
                                            onClick={() => setFormData({
                                                ...formData,
                                                scheduleConfig: {
                                                    ...formData.scheduleConfig!,
                                                    daysOfWeek: toggleArrayItem(formData.scheduleConfig?.daysOfWeek || [], day.value)
                                                }
                                            })}
                                            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                                                formData.scheduleConfig?.daysOfWeek?.includes(day.value)
                                                ? 'bg-blue-100 border-blue-200 text-blue-700 font-medium'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {day.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.scheduleConfig?.type === 'MONTHLY' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">Days of Month (1-31)</label>
                                <div className="grid grid-cols-7 gap-2">
                                    {Array.from({length: 31}, (_, i) => i + 1).map(day => (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => setFormData({
                                                ...formData,
                                                scheduleConfig: {
                                                    ...formData.scheduleConfig!,
                                                    daysOfMonth: toggleArrayItem(formData.scheduleConfig?.daysOfMonth || [], day)
                                                }
                                            })}
                                            className={`py-1 text-xs rounded border transition-colors ${
                                                formData.scheduleConfig?.daysOfMonth?.includes(day)
                                                ? 'bg-blue-100 border-blue-200 text-blue-700 font-medium'
                                                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
                                            }`}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Workflow & Target */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <GitBranch size={16} /> Workflow Configuration
                            </h4>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Select Workflow</label>
                                <select 
                                    required
                                    value={formData.workflowId}
                                    onChange={e => setFormData({...formData, workflowId: e.target.value})}
                                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                >
                                    <option value="">-- Select Workflow --</option>
                                    {workflows.map(wf => (
                                        <option key={wf.id} value={wf.id}>{wf.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-500 mb-1">Initial Input (String)</label>
                                <div className="relative">
                                    <Terminal size={14} className="absolute left-3 top-3 text-gray-400" />
                                    <input 
                                        type="text" 
                                        value={formData.initialInput || ''}
                                        onChange={e => setFormData({...formData, initialInput: e.target.value})}
                                        className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                        placeholder="Start signal..."
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                                <Users size={16} /> Target Audience
                            </h4>
                            
                            <div className="flex gap-4 mb-2">
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="customerMode"
                                        checked={formData.customerMode === 'CUSTOMER_ROLE'}
                                        onChange={() => setFormData({...formData, customerMode: 'CUSTOMER_ROLE', targetIds: []})}
                                        className="text-blue-600"
                                    />
                                    <span>Customer Role</span>
                                </label>
                                <label className="flex items-center gap-2 text-sm cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="customerMode"
                                        checked={formData.customerMode === 'SPECIFIC_CUSTOMER'}
                                        onChange={() => setFormData({...formData, customerMode: 'SPECIFIC_CUSTOMER', targetIds: []})}
                                        className="text-blue-600"
                                    />
                                    <span>Specific Customer</span>
                                </label>
                            </div>

                            {formData.customerMode === 'CUSTOMER_ROLE' ? (
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Select Role</label>
                                    <select 
                                        value={formData.targetIds?.[0] || ''}
                                        onChange={e => setFormData({...formData, targetIds: [e.target.value]})}
                                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm"
                                    >
                                        <option value="">-- Select Role --</option>
                                        {roles.map(role => (
                                            <option key={role.id} value={role.id}>{role.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="relative" ref={dropdownRef}>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Search Customer</label>
                                    
                                    {/* Selected Customer Display */}
                                    {formData.targetIds && formData.targetIds.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2">
                                            {formData.targetIds.map(id => {
                                                const customer = selectedCustomerDetails.find(c => c.id === id) || customers.find(c => c.id === id);
                                                return (
                                                    <div key={id} className="flex items-center gap-1 pl-2 pr-1 py-1 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
                                                        <User size={12} />
                                                        <span className="font-medium max-w-[150px] truncate">
                                                            {customer?.name || `ID: ${id}`}
                                                        </span>
                                                        <button 
                                                            type="button"
                                                            onClick={() => {
                                                                const newIds = formData.targetIds?.filter(tid => tid !== id) || [];
                                                                setFormData({...formData, targetIds: newIds});
                                                                setSelectedCustomerDetails(prev => prev.filter(c => c.id !== id));
                                                            }}
                                                            className="p-0.5 hover:bg-blue-100 rounded-full text-blue-600 transition-colors"
                                                        >
                                                            <X size={14} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    {/* Search Input */}
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                                        <input 
                                            type="text"
                                            value={searchTerm}
                                            onChange={e => {
                                                setSearchTerm(e.target.value);
                                                setShowDropdown(true);
                                            }}
                                            onFocus={() => setShowDropdown(true)}
                                            placeholder={formData.targetIds?.length ? "Add another customer..." : "Type customer name..."}
                                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        />
                                    </div>

                                    {/* Dropdown Results */}
                                    {showDropdown && searchTerm && (
                                        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                            {customers.length === 0 ? (
                                                <div className="p-3 text-center text-xs text-gray-500">No customers found</div>
                                            ) : (
                                                <div className="py-1">
                                                    {customers.map(c => (
                                                        <button
                                                            key={c.id}
                                                            type="button"
                                                            onClick={() => {
                                                                if (!formData.targetIds?.includes(c.id)) {
                                                                    setFormData({
                                                                        ...formData, 
                                                                        targetIds: [...(formData.targetIds || []), c.id]
                                                                    });
                                                                    setSelectedCustomerDetails(prev => {
                                                                        if (prev.some(p => p.id === c.id)) return prev;
                                                                        return [...prev, c];
                                                                    });
                                                                }
                                                                setShowDropdown(false);
                                                                setSearchTerm('');
                                                            }}
                                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center justify-between group"
                                                        >
                                                            <div>
                                                                <div className="font-medium">{c.name}</div>
                                                                <div className="text-xs text-gray-500">{c.primaryChannel}</div>
                                                            </div>
                                                            {formData.targetIds?.includes(c.id) && (
                                                                <Check size={14} className="text-blue-600" />
                                                            )}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <button 
                            type="button" 
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            type="submit"
                            className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium"
                        >
                            Save Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ScheduledTaskSettings;
