/**
 * OpenSpec Workflow Routes
 * 
 * API endpoints for managing OpenSpec projects, specifications,
 * AI suggestions, and code generation.
 */

const express = require('express');
const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const AdmZip = require('adm-zip');
const { v4: uuidv4 } = require('uuid');
const Anthropic = require('@anthropic-ai/sdk');
const { GitHubApiClient } = require('../utils/github-api-client');

const router = express.Router();

// Initialize services
const githubClient = new GitHubApiClient();
const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

// In-memory storage for user sessions and projects
const userSessions = new Map();
const taskManager = new Map();

// ============================================
// Helper Functions
// ============================================

/**
 * Validate OpenSpec zip structure
 */
async function validateOpenSpecStructure(filePath) {
    try {
        const zip = new AdmZip(filePath);
        const entries = zip.getEntries();

        let hasOpenspecDir = false;
        let hasChangesDir = false;
        let hasSpecsDir = false;
        let hasProjectMd = false;

        for (const entry of entries) {
            const entryPath = entry.entryName.toLowerCase();
            if (entryPath.includes('openspec/') || entryPath.startsWith('openspec')) {
                hasOpenspecDir = true;
            }
            if (entryPath.includes('changes/')) {
                hasChangesDir = true;
            }
            if (entryPath.includes('specs/')) {
                hasSpecsDir = true;
            }
            if (entryPath.includes('project.md')) {
                hasProjectMd = true;
            }
        }

        return {
            isValid: hasOpenspecDir || hasChangesDir || hasProjectMd,
            hasOpenspecDir,
            hasChangesDir,
            hasSpecsDir,
            hasProjectMd,
            errors: []
        };
    } catch (error) {
        return {
            isValid: false,
            errors: [error.message]
        };
    }
}

/**
 * Extract OpenSpec content from zip file
 */
async function extractOpenSpecContent(filePath) {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    const specTree = [];
    const rootSpec = null;

    for (const entry of entries) {
        if (entry.isDirectory) continue;

        const entryPath = entry.entryName;
        const fileName = path.basename(entryPath);
        const content = entry.getData().toString('utf8');

        // Build spec tree structure
        if (fileName.endsWith('.md')) {
            const id = uuidv4();
            specTree.push({
                id,
                name: fileName,
                path: entryPath,
                type: entryPath.includes('changes/') ? 'change' : 'specification',
                content,
                children: []
            });
        }
    }

    return { specTree, rootSpec };
}

/**
 * Find spec in tree by ID
 */
function findSpecInTree(nodes, specId) {
    for (const node of nodes) {
        if (node.id === specId) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const found = findSpecInTree(node.children, specId);
            if (found) return found;
        }
    }
    return null;
}

/**
 * Update spec in tree
 */
function updateSpecInTree(nodes, specId, updates) {
    for (const node of nodes) {
        if (node.id === specId) {
            Object.assign(node, updates);
            return true;
        }
        if (node.children && node.children.length > 0) {
            if (updateSpecInTree(node.children, specId, updates)) return true;
        }
    }
    return false;
}

// ============================================
// Project Management Routes
// ============================================

/**
 * @swagger
 * /api/openspec/projects:
 *   post:
 *     summary: Initialize a new OpenSpec project
 *     tags: [OpenSpec Workflow]
 *     description: Creates a new OpenSpec project session
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               projectName:
 *                 type: string
 *               description:
 *                 type: string
 *               owner:
 *                 type: string
 *               repository:
 *                 type: string
 *               isPrivate:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Project created successfully
 *       400:
 *         description: Missing required fields
 */
router.post('/projects', async (req, res) => {
    try {
        const { projectName, description, owner, repository, isPrivate = false } = req.body;

        if (!projectName || !owner || !repository) {
            return res.status(400).json({
                error: 'Missing required fields: projectName, owner, and repository are required'
            });
        }

        const projectId = uuidv4();
        const project = {
            id: projectId,
            projectName,
            description,
            owner,
            repository,
            isPrivate,
            specTree: [],
            currentSpec: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        userSessions.set(projectId, project);

        res.json({
            success: true,
            projectId,
            project: {
                id: projectId,
                projectName,
                owner,
                repository,
                isPrivate
            }
        });
    } catch (error) {
        console.error('Error creating OpenSpec project:', error);
        res.status(500).json({ error: 'Failed to create project' });
    }
});

/**
 * @swagger
 * /api/openspec/projects/{projectId}:
 *   get:
 *     summary: Get project information
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Project information
 *       404:
 *         description: Project not found
 */
router.get('/projects/:projectId', async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = userSessions.get(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        res.json({
            success: true,
            project
        });
    } catch (error) {
        console.error('Error getting project:', error);
        res.status(500).json({ error: 'Failed to get project' });
    }
});

// ============================================
// File Upload Routes
// ============================================

/**
 * @swagger
 * /api/openspec/projects/{projectId}/upload:
 *   post:
 *     summary: Upload and validate OpenSpec file
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               openspecFile:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *       400:
 *         description: Invalid file
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/upload', async (req, res) => {
    try {
        const { projectId } = req.params;
        const project = userSessions.get(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        if (!req.files || !req.files.openspecFile) {
            return res.status(400).json({ error: 'No OpenSpec file uploaded' });
        }

        const openspecFile = req.files.openspecFile;

        // Save file to temp directory
        const uploadDir = path.join(__dirname, '..', 'temp', projectId);
        await fs.mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, openspecFile.name);
        await openspecFile.mv(filePath);

        // Validate OpenSpec structure
        const validationResult = await validateOpenSpecStructure(filePath);

        if (!validationResult.isValid) {
            return res.status(400).json({
                error: 'Invalid OpenSpec structure',
                details: validationResult.errors
            });
        }

        // Extract and analyze the OpenSpec content
        const specContent = await extractOpenSpecContent(filePath);

        // Update project
        project.openspecFile = {
            name: openspecFile.name,
            path: filePath,
            uploadedAt: new Date()
        };
        project.specTree = specContent.specTree;
        project.currentSpec = specContent.rootSpec;
        project.updatedAt = new Date();

        userSessions.set(projectId, project);

        res.json({
            success: true,
            specContent,
            message: 'OpenSpec file uploaded and validated successfully'
        });
    } catch (error) {
        console.error('Error uploading OpenSpec file:', error);
        res.status(500).json({ error: 'Failed to upload OpenSpec file' });
    }
});

// ============================================
// Specification Routes
// ============================================

/**
 * @swagger
 * /api/openspec/projects/{projectId}/specs/{specId}:
 *   get:
 *     summary: Get specification content
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: specId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Specification content
 *       404:
 *         description: Not found
 */
router.get('/projects/:projectId/specs/:specId', async (req, res) => {
    try {
        const { projectId, specId } = req.params;
        const project = userSessions.get(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const spec = findSpecInTree(project.specTree, specId);

        if (!spec) {
            return res.status(404).json({ error: 'Specification not found' });
        }

        res.json({
            success: true,
            spec
        });
    } catch (error) {
        console.error('Error getting specification:', error);
        res.status(500).json({ error: 'Failed to get specification' });
    }
});

/**
 * @swagger
 * /api/openspec/projects/{projectId}/specs/{specId}:
 *   put:
 *     summary: Update specification content
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: specId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *               suggestions:
 *                 type: array
 *     responses:
 *       200:
 *         description: Specification updated
 *       404:
 *         description: Not found
 */
router.put('/projects/:projectId/specs/:specId', async (req, res) => {
    try {
        const { projectId, specId } = req.params;
        const { content, suggestions } = req.body;
        const project = userSessions.get(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const updated = updateSpecInTree(project.specTree, specId, {
            content,
            suggestions,
            updatedAt: new Date()
        });

        if (!updated) {
            return res.status(404).json({ error: 'Specification not found' });
        }

        project.updatedAt = new Date();
        userSessions.set(projectId, project);

        res.json({
            success: true,
            message: 'Specification updated successfully'
        });
    } catch (error) {
        console.error('Error updating specification:', error);
        res.status(500).json({ error: 'Failed to update specification' });
    }
});

// ============================================
// AI Suggestions Routes
// ============================================

/**
 * @swagger
 * /api/openspec/projects/{projectId}/specs/{specId}/suggestions:
 *   post:
 *     summary: Generate AI suggestions for a specification
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: specId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Suggestions generated
 *       404:
 *         description: Not found
 */
router.post('/projects/:projectId/specs/:specId/suggestions', async (req, res) => {
    try {
        const { projectId, specId } = req.params;
        const project = userSessions.get(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const spec = findSpecInTree(project.specTree, specId);

        if (!spec) {
            return res.status(404).json({ error: 'Specification not found' });
        }

        // Generate AI suggestions using Claude
        const suggestions = await generateAISuggestions(spec.content, project);

        // Update spec with suggestions
        updateSpecInTree(project.specTree, specId, { suggestions });
        userSessions.set(projectId, project);

        res.json({
            success: true,
            suggestions
        });
    } catch (error) {
        console.error('Error generating suggestions:', error);
        res.status(500).json({ error: 'Failed to generate suggestions' });
    }
});

/**
 * Generate AI suggestions using Claude
 */
async function generateAISuggestions(specContent, project) {
    try {
        const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 2048,
            messages: [
                {
                    role: 'user',
                    content: `You are an expert software architect reviewing an OpenSpec specification. 
          
Please analyze this specification and provide 2-3 specific suggestions to improve it. Focus on:
1. Clarity and completeness
2. Testability
3. Edge cases that should be considered
4. Potential implementation challenges

Specification content:
${specContent}

Respond with a JSON array of suggestions, each with "id" and "content" fields.`
                }
            ]
        });

        // Parse the response
        const responseText = message.content[0].text;

        // Try to extract JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        // Fallback: create suggestions from the text
        return [
            {
                id: uuidv4(),
                content: responseText
            }
        ];
    } catch (error) {
        console.error('Error calling Claude API:', error);
        // Return placeholder suggestions if API fails
        return [
            {
                id: uuidv4(),
                content: 'Consider adding more specific acceptance criteria for this feature.'
            },
            {
                id: uuidv4(),
                content: 'Add error handling scenarios to make the specification more robust.'
            }
        ];
    }
}

// ============================================
// Code Generation Routes
// ============================================

/**
 * @swagger
 * /api/openspec/projects/{projectId}/generate:
 *   post:
 *     summary: Generate codebase from OpenSpec
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               branchName:
 *                 type: string
 *     responses:
 *       200:
 *         description: Generation started
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/generate', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { branchName = 'openspec-implementation' } = req.body;
        const project = userSessions.get(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const taskId = uuidv4();

        // Create task entry
        taskManager.set(taskId, {
            id: taskId,
            projectId,
            status: {
                step: 'initializing',
                message: 'Starting code generation...',
                completed: false
            },
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // Start background processing
        setImmediate(() => {
            runCodeGeneration(taskId, project, branchName).catch(error => {
                console.error('Error in code generation:', error);
                const task = taskManager.get(taskId);
                if (task) {
                    task.status = {
                        step: 'error',
                        message: error.message,
                        completed: true,
                        error: true
                    };
                    task.updatedAt = new Date();
                }
            });
        });

        res.json({
            success: true,
            taskId,
            message: 'Code generation started'
        });
    } catch (error) {
        console.error('Error starting code generation:', error);
        res.status(500).json({ error: 'Failed to start code generation' });
    }
});

/**
 * Run code generation process
 */
async function runCodeGeneration(taskId, project, branchName) {
    const task = taskManager.get(taskId);

    try {
        // Step 1: Create branch
        task.status = { step: 'creating_branch', message: 'Creating feature branch...', completed: false };
        task.updatedAt = new Date();

        try {
            await githubClient.createBranch(project.owner, project.repository, branchName, 'main');
        } catch (error) {
            console.log('Branch may already exist, continuing...', error.message);
        }

        // Step 2: Generate code based on specs
        task.status = { step: 'generating_code', message: 'Generating code from specifications...', completed: false };
        task.updatedAt = new Date();

        // Collect all specs to generate implementation
        const specsContent = project.specTree
            .map(spec => `## ${spec.name}\n${spec.content || ''}`)
            .join('\n\n');

        // For now, create a basic implementation file
        const implementationContent = `# OpenSpec Implementation

Generated from project: ${project.projectName}

## Specifications

${specsContent}

## Implementation Notes

This file was generated by the OpenSpec Workflow tool.
`;

        // Step 3: Push to repository
        task.status = { step: 'pushing_changes', message: 'Pushing changes to repository...', completed: false };
        task.updatedAt = new Date();

        await githubClient.pushChanges(
            project.owner,
            project.repository,
            `OpenSpec implementation: ${project.projectName}`,
            [
                {
                    path: 'docs/openspec-implementation.md',
                    content: implementationContent
                }
            ],
            branchName,
            'main'
        );

        // Complete
        task.status = {
            step: 'completed',
            message: 'Code generation completed successfully',
            completed: true
        };
        task.updatedAt = new Date();

    } catch (error) {
        task.status = {
            step: 'error',
            message: error.message,
            completed: true,
            error: true
        };
        task.updatedAt = new Date();
        throw error;
    }
}

/**
 * @swagger
 * /api/openspec/tasks/{taskId}/status:
 *   get:
 *     summary: Get task status
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task status
 *       404:
 *         description: Task not found
 */
router.get('/tasks/:taskId/status', async (req, res) => {
    try {
        const { taskId } = req.params;
        const task = taskManager.get(taskId);

        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }

        res.json({
            success: true,
            task
        });
    } catch (error) {
        console.error('Error getting task status:', error);
        res.status(500).json({ error: 'Failed to get task status' });
    }
});

// ============================================
// Pull Request Routes
// ============================================

/**
 * @swagger
 * /api/openspec/projects/{projectId}/pull-request:
 *   post:
 *     summary: Create a pull request
 *     tags: [OpenSpec Workflow]
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               sourceBranch:
 *                 type: string
 *               targetBranch:
 *                 type: string
 *     responses:
 *       200:
 *         description: Pull request created
 *       404:
 *         description: Project not found
 */
router.post('/projects/:projectId/pull-request', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { title, description, sourceBranch, targetBranch = 'main' } = req.body;
        const project = userSessions.get(projectId);

        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }

        const pullRequest = await githubClient.createPullRequest(
            project.owner,
            project.repository,
            title,
            description,
            sourceBranch,
            targetBranch
        );

        res.json({
            success: true,
            pullRequest
        });
    } catch (error) {
        console.error('Error creating pull request:', error);
        res.status(500).json({ error: 'Failed to create pull request' });
    }
});

module.exports = router;
