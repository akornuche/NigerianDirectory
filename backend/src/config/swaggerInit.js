/**
 * Swagger UI Initialization and Setup
 * Generates OpenAPI documentation for all API endpoints
 */

const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerDefinition = require('./swagger');

/**
 * Initialize Swagger/OpenAPI documentation
 * @param {Express.Application} app - Express application instance
 */
function initializeSwagger(app) {
    // Generate OpenAPI spec from JSDoc comments and base definition
    const specs = swaggerJsdoc({
        definition: swaggerDefinition,
        apis: [
            './src/routes/auth.js',
            './src/routes/schools.js',
            './src/routes/locations.js',
            './src/routes/claims.js',
            './src/routes/admin.js',
            './src/routes/crawl.js',
            './src/routes/views.js'
        ]
    });

    // Serve Swagger UI
    app.use(
        '/api/docs',
        swaggerUi.serve,
        swaggerUi.setup(specs, {
            swaggerOptions: {
                url: '/api/docs.json',
                // Disable "try it out" functionality in production
                tryItOutEnabled: process.env.NODE_ENV !== 'production',
                requestSnippetsEnabled: true,
                deepLinking: true,
                presets: [
                    swaggerUi.presets.apis,
                    swaggerUi.SwaggerUIBundle.SwaggerUIStandalonePreset
                ],
                layout: 'BaseLayout',
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1
            },
            customCss: `
                .swagger-ui .topbar { display: none; }
                .swagger-ui .info .title { font-size: 2em; }
                .swagger-ui .scheme-container { background: #f5f5f5; }
            `,
            customSiteTitle: 'NigerianDirectory API Documentation',
            favicon: 'https://nigeriandirectory.com/favicon.ico'
        })
    );

    // Serve OpenAPI JSON specification
    app.get('/api/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });

    // Serve ReDoc documentation (alternative UI)
    app.get('/api/redoc', (req, res) => {
        res.send(`
            <!DOCTYPE html>
            <html>
                <head>
                    <title>NigerianDirectory API - ReDoc</title>
                    <meta charset="utf-8"/>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
                    <style>
                        body {
                            margin: 0;
                            padding: 0;
                        }
                    </style>
                </head>
                <body>
                    <redoc spec-url='/api/docs.json'></redoc>
                    <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
                </body>
            </html>
        `);
    });

    console.log('✅ Swagger UI initialized');
    console.log('   📚 API Docs: /api/docs');
    console.log('   📋 OpenAPI JSON: /api/docs.json');
    console.log('   📖 ReDoc: /api/redoc');
}

module.exports = { initializeSwagger };
