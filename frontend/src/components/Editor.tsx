'use client';

import { useState, useEffect } from 'react';
import {
    FaFileCode,
    FaEye,
    FaLightbulb,
    FaMagic,
    FaSave,
    FaBold,
    FaItalic,
    FaList,
    FaLink,
    FaRobot,
    FaSyncAlt,
    FaCheck,
    FaTimes,
} from 'react-icons/fa';
import { Specification, Suggestion, TabType } from '@/lib/types';

interface EditorProps {
    specification?: Specification;
    onSave: (content: string) => void;
    onGenerateSuggestions: () => void;
    suggestions: Suggestion[];
    isLoading?: boolean;
}

export default function Editor({
    specification,
    onSave,
    onGenerateSuggestions,
    suggestions,
    isLoading = false,
}: EditorProps) {
    const [activeTab, setActiveTab] = useState<TabType>('specification');
    const [content, setContent] = useState('');

    useEffect(() => {
        setContent(specification?.content || '');
    }, [specification]);

    const handleToolbarAction = (action: string) => {
        const textarea = document.getElementById('specEditor') as HTMLTextAreaElement;
        if (!textarea) return;

        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = content.substring(start, end);
        let replacement = '';

        switch (action) {
            case 'bold':
                replacement = `**${selectedText}**`;
                break;
            case 'italic':
                replacement = `*${selectedText}*`;
                break;
            case 'list':
                replacement = `- ${selectedText}`;
                break;
            case 'link':
                const url = prompt('Enter URL:');
                if (url) {
                    replacement = `[${selectedText}](${url})`;
                } else {
                    return;
                }
                break;
        }

        const newContent = content.substring(0, start) + replacement + content.substring(end);
        setContent(newContent);
    };

    const renderMarkdownPreview = () => {
        if (!content) {
            return (
                <div className="text-center py-16 text-gray-400">
                    <FaEye className="text-5xl mx-auto mb-3 opacity-50" />
                    <p>Select a specification to preview</p>
                </div>
            );
        }

        // Simple markdown-to-HTML conversion
        let html = content
            .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>')
            .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-6 mb-3">$1</h2>')
            .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-8 mb-4">$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li class="ml-4">$1</li>')
            .replace(/\n\n/gim, '</p><p class="mb-3">')
            .replace(/^(.*)$/gim, '<p class="mb-3">$1</p>');

        return (
            <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        );
    };

    const tabs = [
        { id: 'specification' as TabType, label: 'Specification', icon: FaFileCode },
        { id: 'preview' as TabType, label: 'Preview', icon: FaEye },
        { id: 'suggestions' as TabType, label: 'AI Suggestions', icon: FaLightbulb },
    ];

    return (
        <section className="flex-1 flex flex-col overflow-hidden bg-white">
            {/* Editor Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                <div className="flex gap-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-blue-600 text-white'
                                    : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <tab.icon />
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={onGenerateSuggestions}
                        disabled={!specification || isLoading}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaMagic />
                        Generate Suggestions
                    </button>
                    <button
                        onClick={() => onSave(content)}
                        disabled={!specification || isLoading}
                        className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FaSave />
                        Save
                    </button>
                </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-hidden relative">
                {/* Specification Tab */}
                {activeTab === 'specification' && (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200">
                            <select
                                className="flex-1 max-w-xs px-2 py-1 border border-gray-300 rounded text-sm"
                                value={specification?.id || ''}
                                disabled
                            >
                                <option value="">
                                    {specification?.name || 'Select a specification'}
                                </option>
                            </select>

                            <div className="flex gap-1">
                                {[
                                    { action: 'bold', icon: FaBold },
                                    { action: 'italic', icon: FaItalic },
                                    { action: 'list', icon: FaList },
                                    { action: 'link', icon: FaLink },
                                ].map(({ action, icon: Icon }) => (
                                    <button
                                        key={action}
                                        onClick={() => handleToolbarAction(action)}
                                        className="p-2 border border-gray-300 bg-white rounded hover:bg-gray-100 transition-colors text-xs"
                                    >
                                        <Icon />
                                    </button>
                                ))}
                            </div>
                        </div>

                        <textarea
                            id="specEditor"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Select a specification from the left panel to edit..."
                            className="flex-1 p-4 font-mono text-sm resize-none border-none outline-none"
                        />
                    </div>
                )}

                {/* Preview Tab */}
                {activeTab === 'preview' && (
                    <div className="h-full overflow-y-auto p-6 max-w-3xl mx-auto">
                        {renderMarkdownPreview()}
                    </div>
                )}

                {/* Suggestions Tab */}
                {activeTab === 'suggestions' && (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <h4 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                                <FaLightbulb className="text-yellow-500" />
                                AI Suggestions
                            </h4>
                            <button
                                onClick={onGenerateSuggestions}
                                disabled={isLoading}
                                className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
                            >
                                <FaSyncAlt className={isLoading ? 'animate-spin' : ''} />
                                Refresh
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {suggestions.length === 0 ? (
                                <div className="text-center py-16 text-gray-400">
                                    <FaRobot className="text-5xl mx-auto mb-3 opacity-50" />
                                    <p>Click "Generate Suggestions" to get AI recommendations</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {suggestions.map((suggestion) => (
                                        <div
                                            key={suggestion.id}
                                            className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
                                        >
                                            <pre className="text-sm whitespace-pre-wrap bg-white p-3 rounded border border-gray-100 mb-3">
                                                {suggestion.content}
                                            </pre>
                                            <div className="flex gap-2">
                                                <button className="flex items-center gap-1 px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                                                    <FaCheck />
                                                    Apply
                                                </button>
                                                <button className="flex items-center gap-1 px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors">
                                                    <FaTimes />
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
}
