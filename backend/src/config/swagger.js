/**
 * Swagger/OpenAPI Configuration for NigerianDirectory API
 * Defines the API specification for all endpoints
 */

const swaggerDefinition = {
    openapi: '3.0.0',
    info: {
        title: 'NigerianDirectory API',
        version: '1.0.0',
        description: 'RESTful API for NigerianDirectory.com - Schools and institutions directory platform for Nigeria',
        contact: {
            name: 'NigerianDirectory Team',
            url: 'https://nigeriandirectory.com',
            email: 'support@nigeriandirectory.com'
        },
        license: {
            name: 'UNLICENSED'
        }
    },
    servers: [
        {
            url: 'http://localhost:5000',
            description: 'Local development server'
        },
        {
            url: 'https://api.nigeriandirectory.com',
            description: 'Production server'
        }
    ],
    tags: [
        {
            name: 'Health',
            description: 'System health and status endpoints'
        },
        {
            name: 'Authentication',
            description: 'User registration, login, and token management'
        },
        {
            name: 'Schools',
            description: 'School listings and search operations'
        },
        {
            name: 'Locations',
            description: 'Geographic location data and filtering'
        },
        {
            name: 'Claims',
            description: 'School claims and ownership verification'
        },
        {
            name: 'Admin',
            description: 'Administrative operations (admin role required)'
        },
        {
            name: 'Views',
            description: 'Page view tracking and analytics'
        },
        {
            name: 'Crawler',
            description: 'Web crawler administration (admin role required)'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description: 'JWT access token for authentication'
            },
            csrfToken: {
                type: 'apiKey',
                in: 'header',
                name: 'X-CSRF-Token',
                description: 'CSRF token for state-changing operations'
            }
        },
        schemas: {
            // ============================================
            // RESPONSE SCHEMAS
            // ============================================
            Error: {
                type: 'object',
                required: ['error'],
                properties: {
                    error: {
                        type: 'string',
                        description: 'Error message'
                    },
                    details: {
                        type: 'string',
                        description: 'Additional error details'
                    },
                    code: {
                        type: 'string',
                        description: 'Error code for client handling'
                    }
                }
            },
            PaginationMeta: {
                type: 'object',
                properties: {
                    page: {
                        type: 'integer',
                        example: 1
                    },
                    pageSize: {
                        type: 'integer',
                        example: 20
                    },
                    total: {
                        type: 'integer',
                        example: 250
                    },
                    totalPages: {
                        type: 'integer',
                        example: 13
                    },
                    hasNextPage: {
                        type: 'boolean',
                        example: true
                    }
                }
            },
            // ============================================
            // USER SCHEMAS
            // ============================================
            User: {
                type: 'object',
                properties: {
                    id: {
                        type: 'integer',
                        example: 1
                    },
                    uuid: {
                        type: 'string',
                        format: 'uuid',
                        example: '550e8400-e29b-41d4-a716-446655440000'
                    },
                    name: {
                        type: 'string',
                        example: 'John Doe'
                    },
                    email: {
                        type: 'string',
                        format: 'email',
                        example: 'john@example.com'
                    },
                    role: {
                        type: 'string',
                        enum: ['user', 'admin'],
                        example: 'user'
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            AuthResponse: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        example: 'Login successful'
                    },
                    user: {
                        $ref: '#/components/schemas/User'
                    },
                    accessToken: {
                        type: 'string',
                        description: 'JWT access token (15 minutes expiry)'
                    },
                    refreshToken: {
                        type: 'string',
                        description: 'JWT refresh token (7 days expiry)'
                    }
                }
            },
            // ============================================
            // SCHOOL SCHEMAS
            // ============================================
            School: {
                type: 'object',
                properties: {
                    id: {
                        type: 'integer',
                        example: 1
                    },
                    uuid: {
                        type: 'string',
                        format: 'uuid'
                    },
                    name: {
                        type: 'string',
                        example: 'Lagos International School'
                    },
                    slug: {
                        type: 'string',
                        example: 'lagos-international-school'
                    },
                    description: {
                        type: 'string',
                        example: 'Premier international school in Lagos'
                    },
                    address: {
                        type: 'string',
                        example: '123 Main Street, Lagos'
                    },
                    latitude: {
                        type: 'number',
                        format: 'float',
                        example: 6.5244
                    },
                    longitude: {
                        type: 'number',
                        format: 'float',
                        example: 3.3792
                    },
                    category: {
                        type: 'string',
                        enum: ['primary', 'secondary', 'tertiary', 'mixed'],
                        example: 'secondary'
                    },
                    phone: {
                        type: 'string',
                        example: '+234801234567'
                    },
                    email: {
                        type: 'string',
                        format: 'email'
                    },
                    website: {
                        type: 'string',
                        format: 'uri'
                    },
                    established_year: {
                        type: 'integer',
                        example: 2005
                    },
                    principal_name: {
                        type: 'string'
                    },
                    student_count: {
                        type: 'integer'
                    },
                    teacher_count: {
                        type: 'integer'
                    },
                    curriculum: {
                        type: 'string',
                        example: 'British Curriculum'
                    },
                    verified: {
                        type: 'boolean',
                        example: true
                    },
                    claimed: {
                        type: 'boolean',
                        example: false
                    },
                    claimed_by: {
                        type: 'integer',
                        nullable: true
                    },
                    location_id: {
                        type: 'integer'
                    },
                    location: {
                        $ref: '#/components/schemas/Location'
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updated_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            // ============================================
            // LOCATION SCHEMAS
            // ============================================
            Location: {
                type: 'object',
                properties: {
                    id: {
                        type: 'integer',
                        example: 1
                    },
                    uuid: {
                        type: 'string',
                        format: 'uuid'
                    },
                    name: {
                        type: 'string',
                        example: 'Lagos'
                    },
                    slug: {
                        type: 'string',
                        example: 'lagos'
                    },
                    code: {
                        type: 'string',
                        example: 'LG'
                    },
                    latitude: {
                        type: 'number',
                        format: 'float'
                    },
                    longitude: {
                        type: 'number',
                        format: 'float'
                    },
                    type: {
                        type: 'string',
                        enum: ['state', 'lga', 'area'],
                        example: 'state'
                    },
                    parent_id: {
                        type: 'integer',
                        nullable: true
                    },
                    school_count: {
                        type: 'integer',
                        example: 45
                    }
                }
            },
            // ============================================
            // CLAIM SCHEMAS
            // ============================================
            Claim: {
                type: 'object',
                properties: {
                    id: {
                        type: 'integer',
                        example: 1
                    },
                    uuid: {
                        type: 'string',
                        format: 'uuid'
                    },
                    school_id: {
                        type: 'integer'
                    },
                    user_id: {
                        type: 'integer'
                    },
                    status: {
                        type: 'string',
                        enum: ['pending', 'verified', 'rejected'],
                        example: 'pending'
                    },
                    verification_details: {
                        type: 'object',
                        description: 'Details about the claim verification'
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updated_at: {
                        type: 'string',
                        format: 'date-time'
                    }
                }
            },
            // ============================================
            // PAGINATION SCHEMAS
            // ============================================
            SchoolsListResponse: {
                type: 'object',
                properties: {
                    data: {
                        type: 'array',
                        items: {
                            $ref: '#/components/schemas/School'
                        }
                    },
                    pagination: {
                        $ref: '#/components/schemas/PaginationMeta'
                    }
                }
            }
        },
        responses: {
            // ============================================
            // ERROR RESPONSES
            // ============================================
            BadRequest: {
                description: 'Bad request - validation failed',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        }
                    }
                }
            },
            Unauthorized: {
                description: 'Unauthorized - authentication required',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Unauthorized'
                                }
                            }
                        }
                    }
                }
            },
            Forbidden: {
                description: 'Forbidden - insufficient permissions',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Access denied'
                                }
                            }
                        }
                    }
                }
            },
            NotFound: {
                description: 'Resource not found',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        }
                    }
                }
            },
            Conflict: {
                description: 'Conflict - resource already exists',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        }
                    }
                }
            },
            TooManyRequests: {
                description: 'Too many requests - rate limited',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                error: {
                                    type: 'string',
                                    example: 'Too many requests'
                                }
                            }
                        }
                    }
                }
            },
            ServerError: {
                description: 'Internal server error',
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/Error'
                        }
                    }
                }
            }
        }
    },
    security: [
        {
            bearerAuth: []
        }
    ]
};

module.exports = swaggerDefinition;
