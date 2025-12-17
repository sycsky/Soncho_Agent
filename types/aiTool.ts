export type AiToolType = 'API' | 'MCP';
export type AuthType = 'NONE' | 'API_KEY' | 'BEARER' | 'BASIC' | 'OAUTH2';
export type FieldType = 
  | 'STRING' 
  | 'NUMBER' 
  | 'INTEGER' 
  | 'BOOLEAN' 
  | 'DATE' 
  | 'DATETIME' 
  | 'EMAIL' 
  | 'PHONE' 
  | 'ENUM' 
  | 'ARRAY' 
  | 'OBJECT';

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
export type McpServerType = 'stdio' | 'sse' | 'websocket';

export interface ParameterDefinition {
  name: string;              // Parameter name
  displayName?: string;       // Display name
  type: FieldType;           // Parameter type
  required: boolean;         // Is required
  description: string;       // Parameter description
  enumValues?: string[];     // Enum values (when type is ENUM)
  defaultValue?: string;     // Default value
  properties?: ParameterDefinition[]; // Nested properties (when type is OBJECT)
  items?: ParameterDefinition; // Array items definition (when type is ARRAY)
}

export interface AiTool {
  id: string;
  name: string;              // Unique identifier for AI calls
  displayName: string;       // Display name
  description: string;       // Tool description
  toolType: AiToolType;
  
  // Parameter Definitions
  parameters: ParameterDefinition[];
  
  // API Configuration
  apiMethod?: ApiMethod;
  apiUrl?: string;           // Supports {{variable}} placeholders
  apiHeaders?: string;       // JSON format string
  apiBodyTemplate?: string;  // Request body template
  apiResponsePath?: string;  // JSONPath to extract response
  apiTimeout?: number;
  
  // MCP Configuration
  mcpEndpoint?: string;
  mcpToolName?: string;
  mcpServerType?: McpServerType;
  mcpConfig?: string;
  
  // Authentication
  authType: AuthType;
  authConfig?: string;       // JSON format string
  
  // Other
  inputExample?: string;
  outputExample?: string;
  retryCount: number;
  requireConfirmation: boolean;
  enabled: boolean;
  sortOrder: number;
  tags?: string;
  
  // Metadata
  createdAt?: string;
  updatedAt?: string;

  // Result Description
  resultDescription?: string;
  resultMetadata?: string; // JSON string
}

export interface CreateAiToolRequest extends Omit<AiTool, 'id' | 'createdAt' | 'updatedAt'> {}

export interface UpdateAiToolRequest extends Partial<CreateAiToolRequest> {}

export interface AiToolExecuteRequest {
  params: Record<string, any>;
  sessionId?: string;
}

export interface AiToolExecuteResponse {
  success: boolean;
  output: string;
  errorMessage?: string;
  httpStatus?: number;
  durationMs: number;
  executionId: string;
}
