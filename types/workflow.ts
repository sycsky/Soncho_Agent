export interface WorkflowNode {
  id: string;
  type: string;
  data: {
    label: string;
    config?: any;
    [key: string]: any;
  };
  position: {
    x: number;
    y: number;
  };
  [key: string]: any;
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  label?: string;
  type?: string;
  animated?: boolean;
  style?: any;
  [key: string]: any;
}

export interface WorkflowCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  sortOrder?: number;
}

export interface AiWorkflow {
  id: string;
  name: string;
  description?: string;
  nodesJson: string;
  edgesJson: string;
  liteflowEl?: string;
  version?: number;
  enabled?: boolean;
  isDefault?: boolean;
  createdByAgentId?: string;
  createdByAgentName?: string;
  triggerType?: 'ALL' | 'CATEGORY' | 'KEYWORD';
  triggerConfig?: string;
  categoryIds?: string[];
  categories?: WorkflowCategory[];
  createdAt?: string;
  updatedAt?: string;
  
  // Helper fields for UI (not in API but useful)
  nodes?: WorkflowNode[];
  edges?: WorkflowEdge[];
}

export interface LlmProvider {
  code: string;
  name: string;
  defaultBaseUrl?: string | null;
}

export interface LlmModel {
  id: string;
  name: string;
  code: string;
  provider: string;
  modelType?: 'CHAT' | 'EMBEDDING';
  modelName: string;
  baseUrl?: string;
  apiKey?: string;
  apiVersion?: string;
  azureDeploymentName?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  contextWindow?: number;
  inputPricePer1k?: number;
  outputPricePer1k?: number;
  supportsFunctions?: boolean;
  supportsVision?: boolean;
  enabled?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  nodesJson: string;
  edgesJson: string;
  triggerType?: string;
  triggerConfig?: string;
  categoryIds?: string[];
}

export interface UpdateWorkflowRequest extends CreateWorkflowRequest {}
