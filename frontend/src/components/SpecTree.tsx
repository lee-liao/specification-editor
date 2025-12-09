'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FaSitemap, FaUpload, FaFileCode, FaFolder, FaFileUpload, FaFolderOpen, FaChevronRight, FaChevronDown } from 'react-icons/fa';
import { Specification } from '@/lib/types';

interface SpecTreeProps {
    specTree: Specification[];
    selectedSpecId?: string;
    onSelectSpec: (specId: string) => void;
    onUpload: () => void;
}

function SpecTreeNode({
    spec,
    selectedId,
    onSelect,
    level = 0,
}: {
    spec: Specification;
    selectedId?: string;
    onSelect: (id: string) => void;
    level?: number;
}) {
    const [isOpen, setIsOpen] = useState(true);
    const isSelected = spec.id === selectedId;
    const hasChildren = spec.children && spec.children.length > 0;

    // Determine icon based on type
    const isFolder = spec.type === 'directory' || spec.type === 'change';

    return (
        <div>
            <div
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer transition-all text-sm whitespace-nowrap ${isSelected
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'hover:bg-gray-100 text-gray-700'
                    }`}
                style={{ paddingLeft: `${Math.max(4, level * 12 + 4)}px` }}
                onClick={(e) => {
                    if (isFolder) {
                        setIsOpen(!isOpen);
                        e.stopPropagation();
                    } else {
                        onSelect(spec.id);
                    }
                }}
            >
                {/* Toggle Arrow for folders */}
                <span className="w-4 h-4 flex items-center justify-center text-gray-400 p-0.5 hover:text-gray-600">
                    {hasChildren && (
                        isOpen ? <FaChevronDown className="text-[10px]" /> : <FaChevronRight className="text-[10px]" />
                    )}
                </span>

                {/* Icon */}
                {isFolder ? (
                    isOpen ? <FaFolderOpen className="text-yellow-500 min-w-[14px]" /> : <FaFolder className="text-yellow-500 min-w-[14px]" />
                ) : (
                    <FaFileCode className="text-blue-500 min-w-[14px]" />
                )}

                {/* Name */}
                <span className="truncate">{spec.name}</span>
            </div>

            {hasChildren && isOpen && (
                <div className="border-l border-gray-200 ml-[11px]">
                    {spec.children.map((child) => (
                        <SpecTreeNode
                            key={child.id}
                            spec={child}
                            selectedId={selectedId}
                            onSelect={onSelect}
                            level={level + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default function SpecTree({
    specTree,
    selectedSpecId,
    onSelectSpec,
    onUpload,
}: SpecTreeProps) {
    const [width, setWidth] = useState(288); // Default 288px (w-72)
    const [isResizing, setIsResizing] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback(
        (mouseMoveEvent: MouseEvent) => {
            if (isResizing) {
                // Calculate new width restricted between 200px and 600px
                const newWidth = Math.max(200, Math.min(600, mouseMoveEvent.clientX));
                setWidth(newWidth);
            }
        },
        [isResizing]
    );

    useEffect(() => {
        window.addEventListener("mousemove", resize);
        window.addEventListener("mouseup", stopResizing);
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [resize, stopResizing]);

    return (
        <aside
            ref={sidebarRef}
            className="relative bg-white border-r border-gray-200 flex flex-col h-full flex-shrink-0"
            style={{ width: `${width}px` }}
        >
            <div className="p-3 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                    <FaSitemap />
                    Files
                </h3>
                <button
                    onClick={onUpload}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                >
                    <FaUpload />
                    Upload
                </button>
            </div>

            <div className="flex-1 overflow-auto p-1 custom-scrollbar">
                {specTree.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <FaFileUpload className="text-5xl mx-auto mb-3 opacity-50" />
                        <p className="font-medium">No specifications loaded</p>
                        <small className="text-xs">Upload an OpenSpec file to get started</small>
                    </div>
                ) : (
                    <div className="min-w-fit pr-2">
                        {specTree.map((spec) => (
                            <SpecTreeNode
                                key={spec.id}
                                spec={spec}
                                selectedId={selectedSpecId}
                                onSelect={onSelectSpec}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="p-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 flex justify-between items-center flex-shrink-0">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    Ready
                </div>
                <span>{specTree.length} items</span>
            </div>

            {/* Resize Handle */}
            <div
                className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors z-10 ${isResizing ? 'bg-blue-600' : 'bg-transparent'}`}
                onMouseDown={startResizing}
            />
        </aside>
    );
}
