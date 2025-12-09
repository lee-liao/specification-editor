/**
 * GitHub API Client
 * 
 * This client proxies GitHub operations to an external code-generation-platform
 * instance instead of directly using a GitHub App.
 */

const axios = require('axios');

class GitHubApiClient {
    constructor() {
        this.baseUrl = process.env.GITHUB_API_ENDPOINT || 'http://103.98.213.149:8510';
    }

    /**
     * Create a new GitHub repository
     */
    async createRepository(owner, name, description, isPrivate = false) {
        try {
            const response = await axios.post(`${this.baseUrl}/create-repo`, {
                owner,
                name,
                description,
                isPrivate
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create repository: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Create a new branch
     */
    async createBranch(owner, repo, branchName, sourceBranch = 'main') {
        try {
            const response = await axios.post(`${this.baseUrl}/create-branch`, {
                owner,
                repo,
                branchName,
                sourceBranch
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create branch: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Push changes to a repository
     */
    async pushChanges(owner, repo, commitMessage, files, branch = 'main', parentBranch = 'main') {
        try {
            const response = await axios.post(`${this.baseUrl}/push-changes`, {
                owner,
                repo,
                commitMessage,
                files,
                branch,
                parentBranch
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to push changes: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Create a pull request
     */
    async createPullRequest(owner, repo, title, body, head, base = 'main') {
        try {
            const response = await axios.post(`${this.baseUrl}/create-pull-request`, {
                owner,
                repo,
                title,
                body,
                head,
                base
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to create pull request: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Get repository information
     */
    async getRepository(owner, repo) {
        try {
            const response = await axios.get(`${this.baseUrl}/repository`, {
                params: { owner, repo }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get repository: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Get repository contents
     */
    async getContents(owner, repo, path = '', ref = 'main') {
        try {
            const response = await axios.get(`${this.baseUrl}/contents`, {
                params: { owner, repo, path, ref }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get contents: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Download repository as zip buffer
     */
    async downloadRepository(owner, repo, ref = 'main') {
        try {
            const response = await axios.get(`${this.baseUrl}/download-repo`, {
                params: { owner, repo, ref },
                responseType: 'arraybuffer'
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to download repository: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Get branches
     */
    async getBranches(owner, repo) {
        try {
            const response = await axios.get(`${this.baseUrl}/branches`, {
                params: { owner, repo }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to get branches: ${error.response?.data?.error || error.message}`);
        }
    }

    /**
     * Check installation status
     */
    async checkInstallationStatus(owner) {
        try {
            const response = await axios.get(`${this.baseUrl}/user-installation-status`, {
                params: { owner }
            });
            return response.data;
        } catch (error) {
            throw new Error(`Failed to check installation status: ${error.response?.data?.error || error.message}`);
        }
    }
}

module.exports = { GitHubApiClient };
