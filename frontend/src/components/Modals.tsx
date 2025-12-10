'use client';

import { ReactNode, useRef } from 'react';
import { FaTimes, FaUpload, FaPlus, FaCloudUploadAlt } from 'react-icons/fa';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    icon?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
}

export function Modal({ isOpen, onClose, title, icon, children, footer }: ModalProps) {
    const mouseDownTarget = useRef<EventTarget | null>(null);

    if (!isOpen) return null;

    const handleMouseDown = (e: React.MouseEvent) => {
        mouseDownTarget.current = e.target;
    };

    const handleMouseUp = (e: React.MouseEvent) => {
        if (mouseDownTarget.current === e.currentTarget && e.target === e.currentTarget) {
            onClose();
        }
        mouseDownTarget.current = null;
    };

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
        >
            <div
                className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col"
                onMouseDown={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                    <h3 className="flex items-center gap-2 text-base font-semibold text-gray-900">
                        {icon}
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        <FaTimes />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">{children}</div>

                {footer && (
                    <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200 bg-gray-50">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}

interface UploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    onUpload: (file: File) => void;
    selectedFile?: File | null;
    onFileSelect: (file: File) => void;
    isUploading: boolean;
}

export function UploadModal({
    isOpen,
    onClose,
    onUpload,
    selectedFile,
    onFileSelect,
    isUploading,
}: UploadModalProps) {
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.name.endsWith('.zip')) {
            onFileSelect(file);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onFileSelect(file);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Upload OpenSpec File"
            icon={<FaUpload className="text-blue-600" />}
            footer={
                <>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => selectedFile && onUpload(selectedFile)}
                        disabled={!selectedFile || isUploading}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isUploading ? 'Uploading...' : 'Upload'}
                    </button>
                </>
            }
        >
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById('fileInput')?.click()}
                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${selectedFile
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                    }`}
            >
                <FaCloudUploadAlt className="text-5xl mx-auto mb-3 text-gray-400" />
                {selectedFile ? (
                    <>
                        <h4 className="text-sm font-medium text-gray-800">{selectedFile.name}</h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Size: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                    </>
                ) : (
                    <>
                        <h4 className="text-sm font-medium text-gray-800">
                            Drop OpenSpec file here or click to browse
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                            Supports .zip files containing OpenSpec structure
                        </p>
                    </>
                )}
                <input
                    type="file"
                    id="fileInput"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                />
            </div>

            <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer">
                <input
                    type="checkbox"
                    defaultChecked
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">Validate OpenSpec structure</span>
            </label>
        </Modal>
    );
}

interface NewProjectModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: {
        projectName: string;
        description: string;
        owner: string;
        repository: string;
        isPrivate: boolean;
    }) => void;
    isCreating: boolean;
}

export function NewProjectModal({
    isOpen,
    onClose,
    onCreate,
    isCreating,
}: NewProjectModalProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onCreate({
            projectName: formData.get('projectName') as string,
            description: formData.get('description') as string,
            owner: formData.get('owner') as string,
            repository: formData.get('repository') as string,
            isPrivate: formData.get('isPrivate') === 'on',
        });
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="New Project"
            icon={<FaPlus className="text-blue-600" />}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="newProjectForm"
                        disabled={isCreating}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isCreating ? 'Creating...' : 'Create Project'}
                    </button>
                </>
            }
        >
            <form id="newProjectForm" onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Project Name
                    </label>
                    <input
                        type="text"
                        name="projectName"
                        required
                        placeholder="My OpenSpec Project"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                    </label>
                    <textarea
                        name="description"
                        rows={3}
                        placeholder="Project description..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repository Owner
                    </label>
                    <input
                        type="text"
                        name="owner"
                        required
                        placeholder="username or org"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Repository Name
                    </label>
                    <input
                        type="text"
                        name="repository"
                        required
                        placeholder="repository-name"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                        type="checkbox"
                        name="isPrivate"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-gray-700">Private Repository</span>
                </label>
            </form>
        </Modal>
    );
}

interface LoadingOverlayProps {
    isVisible: boolean;
    message?: string;
}

export function LoadingOverlay({ isVisible, message = 'Processing...' }: LoadingOverlayProps) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg p-6 text-center shadow-xl">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-sm text-gray-700">{message}</p>
            </div>
        </div>
    );
}

interface GenerateCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (branchName: string, prompt: string) => void;
    defaultBranchName?: string;
    isGenerating: boolean;
}

export function GenerateCodeModal({
    isOpen,
    onClose,
    onGenerate,
    defaultBranchName = 'openspec-implementation',
    isGenerating,
}: GenerateCodeModalProps) {
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        onGenerate(
            formData.get('branchName') as string,
            formData.get('prompt') as string
        );
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Generate Codebase"
            icon={<FaCloudUploadAlt className="text-blue-600" />}
            footer={
                <>
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        form="generateCodeForm"
                        disabled={isGenerating}
                        className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? 'Starting...' : 'Start Generation'}
                    </button>
                </>
            }
        >
            <form id="generateCodeForm" onSubmit={handleSubmit} className="space-y-4">
                <p className="text-sm text-gray-600">
                    This will create a new feature branch and push the generated code implementation to your repository.
                    The <strong>main</strong> branch will remain unchanged.
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Feature Branch Name
                    </label>
                    <input
                        type="text"
                        name="branchName"
                        required
                        defaultValue={defaultBranchName}
                        placeholder="feature/openspec-implementation"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Additional Instructions
                    </label>
                    <textarea
                        name="prompt"
                        rows={3}
                        defaultValue="Please implement the OpenSpec change under openspec/changes"
                        placeholder="e.g. Please format the code with Prettier..."
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y"
                    />
                </div>
            </form>
        </Modal>
    );
}
