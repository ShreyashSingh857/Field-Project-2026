export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'GramWasteConnect Backend API',
    version: '1.0.0',
    description: 'Core REST API for admin, worker, user, tasks, reports, marketplace, and notifications.',
  },
  servers: [
    { url: 'http://localhost:5000', description: 'Local' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      adminCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'admin_token',
      },
      workerCookie: {
        type: 'apiKey',
        in: 'cookie',
        name: 'worker_token',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          200: {
            description: 'Service is healthy',
          },
        },
      },
    },
    '/api/admin/login': {
      post: {
        summary: 'Admin login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Admin session established' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/workers/login': {
      post: {
        summary: 'Worker login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['employee_id', 'password'],
                properties: {
                  employee_id: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          200: { description: 'Worker session established' },
          401: { description: 'Invalid credentials' },
        },
      },
    },
    '/api/notifications': {
      get: {
        summary: 'List notifications for current actor',
        security: [{ bearerAuth: [] }, { adminCookie: [] }, { workerCookie: [] }],
        responses: {
          200: { description: 'Notification list' },
          401: { description: 'Unauthorized' },
        },
      },
    },
  },
};
