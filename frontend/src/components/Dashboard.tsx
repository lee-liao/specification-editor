'use client';

import {
    FaCog,
    FaTasks,
    FaSpinner,
    FaPlay,
    FaUsers,
    FaUserPlus,
    FaCode,
    FaCodeBranch,
    FaDownload,
    FaUpload,
    FaEdit,
    FaRobot,
    FaCheck,
} from 'react-icons/fa';
import { Project, WorkflowStep, TaskStatus } from '@/lib/types';

interface DashboardProps {
    project?: Project;
    onProjectChange: (field: string, value: string | boolean) => void;
    onGenerateCode: () => void;
    onCreatePR: () => void;
    onExport: () => void;
    currentStep: WorkflowStep;
    taskStatus?: TaskStatus;
    isGenerating: boolean;
    canCreatePR: boolean;
}

export default function Dashboard({
    project,
    onProjectChange,
    onGenerateCode,
    onCreatePR,
    onExport,
    currentStep,
    taskStatus,
    isGenerating,
    canCreatePR,
}: DashboardProps) {
    const steps = [
        { id: 1, label: 'Upload/OpenSpec', icon: FaUpload, description: 'OpenSpec file uploaded' },
        { id: 2, label: 'Edit Content', icon: FaEdit, description: 'Currently editing' },
        { id: 3, label: 'AI Assistant', icon: FaRobot, description: 'Pending' },
        { id: 4, label: 'Generate PR', icon: FaCodeBranch, description: 'Pending' },
    ];

    const getProgressPercentage = () => {
        if (!taskStatus) return currentStep * 25;

        const progressMap: Record<string, number> = {
            'initializing': 10,
            'creating_branch': 30,
            'generating_code': 60,
            'pushing_changes': 80,
            'completed': 100,
            'error': 0,
        };

        return progressMap[taskStatus.step] || currentStep * 25;
    };

    return (
        <aside className="w-72 bg-white border-l border-gray-200 flex flex-col h-full overflow-y-auto">
            <div className="p-4 border-b border-gray-200">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    <FaCog />
                    Dashboard
                </h3>
            </div>

            {/* Project Settings */}
            <div className="p-4 border-b border-gray-200">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    <FaCog />
                    Project Settings
                </h4>

                <div className="space-y-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Project Name
                        </label>
                        <input
                            type="text"
                            value={project?.projectName || ''}
                            onChange={(e) => onProjectChange('projectName', e.target.value)}
                            placeholder="My Project"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Repository Owner
                        </label>
                        <input
                            type="text"
                            value={project?.owner || ''}
                            onChange={(e) => onProjectChange('owner', e.target.value)}
                            placeholder="username"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                            Repository Name
                        </label>
                        <input
                            type="text"
                            value={project?.repository || ''}
                            onChange={(e) => onProjectChange('repository', e.target.value)}
                            placeholder="my-repo"
                            className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        />
                    </div>

                    <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                            type="checkbox"
                            checked={project?.isPrivate || false}
                            onChange={(e) => onProjectChange('isPrivate', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-gray-700">Private Repository</span>
                    </label>
                </div>
            </div>

            {/* Workflow Steps */}
            <div className="p-4 border-b border-gray-200">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    <FaTasks />
                    Workflow Steps
                </h4>

                <div className="relative space-y-4">
                    {steps.map((step, index) => {
                        const isCompleted = step.id < currentStep;
                        const isActive = step.id === currentStep;

                        return (
                            <div key={step.id} className="relative flex items-center gap-3">
                                {/* Connection line */}
                                {index < steps.length - 1 && (
                                    <div className="absolute left-4 top-8 h-6 w-px bg-gray-200" />
                                )}

                                {/* Step icon */}
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs z-10 ${isActive
                                            ? 'bg-blue-600 text-white'
                                            : isCompleted
                                                ? 'bg-green-100 text-green-600'
                                                : 'bg-gray-100 text-gray-400'
                                        }`}
                                >
                                    {isCompleted ? <FaCheck /> : <step.icon />}
                                </div>

                                {/* Step content */}
                                <div className={`flex-1 ${isCompleted ? 'opacity-60' : ''}`}>
                                    <h5 className="text-xs font-semibold text-gray-800">
                                        {step.id}. {step.label}
                                    </h5>
                                    <small className="text-[10px] text-gray-500">
                                        {isActive
                                            ? taskStatus?.message || step.description
                                            : isCompleted
                                                ? 'Completed'
                                                : step.description}
                                    </small>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Generation Progress */}
            <div className="p-4 border-b border-gray-200">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    <FaSpinner className={isGenerating ? 'animate-spin' : ''} />
                    Generation Progress
                </h4>

                <div className="space-y-2">
                    <div className="h-1 bg-gray-200 rounded overflow-hidden">
                        <div
                            className="h-full bg-blue-600 transition-all duration-300"
                            style={{ width: `${getProgressPercentage()}%` }}
                        />
                    </div>
                    <div className="text-xs font-medium text-gray-700">
                        {taskStatus?.message || `Step ${currentStep} of 4`}
                    </div>
                    <small className="text-[10px] text-gray-500">
                        {taskStatus?.step === 'completed'
                            ? 'Generation completed!'
                            : taskStatus?.step === 'error'
                                ? 'Error occurred'
                                : 'Ready to generate'}
                    </small>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-b border-gray-200">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    <FaPlay />
                    Actions
                </h4>

                <div className="space-y-2">
                    <button
                        onClick={onGenerateCode}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaCode />
                        Generate Codebase
                    </button>

                    <button
                        onClick={onCreatePR}
                        disabled={!canCreatePR}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaCodeBranch />
                        Create Pull Request
                    </button>

                    <button
                        onClick={onExport}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        <FaDownload />
                        Export Project
                    </button>
                </div>
            </div>

            {/* Collaboration */}
            <div className="p-4">
                <h4 className="flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                    <FaUsers />
                    Collaboration
                </h4>

                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <img
                            src={`https://ui-avatars.com/api/?name=${project?.owner || 'User'}&background=405189&color=fff`}
                            alt="User"
                            className="w-6 h-6 rounded-full"
                        />
                        <div className="flex-1">
                            <span className="block text-xs font-medium text-gray-800">
                                {project?.owner || 'Current User'}
                            </span>
                            <span className="block text-[10px] text-gray-500">Owner</span>
                        </div>
                    </div>

                    <button className="flex items-center gap-1 px-2 py-1 text-xs border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors">
                        <FaUserPlus />
                        Add Collaborator
                    </button>
                </div>
            </div>
        </aside>
    );
}
