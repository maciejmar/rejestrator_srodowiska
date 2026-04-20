export type ModelType = 'LLM' | 'Code' | 'Multimodal' | 'Embedding' | 'Image';
export type ModelStatus = 'available' | 'busy' | 'maintenance';

export interface AIModel {
  id: string;
  name: string;
  description: string;
  type: ModelType;
  parameters: string;
  status: ModelStatus;
  maxConcurrentUsers: number;
  contextWindow?: string;
  vendor?: string;
}
