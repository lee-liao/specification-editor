'use client';

import { FaCodeBranch, FaPlus, FaUserCircle } from 'react-icons/fa';

interface HeaderProps {
    onNewProject: () => void;
    userName?: string;
}

export default function Header({ onNewProject, userName = 'User' }: HeaderProps) {
    return (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-5 z-50 shadow-sm">
            <div className="flex items-center gap-2">
                <FaCodeBranch className="text-blue-600 text-xl" />
                <h1 className="text-xl font-semibold text-gray-900">OpenSpec Workflow</h1>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={onNewProject}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                >
                    <FaPlus />
                    New Project
                </button>

                <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <FaUserCircle className="text-xl" />
                    <span>{userName}</span>
                </div>
            </div>
        </header>
    );
}
