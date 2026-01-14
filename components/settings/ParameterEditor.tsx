import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Plus } from 'lucide-react';
import { ParameterDefinition, FieldType } from '../../types/aiTool';

interface ParameterEditorProps {
  parameter: ParameterDefinition;
  onChange: (updatedParameter: ParameterDefinition) => void;
  onRemove: () => void;
  depth?: number; // For indentation visual
  isItemDefinition?: boolean; // Whether this is an array item definition
}

const FIELD_TYPES: FieldType[] = [
  'STRING', 'NUMBER', 'INTEGER', 'BOOLEAN', 'DATE', 'DATETIME', 'EMAIL', 'PHONE', 'ENUM', 'ARRAY', 'OBJECT'
];

export const ParameterEditor: React.FC<ParameterEditorProps> = ({ parameter, onChange, onRemove, depth = 0, isItemDefinition = false }) => {
  const { t } = useTranslation();
  const handleChange = (field: keyof ParameterDefinition, value: any) => {
    if (field === 'type') {
      const newType = value as FieldType;
      const updatedParameter = { ...parameter, type: newType };

      // Clear fields that are not relevant to the new type
      if (newType !== 'OBJECT') {
        delete updatedParameter.properties;
      }
      if (newType !== 'ARRAY') {
        delete updatedParameter.items;
      }
      if (newType !== 'ENUM') {
        delete updatedParameter.enumValues;
      }

      onChange(updatedParameter);
    } else {
      onChange({ ...parameter, [field]: value });
    }
  };

  const handleAddProperty = () => {
    const newProperty: ParameterDefinition = {
      name: '',
      type: 'STRING',
      required: true,
      description: ''
    };
    const currentProperties = parameter.properties || [];
    handleChange('properties', [...currentProperties, newProperty]);
  };

  const handlePropertyChange = (index: number, updatedProperty: ParameterDefinition) => {
    const currentProperties = [...(parameter.properties || [])];
    currentProperties[index] = updatedProperty;
    handleChange('properties', currentProperties);
  };

  const handleRemoveProperty = (index: number) => {
    const currentProperties = [...(parameter.properties || [])];
    currentProperties.splice(index, 1);
    handleChange('properties', currentProperties);
  };

  const handleItemsChange = (updatedItems: ParameterDefinition) => {
    handleChange('items', updatedItems);
  };

  // Initialize items if type is ARRAY and items is undefined
  React.useEffect(() => {
    if (parameter.type === 'ARRAY' && !parameter.items) {
      handleChange('items', {
        name: 'item',
        type: 'STRING',
        required: true,
        description: ''
      });
    }
    // Initialize properties if type is OBJECT and properties is undefined
    if (parameter.type === 'OBJECT' && !parameter.properties) {
      handleChange('properties', []);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameter.type]);

  const bgColors = ['bg-gray-50', 'bg-white', 'bg-gray-50', 'bg-white'];
  const bgColor = bgColors[depth % bgColors.length];

  return (
    <div className={`${bgColor} p-4 rounded-lg border border-gray-200 relative group`}>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-2 top-2 text-gray-400 hover:text-red-500 p-1 rounded hover:bg-red-50 transition-colors z-10"
        title={t('remove_parameter')}
      >
        <Trash2 size={16} />
      </button>

      {!isItemDefinition && (
        <div className="mb-3 pr-8">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('parameter_name')}</label>
          <input
            type="text"
            value={parameter.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
            placeholder={t('parameter_name_placeholder')}
          />
        </div>
      )}

      <div className="grid grid-cols-4 gap-4 mb-3">
        <div className="col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('type_label')}</label>
          <select
            value={parameter.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          >
            {FIELD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        {!isItemDefinition && (
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={parameter.required}
                onChange={(e) => handleChange('required', e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              {t('required_label')}
            </label>
          </div>
        )}
      </div>

      {parameter.type === 'ENUM' && (
        <div className="mb-3">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('enum_values_label')}</label>
          <input
            type="text"
            value={parameter.enumValues?.join(', ') || ''}
            onChange={(e) => handleChange('enumValues', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
            className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm font-mono"
            placeholder={t('parameter_enum_placeholder')}
          />
        </div>
      )}

      <div className="mb-3">
        <label className="block text-xs font-medium text-gray-500 mb-1">{t('description_label')}</label>
        <input
          type="text"
          value={parameter.description}
          onChange={(e) => handleChange('description', e.target.value)}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          placeholder={t('parameter_description_placeholder')}
        />
      </div>

      {/* Nested Object Properties */}
      {parameter.type === 'OBJECT' && (
        <div className="mt-4 pl-4 border-l-2 border-blue-200">
          <div className="flex justify-between items-center mb-2">
            <h5 className="text-xs font-bold text-gray-600 uppercase">{t('properties_label')}</h5>
            <button
              type="button"
              onClick={handleAddProperty}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              <Plus size={14} /> {t('add_property')}
            </button>
          </div>
          <div className="space-y-3">
            {(parameter.properties || []).map((prop, idx) => (
              <ParameterEditor
                key={idx}
                parameter={prop}
                onChange={(updated) => handlePropertyChange(idx, updated)}
                onRemove={() => handleRemoveProperty(idx)}
                depth={depth + 1}
              />
            ))}
            {(!parameter.properties || parameter.properties.length === 0) && (
              <div className="text-center py-4 text-gray-400 text-xs italic">
                {t('no_properties_defined')}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Array Items Definition */}
      {parameter.type === 'ARRAY' && parameter.items && (
        <div className="mt-4 pl-4 border-l-2 border-purple-200">
          <h5 className="text-xs font-bold text-gray-600 uppercase mb-2">{t('array_items_definition')}</h5>
          <ParameterEditor
            parameter={parameter.items}
            onChange={handleItemsChange}
            onRemove={() => {}} // Cannot remove the items definition itself, only change it
            depth={depth + 1}
            isItemDefinition={true}
          />
        </div>
      )}
    </div>
  );
};
