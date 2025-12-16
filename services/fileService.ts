import api from './api';

export interface FileUploadResponse {
  id: string;
  originalName: string;
  url: string;
  contentType: string;
  fileSize: number;
  extension: string;
  storageType: string;
  category: string;
  uploaderId: string;
  uploaderType: string;
  referenceId: string;
  referenceType: string;
  isPublic: boolean;
  createdAt: string;
}

const uploadFile = (
  file: File, 
  referenceId: string, 
  referenceType: string = 'MESSAGE', 
  isPublic: boolean = true
): Promise<FileUploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('referenceId', referenceId);
  formData.append('referenceType', referenceType);
  formData.append('isPublic', String(isPublic));

  return api.post<FileUploadResponse>('/files/upload', formData);
};

export default {
  uploadFile
};
