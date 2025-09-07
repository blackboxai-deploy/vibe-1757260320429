const API_BASE = 'http://localhost:8000';

export interface GenerationRequest {
  prompt: string;
  length_seconds: number;
  fps: number;
  width: number;
  height: number;
  seed?: number;
  num_inference_steps: number;
}

export interface GenerationResponse {
  job_id: string;
  status_url: string;
  download_url: string;
  estimated_time_minutes?: number;
}

export interface StatusResponse {
  job_id: string;
  exists: boolean;
  ready: boolean;
  error: boolean;
  status: string;
  progress?: {
    frames_generated?: string;
    total_frames?: string;
    progress_percent?: string;
    status?: string;
  };
  files: string[];
}

export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
}

export async function generateVideo(request: GenerationRequest): Promise<GenerationResponse> {
  try {
    const response = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new APIError(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = await response.json();
    
    // Convert relative URLs to absolute URLs
    if (data.status_url && !data.status_url.startsWith('http')) {
      data.status_url = `${API_BASE}${data.status_url}`;
    }
    if (data.download_url && !data.download_url.startsWith('http')) {
      data.download_url = `${API_BASE}${data.download_url}`;
    }

    return data;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new APIError('Cannot connect to the server. Make sure the FastAPI backend is running on port 8000.');
    }
    
    throw new APIError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

export async function checkGenerationStatus(jobId: string): Promise<StatusResponse> {
  try {
    const response = await fetch(`${API_BASE}/status/${jobId}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Network error' }));
      throw new APIError(
        errorData.detail || `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    return await response.json();
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
      throw new APIError('Cannot connect to the server. Make sure the FastAPI backend is running on port 8000.');
    }
    
    throw new APIError(error instanceof Error ? error.message : 'Unknown error occurred');
  }
}

export async function downloadVideo(jobId: string): Promise<string> {
  try {
    const downloadUrl = `${API_BASE}/download/${jobId}`;
    
    // Check if the video is available
    const response = await fetch(downloadUrl, { method: 'HEAD' });
    
    if (!response.ok) {
      throw new APIError('Video not available for download', response.status);
    }
    
    return downloadUrl;
  } catch (error) {
    if (error instanceof APIError) {
      throw error;
    }
    
    throw new APIError(error instanceof Error ? error.message : 'Failed to get download URL');
  }
}

// Utility function to check if the backend is running
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE}/`, {
      method: 'GET',
      // Add a timeout
      signal: AbortSignal.timeout(5000)
    });
    return response.ok;
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return false;
  }
}

// Helper function to format error messages for users
export function formatErrorMessage(error: unknown): string {
  if (error instanceof APIError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return 'An unexpected error occurred. Please try again.';
}