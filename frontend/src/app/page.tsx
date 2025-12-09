'use client';

import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import SpecTree from '@/components/SpecTree';
import Editor from '@/components/Editor';
import Dashboard from '@/components/Dashboard';
import { UploadModal, NewProjectModal, LoadingOverlay, GenerateCodeModal } from '@/components/Modals';
import { Project, Specification, Suggestion, TaskStatus, WorkflowStep } from '@/lib/types';
import * as api from '@/lib/api';

export default function HomePage() {
    // Project state
    const [project, setProject] = useState<Project | undefined>(undefined);
    const [projectId, setProjectId] = useState<string | null>(null);

    // Spec state
    const [specTree, setSpecTree] = useState<Specification[]>([]);
    const [selectedSpec, setSelectedSpec] = useState<Specification | undefined>(undefined);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

    // UI state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
    const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');

    // Workflow state
    const [currentStep, setCurrentStep] = useState<WorkflowStep>(1);
    const [taskStatus, setTaskStatus] = useState<TaskStatus | undefined>(undefined);
    const [isGenerating, setIsGenerating] = useState(false);
    const [canCreatePR, setCanCreatePR] = useState(false);
    const [targetBranch, setTargetBranch] = useState('openspec-implementation');

    // Load project from localStorage on mount
    useEffect(() => {
        const savedProject = localStorage.getItem('openspec_current_project');
        if (savedProject) {
            try {
                const parsed = JSON.parse(savedProject);
                setProject(parsed);
                setProjectId(parsed.id);
            } catch (error) {
                console.error('Error loading saved project:', error);
            }
        }
    }, []);

    // Save project to localStorage when it changes
    useEffect(() => {
        if (project) {
            localStorage.setItem('openspec_current_project', JSON.stringify(project));
        }
    }, [project]);

    // Find spec in tree helper
    const findSpecInTree = useCallback((nodes: Specification[], specId: string): Specification | undefined => {
        for (const node of nodes) {
            if (node.id === specId) return node;
            if (node.children?.length) {
                const found = findSpecInTree(node.children, specId);
                if (found) return found;
            }
        }
        return undefined;
    }, []);

    // Create new project
    const handleCreateProject = async (data: {
        projectName: string;
        description: string;
        owner: string;
        repository: string;
        isPrivate: boolean;
    }) => {
        setIsLoading(true);
        setLoadingMessage('Creating project...');

        try {
            const response = await api.createProject(data);

            if (response.success) {
                setProject({
                    id: response.projectId,
                    projectName: data.projectName,
                    description: data.description,
                    owner: data.owner,
                    repository: data.repository,
                    isPrivate: data.isPrivate,
                    specTree: [],
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
                setProjectId(response.projectId);
                setIsNewProjectModalOpen(false);
            }
        } catch (error: any) {
            alert(`Failed to create project: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Upload OpenSpec file
    const handleUpload = async (file: File) => {
        if (!projectId) {
            alert('Please create a project first');
            return;
        }

        setIsLoading(true);
        setLoadingMessage('Uploading and validating OpenSpec file...');

        try {
            const response = await api.uploadOpenSpec(projectId, file);

            if (response.success) {
                setSpecTree(response.specContent.specTree);
                setProject(prev => prev ? {
                    ...prev,
                    specTree: response.specContent.specTree,
                    openspecFile: {
                        name: file.name,
                        path: '',
                        uploadedAt: new Date().toISOString(),
                    },
                } : undefined);
                setCurrentStep(2);
                setIsUploadModalOpen(false);
                setSelectedFile(null);
            }
        } catch (error: any) {
            alert(`Failed to upload file: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Select specification
    const handleSelectSpec = async (specId: string) => {
        const spec = findSpecInTree(specTree, specId);
        if (spec) {
            setSelectedSpec(spec);
            setSuggestions(spec.suggestions || []);
        }
    };

    // Save specification
    const handleSaveSpec = async (content: string) => {
        if (!projectId || !selectedSpec) return;

        setIsLoading(true);
        setLoadingMessage('Saving specification...');

        try {
            await api.updateSpecification(projectId, selectedSpec.id, {
                content,
                suggestions,
            });

            // Update local state
            setSelectedSpec(prev => prev ? { ...prev, content } : undefined);
            setCurrentStep(Math.max(currentStep, 3) as WorkflowStep);
        } catch (error: any) {
            alert(`Failed to save: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Generate AI suggestions
    const handleGenerateSuggestions = async () => {
        if (!projectId || !selectedSpec) return;

        setIsLoading(true);
        setLoadingMessage('Generating AI suggestions...');

        try {
            const response = await api.generateSuggestions(projectId, selectedSpec.id);

            if (response.success) {
                setSuggestions(response.suggestions);
                setCurrentStep(3);
            }
        } catch (error: any) {
            alert(`Failed to generate suggestions: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Open Generate Code Modal
    const handleGenerateCode = async () => {
        if (!projectId) {
            alert('Please create a project first');
            return;
        }

        if (specTree.length === 0) {
            alert('Please upload an OpenSpec file first');
            return;
        }

        // Validations passed
        try {
            // Fetch suggested branch name from backend (business logic moved to backend)
            const response = await api.getSuggestedBranch(projectId);
            if (response.success && response.branchName) {
                setTargetBranch(response.branchName);
            }
        } catch (error) {
            console.error('Failed to get suggested branch name', error);
            // Fallback
            setTargetBranch('feature/openspec-implementation');
        }
        setIsGenerateModalOpen(true);
    };

    // Confirm Generation
    const handleConfirmGenerate = async (branchName: string) => {
        if (!projectId) return;

        setIsGenerating(true);
        setCurrentStep(4);
        setTargetBranch(branchName);

        try {
            const response = await api.generateCodebase(projectId, branchName);

            if (response.success) {
                setIsGenerateModalOpen(false);
                // Start polling for status
                pollTaskStatus(response.taskId);
            }
        } catch (error: any) {
            alert(`Failed to start generation: ${error.message}`);
            setIsGenerating(false);
        }
    };

    // Poll task status
    const pollTaskStatus = async (taskId: string) => {
        try {
            const response = await api.getTaskStatus(taskId);

            if (response.success) {
                const task = response.task;
                setTaskStatus(task.status);

                if (task.status.completed) {
                    setIsGenerating(false);
                    if (!task.status.error) {
                        setCanCreatePR(true);
                        alert('Code generation completed successfully!');
                    } else {
                        alert(`Generation failed: ${task.status.message}`);
                    }
                } else {
                    // Continue polling
                    setTimeout(() => pollTaskStatus(taskId), 2000);
                }
            }
        } catch (error) {
            console.error('Error checking status:', error);
            setIsGenerating(false);
        }
    };

    // Create pull request
    const handleCreatePR = async () => {
        if (!projectId) return;

        const title = prompt('Enter pull request title:', `OpenSpec Implementation: ${project?.projectName}`);
        if (!title) return;

        const body = prompt('Enter pull request description:', 'Implementation of OpenSpec specifications');
        if (!body) return;

        setIsLoading(true);
        setLoadingMessage('Creating pull request...');

        try {
            const response = await api.createPullRequest(projectId, {
                title,
                body,
                branchName: targetBranch, // Pass the used branch name
            });

            if (response.success) {
                alert('Pull request created successfully!');
            }
        } catch (error: any) {
            alert(`Failed to create PR: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Export project
    const handleExport = () => {
        if (!project) return;

        const dataStr = JSON.stringify(project, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.projectName || 'project'}.json`;
        a.click();

        URL.revokeObjectURL(url);
    };

    // Handle project field changes
    const handleProjectChange = (field: string, value: string | boolean) => {
        setProject(prev => prev ? { ...prev, [field]: value } : undefined);
    };

    return (
        <div className="h-screen flex flex-col bg-gray-100">
            <Header
                onNewProject={() => setIsNewProjectModalOpen(true)}
                userName={project?.owner}
            />

            <main className="flex flex-1 mt-16 overflow-hidden">
                <SpecTree
                    specTree={specTree}
                    selectedSpecId={selectedSpec?.id}
                    onSelectSpec={handleSelectSpec}
                    onUpload={() => {
                        if (!projectId) {
                            alert('Please create a project first');
                            setIsNewProjectModalOpen(true);
                        } else {
                            setIsUploadModalOpen(true);
                        }
                    }}
                />

                <Editor
                    specification={selectedSpec}
                    onSave={handleSaveSpec}
                    onGenerateSuggestions={handleGenerateSuggestions}
                    suggestions={suggestions}
                    isLoading={isLoading}
                />

                <Dashboard
                    project={project}
                    onProjectChange={handleProjectChange}
                    onGenerateCode={handleGenerateCode}
                    onCreatePR={handleCreatePR}
                    onExport={handleExport}
                    currentStep={currentStep}
                    taskStatus={taskStatus}
                    isGenerating={isGenerating}
                    canCreatePR={canCreatePR}
                />
            </main>

            {/* Modals */}
            <UploadModal
                isOpen={isUploadModalOpen}
                onClose={() => {
                    setIsUploadModalOpen(false);
                    setSelectedFile(null);
                }}
                onUpload={handleUpload}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                isUploading={isLoading}
            />

            <NewProjectModal
                isOpen={isNewProjectModalOpen}
                onClose={() => setIsNewProjectModalOpen(false)}
                onCreate={handleCreateProject}
                isCreating={isLoading}
            />

            <GenerateCodeModal
                isOpen={isGenerateModalOpen}
                onClose={() => !isGenerating && setIsGenerateModalOpen(false)}
                onGenerate={handleConfirmGenerate}
                defaultBranchName={targetBranch}
                isGenerating={isGenerating}
            />

            <LoadingOverlay isVisible={isLoading} message={loadingMessage} />
        </div>
    );
}
