/**
 * API client for OpenSpec Workflow backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T = any> {
    success: boolean;
    error?: string;
    [key: string]: any;
}

async function apiCall<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultHeaders: HeadersInit = {};

    // Only add Content-Type for non-FormData requests
    if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers,
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `API Error: ${response.status}`);
    }

    return response.json();
}

// Project APIs
export async function createProject(data: {
    projectName: string;
    description?: string;
    owner: string;
    repository: string;
    isPrivate?: boolean;
}) {
    return apiCall<ApiResponse>('/api/openspec/projects', {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function getProject(projectId: string) {
    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}`);
}

// Upload APIs
export async function uploadOpenSpec(projectId: string, file: File) {
    const formData = new FormData();
    formData.append('openspecFile', file);

    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}/upload`, {
        method: 'POST',
        body: formData,
    });
}

// Specification APIs
export async function getSpecification(projectId: string, specId: string) {
    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}/specs/${specId}`);
}

export async function updateSpecification(
    projectId: string,
    specId: string,
    data: { content: string; suggestions?: any[] }
) {
    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}/specs/${specId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

// AI Suggestions
export async function generateSuggestions(projectId: string, specId: string) {
    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}/specs/${specId}/suggestions`, {
        method: 'POST',
        body: JSON.stringify({}),
    });
}

// Code Generation
export async function generateCodebase(projectId: string, branchName: string = 'openspec-implementation') {
    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}/generate`, {
        method: 'POST',
        body: JSON.stringify({ branchName }),
    });
}

export async function getSuggestedBranch(projectId: string) {
    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}/suggested-branch`);
}

export async function getTaskStatus(taskId: string) {
    return apiCall<ApiResponse>(`/api/openspec/tasks/${taskId}/status`);
}

// Pull Request
export async function createPullRequest(
    projectId: string,
    data: { title: string; body: string; branchName?: string }
) {
    return apiCall<ApiResponse>(`/api/openspec/projects/${projectId}/pull-request`, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

// Health Check
export async function healthCheck() {
    return apiCall<ApiResponse>('/health');
}
