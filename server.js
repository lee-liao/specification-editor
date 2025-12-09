require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Import routes
const openspecWorkflowRouter = require('./routes/openspec-workflow');

const app = express();
const port = process.env.PORT || 3001;

// Parse JSON bodies
app.use(express.json({ limit: '50mb' }));

// Add file upload middleware
app.use(fileUpload({
    useTempFiles: true,
    tempFileDir: './temp/',
    createParentPath: true,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB max file size
    },
    abortOnLimit: true
}));

// Swagger options
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'OpenSpec Workflow API',
            version: '1.0.0',
            description: 'API for managing OpenSpec files, generating AI suggestions, and triggering code generation',
        },
        servers: [
            {
                url: '/',
                description: 'Current server',
            },
        ],
    },
    apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);

// Serve Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Serve static files (public directory)
app.use(express.static('public'));

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        message: 'OpenSpec Workflow API is running!',
        githubApiEndpoint: process.env.GITHUB_API_ENDPOINT || 'Not configured'
    });
});

// Mount OpenSpec workflow routes
app.use('/api/openspec', openspecWorkflowRouter);

// Fallback to serve index.html for root path
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(port, () => {
    console.log(`\n🚀 OpenSpec Workflow server running at http://localhost:${port}`);
    console.log(`📚 Swagger UI available at http://localhost:${port}/api-docs`);
    console.log(`🔗 GitHub API endpoint: ${process.env.GITHUB_API_ENDPOINT || 'Not configured'}\n`);
});

module.exports = app;
