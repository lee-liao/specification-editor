// OpenSpec Workflow Frontend JavaScript

class OpenSpecWorkflow {
    constructor() {
        this.currentProject = null;
        this.currentSpec = null;
        this.currentTab = 'specification';
        this.projectId = null;
        this.specTree = [];
        this.originalSpecContent = {};

        this.initializeEventListeners();
        this.loadExistingProject();
    }

    initializeEventListeners() {
        // Header buttons
        document.getElementById('newProjectBtn').addEventListener('click', () => this.showNewProjectModal());
        document.getElementById('uploadBtn').addEventListener('click', () => this.showUploadModal());

        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Editor actions
        document.getElementById('generateSuggestionsBtn').addEventListener('click', () => this.generateSuggestions());
        document.getElementById('saveSpecBtn').addEventListener('click', () => this.saveCurrentSpec());
        document.getElementById('refreshSuggestionsBtn').addEventListener('click', () => this.generateSuggestions());

        // Toolbar actions
        document.querySelectorAll('.toolbar-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.handleToolbarAction(e.target.closest('.toolbar-btn').dataset.action));
        });

        // Spec selector
        document.getElementById('specSelector').addEventListener('change', (e) => this.loadSpecification(e.target.value));

        // Dashboard actions
        document.getElementById('generateCodeBtn').addEventListener('click', () => this.generateCodebase());
        document.getElementById('createPRBtn').addEventListener('click', () => this.createPullRequest());
        document.getElementById('exportBtn').addEventListener('click', () => this.exportProject());
        document.getElementById('addCollaboratorBtn').addEventListener('click', () => this.addCollaborator());

        // Modal handlers
        this.initializeModalHandlers();

        // File upload handlers
        this.initializeFileUploadHandlers();

        // Keyboard shortcuts
        this.initializeKeyboardShortcuts();

        // Auto-save
        this.initializeAutoSave();
    }

    initializeModalHandlers() {
        // Upload modal
        document.getElementById('closeUploadModal').addEventListener('click', () => this.hideUploadModal());
        document.getElementById('cancelUploadBtn').addEventListener('click', () => this.hideUploadModal());
        document.getElementById('confirmUploadBtn').addEventListener('click', () => this.confirmUpload());

        // New project modal
        document.getElementById('closeNewProjectModal').addEventListener('click', () => this.hideNewProjectModal());
        document.getElementById('cancelNewProjectBtn').addEventListener('click', () => this.hideNewProjectModal());
        document.getElementById('createNewProjectBtn').addEventListener('click', () => this.createNewProject());

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideAllModals();
                }
            });
        });

        // AI suggestion box
        document.getElementById('closeSuggestionBtn').addEventListener('click', () => this.hideAISuggestionBox());
    }

    initializeFileUploadHandlers() {
        const uploadArea = document.getElementById('uploadArea');
        const fileInput = document.getElementById('fileInput');
        const openspecFileInput = document.getElementById('openspecFileInput');

        // Click to upload
        uploadArea.addEventListener('click', () => fileInput.click());
        document.getElementById('uploadBtn').addEventListener('click', () => openspecFileInput.click());

        // File selection
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));
        openspecFileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
    }

    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveCurrentSpec();
            }

            // Ctrl/Cmd + N for new project
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                this.showNewProjectModal();
            }

            // Ctrl/Cmd + O to upload
            if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
                e.preventDefault();
                document.getElementById('openspecFileInput').click();
            }

            // Escape to close modals
            if (e.key === 'Escape') {
                this.hideAllModals();
            }
        });
    }

    initializeAutoSave() {
        let autoSaveTimer;
        const specEditor = document.getElementById('specEditor');

        specEditor.addEventListener('input', () => {
            clearTimeout(autoSaveTimer);
            autoSaveTimer = setTimeout(() => {
                this.autoSave();
            }, 2000); // Auto-save after 2 seconds of inactivity
        });
    }

    async loadExistingProject() {
        // Try to load project from localStorage or create a new one
        const savedProject = localStorage.getItem('openspec_current_project');
        if (savedProject) {
            try {
                this.currentProject = JSON.parse(savedProject);
                this.projectId = this.currentProject.id;
                this.updateProjectUI();
            } catch (error) {
                console.error('Error loading saved project:', error);
            }
        }
    }

    showNewProjectModal() {
        document.getElementById('newProjectModal').classList.add('show');
        document.getElementById('newProjectName').focus();
    }

    hideNewProjectModal() {
        document.getElementById('newProjectModal').classList.remove('show');
        this.clearNewProjectForm();
    }

    clearNewProjectForm() {
        document.getElementById('newProjectName').value = '';
        document.getElementById('newProjectDescription').value = '';
        document.getElementById('newRepoOwner').value = '';
        document.getElementById('newRepoName').value = '';
    }

    async createNewProject() {
        const projectName = document.getElementById('newProjectName').value.trim();
        const description = document.getElementById('newProjectDescription').value.trim();
        const repoOwner = document.getElementById('newRepoOwner').value.trim();
        const repoName = document.getElementById('newRepoName').value.trim();

        if (!projectName || !repoOwner || !repoName) {
            alert('Please fill in all required fields');
            return;
        }

        this.showLoading('Creating project...');

        try {
            const response = await this.apiCall('/api/openspec/projects', {
                method: 'POST',
                body: JSON.stringify({
                    projectName,
                    description,
                    owner: repoOwner,
                    repository: repoName,
                    isPrivate: document.getElementById('privateRepo').checked
                })
            });

            if (response.success) {
                this.currentProject = response.project;
                this.projectId = response.projectId;
                this.saveProjectToStorage();
                this.updateProjectUI();
                this.hideNewProjectModal();
                this.showSuccess('Project created successfully');
            } else {
                throw new Error(response.error || 'Failed to create project');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            this.showError('Failed to create project: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    updateProjectUI() {
        if (!this.currentProject) return;

        // Update form fields
        document.getElementById('projectName').value = this.currentProject.projectName || '';
        document.getElementById('repoOwner').value = this.currentProject.owner || '';
        document.getElementById('repoName').value = this.currentProject.repository || '';
        document.getElementById('privateRepo').checked = this.currentProject.isPrivate || false;

        // Update user info
        document.getElementById('userInfo').textContent = this.currentProject.owner || 'User';
    }

    showUploadModal() {
        if (!this.currentProject) {
            alert('Please create a project first');
            return;
        }
        document.getElementById('uploadModal').classList.add('show');
    }

    hideUploadModal() {
        document.getElementById('uploadModal').classList.remove('show');
        this.clearUploadModal();
    }

    clearUploadModal() {
        document.getElementById('fileInput').value = '';
        document.getElementById('confirmUploadBtn').disabled = true;
    }

    handleFileSelect(file) {
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            alert('Please select a .zip file');
            return;
        }

        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            alert('File size must be less than 50MB');
            return;
        }

        // Store the file and enable upload button
        this.selectedFile = file;
        document.getElementById('confirmUploadBtn').disabled = false;

        // Update upload area display
        const uploadArea = document.getElementById('uploadArea');
        uploadArea.innerHTML = `
            <i class="fas fa-file-archive"></i>
            <h4>${file.name}</h4>
            <p>Size: ${(file.size / 1024 / 1024).toFixed(2)} MB</p>
        `;
    }

    async confirmUpload() {
        if (!this.selectedFile || !this.projectId) return;

        this.showLoading('Uploading and validating OpenSpec file...');

        try {
            const formData = new FormData();
            formData.append('openspecFile', this.selectedFile);

            const response = await this.apiCall(`/api/openspec/projects/${this.projectId}/upload`, {
                method: 'POST',
                body: formData
            }, false); // Don't stringify FormData

            if (response.success) {
                this.specTree = response.specContent.specTree;
                this.renderSpecTree();
                this.populateSpecSelector();
                this.updateWorkflowStep(2);
                this.hideUploadModal();
                this.showSuccess('OpenSpec file uploaded and validated successfully');
            } else {
                throw new Error(response.error || 'Failed to upload file');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            this.showError('Failed to upload file: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderSpecTree() {
        const specTreeContainer = document.getElementById('specTree');

        if (!this.specTree || this.specTree.length === 0) {
            specTreeContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-upload"></i>
                    <p>No specifications loaded</p>
                    <small>Upload an OpenSpec file to get started</small>
                </div>
            `;
            return;
        }

        specTreeContainer.innerHTML = this.renderSpecNodes(this.specTree);
        this.attachSpecNodeListeners();
    }

    renderSpecNodes(nodes, level = 0) {
        let html = '';

        for (const node of nodes) {
            const hasChildren = node.children && node.children.length > 0;
            const indent = level * 20;

            html += `
                <div class="spec-tree-item" style="margin-left: ${indent}px;">
                    <div class="spec-tree-node" data-spec-id="${node.id}">
                        <i class="fas fa-${node.type === 'change' ? 'folder' : 'file-code'}"></i>
                        <span>${node.name}</span>
                    </div>
                    ${hasChildren ? `
                        <div class="spec-tree-children">
                            ${this.renderSpecNodes(node.children, level + 1)}
                        </div>
                    ` : ''}
                </div>
            `;
        }

        return html;
    }

    attachSpecNodeListeners() {
        document.querySelectorAll('.spec-tree-node').forEach(node => {
            node.addEventListener('click', (e) => {
                const specId = e.currentTarget.dataset.specId;
                this.selectSpecNode(specId);
            });
        });
    }

    selectSpecNode(specId) {
        // Update active state
        document.querySelectorAll('.spec-tree-node').forEach(node => {
            node.classList.remove('active');
        });
        document.querySelector(`[data-spec-id="${specId}"]`).classList.add('active');

        // Load the specification
        this.loadSpecification(specId);
    }

    populateSpecSelector() {
        const selector = document.getElementById('specSelector');
        selector.innerHTML = '<option value="">Select a specification</option>';

        this.addSpecsToSelector(this.specTree, selector);
    }

    addSpecsToSelector(nodes, selector, prefix = '') {
        for (const node of nodes) {
            if (node.type === 'specification') {
                const option = document.createElement('option');
                option.value = node.id;
                option.textContent = prefix + node.name;
                selector.appendChild(option);
            }

            if (node.children) {
                this.addSpecsToSelector(node.children, selector, prefix + node.name + '/');
            }
        }
    }

    async loadSpecification(specId) {
        if (!specId || !this.projectId) return;

        try {
            const response = await this.apiCall(`/api/openspec/projects/${this.projectId}/specs/${specId}`);

            if (response.success) {
                this.currentSpec = response.spec;
                this.renderSpecification();
                this.renderPreview();
            } else {
                throw new Error(response.error || 'Failed to load specification');
            }
        } catch (error) {
            console.error('Error loading specification:', error);
            this.showError('Failed to load specification: ' + error.message);
        }
    }

    renderSpecification() {
        const editor = document.getElementById('specEditor');
        editor.value = this.currentSpec?.content || '';

        // Store original content for change detection
        if (this.currentSpec && !this.originalSpecContent[this.currentSpec.id]) {
            this.originalSpecContent[this.currentSpec.id] = this.currentSpec.content;
        }
    }

    renderPreview() {
        const preview = document.getElementById('specPreview');

        if (!this.currentSpec?.content) {
            preview.innerHTML = `
                <div class="preview-placeholder">
                    <i class="fas fa-eye"></i>
                    <p>Select a specification to preview</p>
                </div>
            `;
            return;
        }

        // Simple markdown-to-HTML conversion (in a real app, use a proper markdown parser)
        let html = this.currentSpec.content
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
            .replace(/\n\n/gim, '</p><p>')
            .replace(/^(.*)$/gim, '<p>$1</p>')
            .replace(/<p><\/p>/gim, '')
            .replace(/<p>(<h[1-6]>)/gim, '$1')
            .replace(/(<\/h[1-6]>)<\/p>/gim, '$1')
            .replace(/<p>(<ul>)/gim, '$1')
            .replace(/(<\/ul>)<\/p>/gim, '$1');

        preview.innerHTML = `<div class="markdown-preview">${html}</div>`;
    }

    switchTab(tabName) {
        // Update tab states
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content visibility
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}Tab`).classList.add('active');

        this.currentTab = tabName;

        // Refresh suggestions when switching to suggestions tab
        if (tabName === 'suggestions' && this.currentSpec) {
            this.renderSuggestions();
        }
    }

    handleToolbarAction(action) {
        const editor = document.getElementById('specEditor');
        const start = editor.selectionStart;
        const end = editor.selectionEnd;
        const selectedText = editor.value.substring(start, end);
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

        // Update editor content
        editor.value = editor.value.substring(0, start) + replacement + editor.value.substring(end);

        // Restore cursor position
        const newCursorPos = start + replacement.length;
        editor.setSelectionRange(newCursorPos, newCursorPos);
        editor.focus();
    }

    async generateSuggestions() {
        if (!this.currentSpec || !this.projectId) {
            alert('Please select a specification first');
            return;
        }

        this.showLoading('Generating AI suggestions...');

        try {
            const response = await this.apiCall(`/api/openspec/projects/${this.projectId}/specs/${this.currentSpec.id}/suggestions`, {
                method: 'POST',
                body: JSON.stringify({
                    context: 'OpenSpec specification improvement',
                    requirement: 'Enhance clarity and testability'
                })
            });

            if (response.success) {
                this.currentSpec.suggestions = response.suggestions;
                this.renderSuggestions();
                this.showAISuggestionBox(response.suggestions[0]);
            } else {
                throw new Error(response.error || 'Failed to generate suggestions');
            }
        } catch (error) {
            console.error('Error generating suggestions:', error);
            this.showError('Failed to generate suggestions: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    renderSuggestions() {
        const suggestionsList = document.getElementById('suggestionsList');

        if (!this.currentSpec?.suggestions || this.currentSpec.suggestions.length === 0) {
            suggestionsList.innerHTML = `
                <div class="suggestions-placeholder">
                    <i class="fas fa-robot"></i>
                    <p>Click "Generate Suggestions" to get AI recommendations</p>
                </div>
            `;
            return;
        }

        suggestionsList.innerHTML = this.currentSpec.suggestions.map(suggestion => `
            <div class="suggestion-item">
                <pre>${suggestion.content}</pre>
                <div class="suggestion-actions">
                    <button class="btn btn-sm btn-primary" onclick="openspecWorkflow.applySuggestion('${suggestion.id}')">
                        <i class="fas fa-check"></i> Apply
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="openspecWorkflow.dismissSuggestion('${suggestion.id}')">
                        <i class="fas fa-times"></i> Dismiss
                    </button>
                </div>
            </div>
        `).join('');
    }

    showAISuggestionBox(suggestion) {
        if (!suggestion) return;

        const suggestionBox = document.getElementById('aiSuggestionBox');
        const suggestionContent = document.getElementById('suggestionContent');

        suggestionContent.innerHTML = `
            <div class="suggestion-text">
                <p>💡 <strong>Suggestion:</strong> ${suggestion.content}</p>
                <button class="btn btn-sm btn-primary" onclick="openspecWorkflow.applySuggestion('${suggestion.id}')">
                    Accept
                </button>
                <button class="btn btn-sm btn-secondary" onclick="openspecWorkflow.hideAISuggestionBox()">
                    Dismiss
                </button>
            </div>
        `;

        suggestionBox.classList.add('show');

        // Auto-hide after 10 seconds
        setTimeout(() => {
            this.hideAISuggestionBox();
        }, 10000);
    }

    hideAISuggestionBox() {
        document.getElementById('aiSuggestionBox').classList.remove('show');
    }

    applySuggestion(suggestionId) {
        const suggestion = this.currentSpec.suggestions.find(s => s.id === suggestionId);
        if (!suggestion) return;

        const editor = document.getElementById('specEditor');
        editor.value = suggestion.content;

        this.hideAISuggestionBox();
        this.showSuccess('Suggestion applied');
        this.updateWorkflowStep(3);
    }

    dismissSuggestion(suggestionId) {
        this.currentSpec.suggestions = this.currentSpec.suggestions.filter(s => s.id !== suggestionId);
        this.renderSuggestions();
        this.hideAISuggestionBox();
    }

    async saveCurrentSpec() {
        if (!this.currentSpec || !this.projectId) return;

        const editor = document.getElementById('specEditor');
        const newContent = editor.value;

        if (this.originalSpecContent[this.currentSpec.id] === newContent) {
            return; // No changes to save
        }

        this.showLoading('Saving specification...');

        try {
            const response = await this.apiCall(`/api/openspec/projects/${this.projectId}/specs/${this.currentSpec.id}`, {
                method: 'PUT',
                body: JSON.stringify({
                    content: newContent,
                    suggestions: this.currentSpec.suggestions || []
                })
            });

            if (response.success) {
                this.originalSpecContent[this.currentSpec.id] = newContent;
                this.currentSpec.content = newContent;
                this.renderPreview();
                this.showSuccess('Specification saved successfully');
                this.updateWorkflowStep(3);
            } else {
                throw new Error(response.error || 'Failed to save specification');
            }
        } catch (error) {
            console.error('Error saving specification:', error);
            this.showError('Failed to save specification: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    async autoSave() {
        if (!this.currentSpec) return;

        const editor = document.getElementById('specEditor');
        const newContent = editor.value;

        if (this.originalSpecContent[this.currentSpec.id] !== newContent) {
            await this.saveCurrentSpec();
        }
    }

    async generateCodebase() {
        if (!this.projectId) {
            alert('Please create a project first');
            return;
        }

        if (!this.specTree || this.specTree.length === 0) {
            alert('Please upload an OpenSpec file first');
            return;
        }

        if (confirm('This will create a new GitHub repository and generate code based on your specifications. Continue?')) {
            this.showLoading('Starting codebase generation...');

            try {
                const response = await this.apiCall(`/api/openspec/projects/${this.projectId}/generate`, {
                    method: 'POST',
                    body: JSON.stringify({
                        branchName: 'openspec-implementation'
                    })
                });

                if (response.success) {
                    this.startProgressMonitoring(response.taskId);
                    this.showSuccess('Codebase generation started');
                } else {
                    throw new Error(response.error || 'Failed to start generation');
                }
            } catch (error) {
                console.error('Error starting codebase generation:', error);
                this.showError('Failed to start generation: ' + error.message);
            } finally {
                this.hideLoading();
            }
        }
    }

    startProgressMonitoring(taskId) {
        this.updateWorkflowStep(4);

        const checkProgress = async () => {
            try {
                const response = await this.apiCall(`/api/openspec/tasks/${taskId}/status`);

                if (response.success) {
                    const task = response.task;
                    this.updateProgressUI(task);

                    if (task.status.completed) {
                        this.showSuccess('Codebase generation completed successfully');
                        document.getElementById('createPRBtn').disabled = false;
                    } else if (task.status.error) {
                        this.showError('Generation failed: ' + task.status.error);
                    } else {
                        // Continue monitoring
                        setTimeout(checkProgress, 2000);
                    }
                }
            } catch (error) {
                console.error('Error checking progress:', error);
            }
        };

        checkProgress();
    }

    updateProgressUI(task) {
        const progressText = document.getElementById('progressText');
        const progressFill = document.getElementById('progressFill');
        const progressDetails = document.getElementById('progressDetails');

        progressText.textContent = task.status.message || 'Processing...';

        // Update progress bar based on step
        const stepProgress = {
            'repository_creation': 20,
            'creating_repository': 40,
            'creating_branch': 60,
            'generating_code': 80,
            'completed': 100
        };

        const progress = stepProgress[task.status.step] || 0;
        progressFill.style.width = `${progress}%`;

        progressDetails.innerHTML = `<small>Last updated: ${new Date(task.updatedAt).toLocaleTimeString()}</small>`;
    }

    updateWorkflowStep(stepNumber) {
        // Update step states
        for (let i = 1; i <= 4; i++) {
            const step = document.getElementById(`step${i}`);
            if (i < stepNumber) {
                step.classList.add('completed');
                step.classList.remove('active');
            } else if (i === stepNumber) {
                step.classList.add('active');
                step.classList.remove('completed');
            } else {
                step.classList.remove('active', 'completed');
            }
        }

        // Update progress text
        const stepNames = ['', 'Upload/OpenSpec', 'Edit Content', 'AI Assistant', 'Generate PR'];
        document.getElementById('progressText').textContent = `Step ${stepNumber} of 4: ${stepNames[stepNumber]}`;
    }

    async createPullRequest() {
        if (!this.currentProject) {
            alert('No project available');
            return;
        }

        const title = prompt('Enter pull request title:', `OpenSpec Implementation: ${this.currentProject.projectName}`);
        if (!title) return;

        const description = prompt('Enter pull request description:', 'Implementation of OpenSpec specifications');
        if (!description) return;

        this.showLoading('Creating pull request...');

        try {
            const response = await this.apiCall(`/api/openspec/projects/${this.projectId}/pull-request`, {
                method: 'POST',
                body: JSON.stringify({
                    title,
                    description,
                    sourceBranch: 'openspec-implementation',
                    targetBranch: 'main'
                })
            });

            if (response.success) {
                this.showSuccess(`Pull request created: ${response.pullRequest.url}`);
                window.open(response.pullRequest.url, '_blank');
            } else {
                throw new Error(response.error || 'Failed to create pull request');
            }
        } catch (error) {
            console.error('Error creating pull request:', error);
            this.showError('Failed to create pull request: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }

    exportProject() {
        if (!this.currentProject) {
            alert('No project to export');
            return;
        }

        const exportData = {
            project: this.currentProject,
            specTree: this.specTree,
            timestamp: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.currentProject.projectName.replace(/\s+/g, '-').toLowerCase()}-export.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showSuccess('Project exported successfully');
    }

    addCollaborator() {
        const email = prompt('Enter collaborator email:');
        if (email) {
            // In a real app, this would make an API call
            this.showSuccess(`Collaborator invitation sent to ${email}`);
        }
    }

    saveProjectToStorage() {
        if (this.currentProject) {
            localStorage.setItem('openspec_current_project', JSON.stringify(this.currentProject));
        }
    }

    hideAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
        });
    }

    showLoading(message = 'Loading...') {
        document.getElementById('loadingText').textContent = message;
        document.getElementById('loadingOverlay').classList.add('show');
    }

    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
    }

    showSuccess(message) {
        this.showToast(message, 'success');
    }

    showError(message) {
        this.showToast(message, 'error');
    }

    showToast(message, type = 'info') {
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Add toast styles if not already present
        if (!document.querySelector('#toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                .toast {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    background: white;
                    padding: 12px 16px;
                    border-radius: 6px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    z-index: 4000;
                    max-width: 400px;
                    font-size: 14px;
                }
                .toast-success { border-left: 4px solid var(--success-color); }
                .toast-error { border-left: 4px solid var(--danger-color); }
                .toast-info { border-left: 4px solid var(--info-color); }
                .toast i { color: var(--primary-color); }
                .toast-error i { color: var(--danger-color); }
                .toast-success i { color: var(--success-color); }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 4000);
    }

    async apiCall(endpoint, options = {}) {
        const url = endpoint.startsWith('http') ? endpoint : `${window.location.origin}${endpoint}`;

        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
        };

        const finalOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers,
            }
        };

        // Don't stringify body if it's FormData
        if (finalOptions.body && !(finalOptions.body instanceof FormData)) {
            finalOptions.body = typeof finalOptions.body === 'string' ? finalOptions.body : JSON.stringify(finalOptions.body);
        }

        const response = await fetch(url, finalOptions);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || `HTTP error! status: ${response.status}`);
        }

        return data;
    }
}

// Initialize the OpenSpec Workflow when the DOM is ready
let openspecWorkflow;

document.addEventListener('DOMContentLoaded', () => {
    openspecWorkflow = new OpenSpecWorkflow();
});

// Export for global access
window.openspecWorkflow = null;