import api from './api';

export interface Language {
  code: string;
  name: string;
}

export const getSupportedLanguages = (): Promise<Language[]> => {
  return api.get<Language[]>('/translation/languages');
};
