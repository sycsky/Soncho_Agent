
// Workflow Test Types
export interface NodeDetail {
  nodeId: string;
  nodeType: string;
  input: string;
  output: string;
  durationMs: number;
  success: boolean;
}

export interface TestMessageMeta {
  success: boolean;
  durationMs: number;
  errorMessage?: string;
  needHumanTransfer: boolean;
  nodeDetails: NodeDetail[];
}

export interface TestMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  meta?: TestMessageMeta;
}

export interface WorkflowTestSessionDto {
  testSessionId: string;
  workflowId: string;
  workflowName: string;
  messages: TestMessage[];
  createdAt: string;
  lastActiveAt: string;
}
