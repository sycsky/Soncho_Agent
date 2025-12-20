import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { workflowApi } from '../services/workflowApi';

interface SystemPromptEnhancerProps {
    nodeType: string;
    toolIds?: string[];
    userInput: string;
    onEnhanced: (enhancedPrompt: string) => void;
    className?: string;
}

export const SystemPromptEnhancer: React.FC<SystemPromptEnhancerProps> = ({
    nodeType,
    toolIds,
    userInput,
    onEnhanced,
    className = ''
}) => {
    const [loading, setLoading] = useState(false);

    const handleEnhance = async () => {
        if (!userInput.trim()) return;
        
        try {
            setLoading(true);
            const result = await workflowApi.enhanceSystemPrompt({
                nodeType,
                toolIds,
                userInput
            });
            // The API returns { systemPrompt: string } wrapped in data
            // workflowApi.enhanceSystemPrompt already handles the wrapping if it matches handleResponse logic
            if (result && result.systemPrompt) {
                onEnhanced(result.systemPrompt);
            }
        } catch (error) {
            console.error('Failed to enhance prompt:', error);
            // We could add a toast notification here if we had a toast system context
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleEnhance}
            disabled={loading || !userInput.trim()}
            className={`text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 transition-colors ${className} ${loading || !userInput.trim() ? 'opacity-50 cursor-not-allowed' : ''}`}
            title="Enhance prompt with AI"
            type="button" // Important to prevent form submission if inside a form
        >
            {loading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
            Enhance
        </button>
    );
};
