import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Mega Directory API',
      version: '1.0.0',
      description: 'API for managing business directory listings, categories, and directories',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
    },
    servers: [
      {
        url: process.env.API_BASE_URL || 'http://localhost:3030',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Admin JWT token obtained from /v1/admin/auth endpoint',
        },
        crawlerToken: {
          type: 'http',
          scheme: 'bearer',
          description: 'Crawler bearer token for automated ingestion',
        },
      },
      schemas: {
        Listing: {
          type: 'object',
          required: ['title', 'slug', 'status'],
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'Acme Professional Services' },
            slug: { type: 'string', example: 'acme-professional-services' },
            websiteUrl: { type: 'string', format: 'uri', example: 'https://acme.example.com', nullable: true },
            contactEmail: { type: 'string', format: 'email', nullable: true },
            contactPhone: { type: 'string', example: '+1-555-0123', nullable: true },
            summary: { type: 'string', nullable: true },
            description: { type: 'string', nullable: true },
            status: { type: 'string', enum: ['PENDING', 'APPROVED', 'REJECTED'] },
            sourceUrl: { type: 'string', nullable: true },
            sourceName: { type: 'string', nullable: true },
            tagline: { type: 'string', nullable: true },
            notes: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            addresses: {
              type: 'array',
              items: { $ref: '#/components/schemas/Address' },
            },
            categories: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: { $ref: '#/components/schemas/Category' },
                },
              },
            },
          },
        },
        Address: {
          type: 'object',
          required: ['addressLine1', 'city', 'region', 'country'],
          properties: {
            id: { type: 'integer' },
            addressLine1: { type: 'string', example: '123 Main St' },
            addressLine2: { type: 'string', nullable: true },
            city: { type: 'string', example: 'New York' },
            region: { type: 'string', example: 'NY', minLength: 2, maxLength: 3 },
            postalCode: { type: 'string', example: '10001', nullable: true },
            country: { type: 'string', minLength: 2, maxLength: 2, example: 'US' },
            latitude: { type: 'number', format: 'float', nullable: true },
            longitude: { type: 'number', format: 'float', nullable: true },
            isPrimary: { type: 'boolean', default: false },
            label: { type: 'string', nullable: true },
          },
        },
        Category: {
          type: 'object',
          required: ['name', 'slug'],
          properties: {
            id: { type: 'integer', example: 1 },
            name: { type: 'string', example: 'Professional Services' },
            slug: { type: 'string', example: 'professional-services' },
            description: { type: 'string', nullable: true },
            metaTitle: { type: 'string', nullable: true },
            metaDescription: { type: 'string', nullable: true },
            isActive: { type: 'boolean', default: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Directory: {
          type: 'object',
          required: ['title', 'slug', 'subdomain', 'subdirectory', 'categoryId'],
          properties: {
            id: { type: 'integer', example: 1 },
            title: { type: 'string', example: 'NYC Professional Services Directory' },
            slug: { type: 'string', example: 'nyc-professional-services' },
            subdomain: { type: 'string', example: 'nyc-professional' },
            subdirectory: { type: 'string', example: 'nyc/professional-services' },
            categoryId: { type: 'integer', example: 1 },
            locationId: { type: 'string', nullable: true },
            locationAgnostic: { type: 'boolean', default: false },
            status: { type: 'string', enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] },
            heroTitle: { type: 'string', nullable: true },
            heroSubtitle: { type: 'string', nullable: true },
            introMarkdown: { type: 'string', nullable: true },
            metaTitle: { type: 'string', nullable: true },
            metaDescription: { type: 'string', nullable: true },
            metaKeywords: { type: 'string', nullable: true },
            ogImageUrl: { type: 'string', format: 'uri', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string', example: 'Validation failed' },
            code: { type: 'string', example: 'VALIDATION_ERROR' },
            details: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  field: { type: 'string', example: 'title' },
                  message: { type: 'string', example: 'Title is required' },
                  code: { type: 'string', example: 'invalid_type' },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Admin - Auth', description: 'Admin authentication endpoints' },
      { name: 'Admin - Listings', description: 'Admin endpoints for managing listings' },
      { name: 'Admin - Addresses', description: 'Admin endpoints for managing listing addresses' },
      { name: 'Admin - Categories', description: 'Admin endpoints for managing categories' },
      { name: 'Admin - Directories', description: 'Admin endpoints for managing directories' },
      { name: 'Public', description: 'Public endpoints for directory browsing' },
      { name: 'Crawler', description: 'Endpoints for automated listing ingestion' },
    ],
  },
  apis: ['./src/routes/**/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
