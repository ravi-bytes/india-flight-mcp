const express = require('express');
const tools = require('./tools');

const app = express();
app.use(express.json());

// MCP Protocol Implementation
app.post('/mcp/invoke', async (req, res) => {
    try {
        const { tool, parameters } = req.body;
        
        // Validate request
        if (!tool || !tools[tool]) {
            return res.status(400).json({
                error: `Invalid tool: ${tool}`,
                available_tools: Object.keys(tools)
            });
        }

        // Execute tool
        const result = await tools[tool].handler(parameters);
        res.json(result);

    } catch (error) {
        console.error('Error processing MCP request:', error);
        res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

// MCP Tool Discovery Endpoint
app.get('/mcp/discover', (req, res) => {
    const toolDefinitions = {};
    
    for (const [name, tool] of Object.entries(tools)) {
        toolDefinitions[name] = {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters
        };
    }
    
    res.json({
        name: 'India Flight Search MCP',
        version: '1.0.0',
        description: 'MCP server for searching flights across multiple Indian travel websites',
        tools: toolDefinitions
    });
});

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'ok', message: 'India Flight Search MCP Server is running' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`MCP Server running on port ${port}`);
    console.log('Available endpoints:');
    console.log('  GET  /mcp/discover - Get available tools');
    console.log('  POST /mcp/invoke   - Invoke a tool');
    console.log('  GET  /            - Health check');
});
