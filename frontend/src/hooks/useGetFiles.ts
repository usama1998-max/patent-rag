import { useQuery } from '@tanstack/react-query';
import axiosInstance from '../hooks/hostInstance.ts'; // Import your custom Axios instance

export interface ProjectList {
  project_name: string;
  created_at: string;
  unique_id: string;
}

export interface ProjectDocumentList {
  file: string;
  uploaded_at: string;
  unique_id: string;
  project_id: string;
}

const fetchProjectList = async (): Promise<ProjectList[]> => {
  const response = await axiosInstance.get('get-projects/');
  return response.data.message;
};

const fetchProjectDocumentList = async (projectId: string | null): Promise<ProjectDocumentList[]> => {

  const response = await axiosInstance.get(`get-documents/${projectId}/`)

  return response.data.message;
};

export const useProjectList = () => {
  return useQuery<ProjectList[]>({
    queryKey: ['project'],
    queryFn: fetchProjectList,
  });
};


export const useProjectDocumentList = (projectId: string | null) => {


  return useQuery<ProjectDocumentList[]>({
    queryKey: ['document'],
    queryFn: ()=> fetchProjectDocumentList(projectId),
    enabled: !!projectId,
  });
};
