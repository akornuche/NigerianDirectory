/**
 * Utility Functions Tests
 * Tests for logger, pagination, response helpers, slugify
 */

describe('Utilities', () => {
    describe('Pagination', () => {
        const { parsePagination, buildPaginationMeta } = require('../utils/pagination');

        test('should parse pagination parameters correctly', () => {
            const result = parsePagination({ page: '2', limit: '10' });
            
            expect(result.page).toBe(2);
            expect(result.limit).toBe(10);
            expect(result.offset).toBe(10); // (2-1)*10
        });

        test('should apply pagination defaults', () => {
            const result = parsePagination({});
            
            expect(result.page).toBe(1); // Default page
            expect(result.limit).toBe(20); // Default limit
            expect(result.offset).toBe(0);
        });

        test('should enforce maximum limit', () => {
            const result = parsePagination({ limit: '1000' });
            
            expect(result.limit).toBeLessThanOrEqual(100); // Max limit
            expect(result.limit).toBe(100);
        });

        test('should clamp page to minimum 1', () => {
            const result = parsePagination({ page: '-5' });
            
            expect(result.page).toBe(1);
        });

        test('should build pagination metadata', () => {
            const meta = buildPaginationMeta(250, 2, 10);
            
            expect(meta.page).toBe(2);
            expect(meta.limit).toBe(10);
            expect(meta.totalCount).toBe(250);
            expect(meta.totalPages).toBe(25);
            expect(meta.hasMore).toBe(true);
            expect(meta.hasPrevious).toBe(true);
        });

        test('should indicate last page correctly', () => {
            const meta = buildPaginationMeta(100, 10, 10);
            
            expect(meta.hasMore).toBe(false);
            expect(meta.hasPrevious).toBe(true);
        });

        test('should indicate first page correctly', () => {
            const meta = buildPaginationMeta(100, 1, 10);
            
            expect(meta.hasMore).toBe(true);
            expect(meta.hasPrevious).toBe(false);
        });
    });

    describe('Slugify', () => {
        const { generateSlug, generateSchoolSlug, generateLocationSlug } = require('../utils/slugify');

        test('should create URL-safe slugs from school names', () => {
            const slug = generateSlug('Saint Mary\'s Secondary School');
            
            expect(slug).toMatch(/^[a-z0-9-]+$/);
            expect(slug).not.toContain(' ');
            expect(slug).not.toContain("'");
        });

        test('should handle special characters', () => {
            const slug = generateSlug('School & Academy (Test)');
            
            expect(slug).toMatch(/^[a-z0-9-]+$/);
        });

        test('should handle uppercase to lowercase conversion', () => {
            const slug = generateSlug('FEDERAL SCHOOL OF SCIENCE');
            
            expect(slug).toBe(generateSlug('federal school of science'));
            expect(slug.toLowerCase()).toBe(slug);
        });

        test('should generate school slug', () => {
            const slug = generateSchoolSlug('Eko Secondary School', 'Lagos', 'VI');
            
            expect(slug).toMatch(/^[a-z0-9-]+$/);
            expect(slug).toContain('eko');
        });

        test('should generate location slug', () => {
            const slug = generateLocationSlug('Lagos', 'Ikeja', 'GRA');
            
            expect(slug).toMatch(/^[a-z0-9-]+$/);
        });
    });

    describe('Logger', () => {
        const { Logger, generateRequestId, redactSensitiveData } = require('../utils/logger');

        test('should create logger instance', () => {
            const logger = new Logger();
            
            expect(logger).toHaveProperty('info');
            expect(logger).toHaveProperty('error');
            expect(logger).toHaveProperty('warn');
            expect(logger).toHaveProperty('debug');
        });

        test('should generate unique request IDs', () => {
            const id1 = generateRequestId();
            const id2 = generateRequestId();
            
            expect(id1).toBeDefined();
            expect(id2).toBeDefined();
            expect(id1).not.toBe(id2);
            expect(id1.length).toBeGreaterThan(0);
        });

        test('should redact sensitive data', () => {
            const data = {
                email: 'user@example.com',
                password: 'secret123',
                token: 'jwt.token.here',
                data: { name: 'Test' }
            };

            const redacted = redactSensitiveData(data);
            
            // Sensitive fields should be masked
            expect(redacted.password).not.toBe('secret123');
            expect(redacted.token).not.toBe('jwt.token.here');
            // Non-sensitive fields should remain
            expect(redacted.data.name).toBe('Test');
        });

        test('should log without throwing', () => {
            const logger = new Logger();
            
            expect(() => {
                logger.info('Test info');
                logger.error('Test error');
                logger.warn('Test warning');
                logger.debug('Test debug');
            }).not.toThrow();
        });

        test('should accept context in constructor', () => {
            const context = { userId: '123', requestId: 'abc' };
            const logger = new Logger(context);
            
            expect(() => {
                logger.info('Test with context');
            }).not.toThrow();
        });
    });

    describe('Response Helpers - Unit Tests', () => {
        test('should export response helper functions', () => {
            const response = require('../utils/response');
            
            expect(response).toHaveProperty('success');
            expect(response).toHaveProperty('created');
            expect(response).toHaveProperty('error');
            expect(response).toHaveProperty('notFound');
            expect(response).toHaveProperty('badRequest');
            expect(response).toHaveProperty('unauthorized');
            expect(response).toHaveProperty('forbidden');
            expect(response).toHaveProperty('paginated');
        });

        test('should have all expected response types as functions', () => {
            const response = require('../utils/response');
            
            expect(typeof response.success).toBe('function');
            expect(typeof response.error).toBe('function');
            expect(typeof response.created).toBe('function');
        });
    });
});

describe('urlSegment', () => {
    const { urlSegment } = require('../utils/slugify');

    test('turns separators into single hyphens so a name cannot add a path segment', () => {
        expect(urlSegment('Ado-Odo/Ota')).toBe('ado-odo-ota');
        expect(urlSegment('Akwa Ibom')).toBe('akwa-ibom');
        expect(urlSegment('  Port   Harcourt ')).toBe('port-harcourt');
        expect(urlSegment("St. Gregory's")).toBe('st-gregory-s');
    });

    test('handles missing values', () => {
        expect(urlSegment(null)).toBe('');
        expect(urlSegment(undefined)).toBe('');
    });
});
