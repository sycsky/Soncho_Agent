import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';
import { eventService, EventConfig } from '../../services/eventService';
import { workflowApi } from '../../services/workflowApi';
import { AiWorkflow } from '../../types/workflow';

export const EventSettings: React.FC = () => {
  const [events, setEvents] = useState<EventConfig[]>([]);
  const [workflows, setWorkflows] = useState<AiWorkflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [currentEvent, setCurrentEvent] = useState<Partial<EventConfig>>({
    name: '',
    displayName: '',
    description: '',
    workflowId: '',
    enabled: true,
    sortOrder: 0
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [eventsData, workflowsData] = await Promise.all([
        eventService.getAllEvents(),
        workflowApi.getAllWorkflows()
      ]);
      setEvents(eventsData);
      setWorkflows(workflowsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load events or workflows');
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = () => {
    setCurrentEvent({
      name: '',
      displayName: '',
      description: '',
      workflowId: '',
      enabled: true,
      sortOrder: 0
    });
    setModalMode('create');
    setShowModal(true);
  };

  const handleEditEvent = (event: EventConfig) => {
    setCurrentEvent({ ...event });
    setModalMode('edit');
    setShowModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await eventService.deleteEvent(id);
      setEvents(events.filter(e => e.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Failed to delete event');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      if (modalMode === 'create') {
        const newEvent = await eventService.createEvent(currentEvent as Omit<EventConfig, 'id' | 'createdAt' | 'updatedAt'>);
        setEvents([...events, newEvent]);
      } else {
        if (!currentEvent.id) return;
        const updatedEvent = await eventService.updateEvent(currentEvent.id, currentEvent);
        setEvents(events.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      }
      setShowModal(false);
    } catch (err) {
      console.error('Error saving event:', err);
      alert('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="text-blue-600" size={20} />
            Event Configuration
          </h3>
          <p className="text-sm text-gray-500 mt-1">Manage system events and their associated workflows.</p>
        </div>
        <button 
          onClick={handleAddEvent}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus size={16} /> Add Event
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 flex items-center gap-2">
          <AlertCircle size={20} />
          {error}
        </div>
      )}

      <div className="space-y-4">
        {events.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No events configured. Click "Add Event" to create one.
          </div>
        ) : (
          events.map(event => {
            const workflow = workflows.find(w => w.id === event.workflowId);
            return (
              <div key={event.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{event.displayName}</h4>
                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">{event.name}</span>
                      {event.enabled ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle size={10} /> Enabled
                        </span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded flex items-center gap-1">
                          <XCircle size={10} /> Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{event.description}</p>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="font-medium">Workflow:</span> 
                      {workflow ? (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{workflow.name}</span>
                      ) : (
                        <span className="text-gray-400 italic">No workflow assigned</span>
                      )}
                      <span className="text-gray-300">|</span>
                      <span>Sort Order: {event.sortOrder}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleEditEvent(event)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Edit"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteEvent(event.id!)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-gray-800">
                {modalMode === 'create' ? 'Create New Event' : 'Edit Event'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Name</label>
                  <input 
                    type="text" 
                    required
                    value={currentEvent.name}
                    onChange={e => setCurrentEvent({...currentEvent, name: e.target.value})}
                    placeholder="e.g. order_created"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Unique identifier for system use</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                  <input 
                    type="text" 
                    required
                    value={currentEvent.displayName}
                    onChange={e => setCurrentEvent({...currentEvent, displayName: e.target.value})}
                    placeholder="e.g. Order Created"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea 
                  value={currentEvent.description}
                  onChange={e => setCurrentEvent({...currentEvent, description: e.target.value})}
                  placeholder="Describe when this event is triggered..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Workflow</label>
                <select 
                  value={currentEvent.workflowId || ''}
                  onChange={e => setCurrentEvent({...currentEvent, workflowId: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Select a workflow...</option>
                  {workflows.map(wf => (
                    <option key={wf.id} value={wf.id}>{wf.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    id="eventEnabled"
                    checked={currentEvent.enabled}
                    onChange={e => setCurrentEvent({...currentEvent, enabled: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="eventEnabled" className="text-sm font-medium text-gray-700">Enabled</label>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="sortOrder" className="text-sm font-medium text-gray-700">Sort Order:</label>
                  <input 
                    type="number" 
                    id="sortOrder"
                    value={currentEvent.sortOrder}
                    onChange={e => setCurrentEvent({...currentEvent, sortOrder: parseInt(e.target.value) || 0})}
                    className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Event'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
