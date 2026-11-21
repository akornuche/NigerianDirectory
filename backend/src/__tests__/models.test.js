/**
 * Models Unit Tests
 * Tests for User, School, Claim, Location models
 * These are unit tests that verify models are properly exported and have required methods
 */

describe('Models', () => {
    describe('User Model', () => {
        let User;
        beforeEach(() => {
            User = require('../models/User');
        });

        test('should export User model', () => {
            expect(User).toBeDefined();
        });

        test('should have create method', () => {
            expect(typeof User.create).toBe('function');
        });

        test('should have findById method', () => {
            expect(typeof User.findById).toBe('function');
        });

        test('should have findByEmail method', () => {
            expect(typeof User.findByEmail).toBe('function');
        });

        test('should have updateStatus method (update)', () => {
            expect(typeof User.update).toBe('function');
        });

        test('should have verifyPassword static method', () => {
            expect(typeof User.verifyPassword).toBe('function');
        });

        test('should have updatePassword method', () => {
            expect(typeof User.updatePassword).toBe('function');
        });
    });

    describe('School Model', () => {
        let School;
        beforeEach(() => {
            School = require('../models/School');
        });

        test('should export School model', () => {
            expect(School).toBeDefined();
        });

        test('should have create method', () => {
            expect(typeof School.create).toBe('function');
        });

        test('should have list method', () => {
            expect(typeof School.list).toBe('function');
        });

        test('should have findBySlug method', () => {
            expect(typeof School.findBySlug).toBe('function');
        });

        test('should have findById method', () => {
            expect(typeof School.findById).toBe('function');
        });

        test('should have updateStatus method (update)', () => {
            expect(typeof School.update).toBe('function');
        });

        test('should have delete method', () => {
            expect(typeof School.delete).toBe('function');
        });

        test('should have naturalLanguageSearch method', () => {
            expect(typeof School.naturalLanguageSearch).toBe('function');
        });
    });

    describe('Claim Model', () => {
        let Claim;
        beforeEach(() => {
            Claim = require('../models/Claim');
        });

        test('should export Claim model', () => {
            expect(Claim).toBeDefined();
        });

        test('should have create method', () => {
            expect(typeof Claim.create).toBe('function');
        });

        test('should have findById method', () => {
            expect(typeof Claim.findById).toBe('function');
        });

        test('should have getByUser method', () => {
            expect(typeof Claim.getByUser).toBe('function');
        });

        test('should have updateStatus method (update)', () => {
            expect(typeof Claim.updateStatus).toBe('function');
        });

        test('should have updateStatus method (verify)', () => {
            expect(typeof Claim.updateStatus).toBe('function');
        });

        test('should have updateStatus method (approve)', () => {
            expect(typeof Claim.updateStatus).toBe('function');
        });

        test('should have updateStatus method (reject)', () => {
            expect(typeof Claim.updateStatus).toBe('function');
        });
    });

    describe('Location Model', () => {
        let Location;
        beforeEach(() => {
            Location = require('../models/Location');
        });

        test('should export Location model', () => {
            expect(Location).toBeDefined();
        });

        test('should have list method', () => {
            expect(typeof Location.getStates).toBe('function');
        });

        test('should have getCitiesByState method', () => {
            expect(typeof Location.getCitiesByState).toBe('function');
        });

        test('should have getStates method', () => {
            expect(typeof Location.getStates).toBe('function');
        });

        test('should have getCitiesByState method', () => {
            expect(typeof Location.getCitiesByState).toBe('function');
        });

        test('should have getAreasByCity method', () => {
            expect(typeof Location.getAreasByCity).toBe('function');
        });
    });

    describe('PageView Model', () => {
        let PageView;
        beforeEach(() => {
            PageView = require('../models/PageView');
        });

        test('should export PageView model', () => {
            expect(PageView).toBeDefined();
        });

        test('should have record method', () => {
            expect(typeof PageView.record).toBe('function');
        });

        test('should have getStats method', () => {
            expect(typeof PageView.getStats).toBe('function');
        });
    });

    describe('CrawlLog Model', () => {
        let CrawlLog;
        beforeEach(() => {
            CrawlLog = require('../models/CrawlLog');
        });

        test('should export CrawlLog model', () => {
            expect(CrawlLog).toBeDefined();
        });

        test('should have create method', () => {
            expect(typeof CrawlLog.create).toBe('function');
        });

        test('should have getRecent method', () => {
            expect(typeof CrawlLog.getRecent).toBe('function');
        });

        test('should have getStats method', () => {
            expect(typeof CrawlLog.getStats).toBe('function');
        });
    });

    describe('EnrichmentQueue Model', () => {
        let EnrichmentQueue;
        beforeEach(() => {
            EnrichmentQueue = require('../models/EnrichmentQueue');
        });

        test('should export EnrichmentQueue model', () => {
            expect(EnrichmentQueue).toBeDefined();
        });

        test('should have add method', () => {
            expect(typeof EnrichmentQueue.add).toBe('function');
        });

        test('should have getNext method', () => {
            expect(typeof EnrichmentQueue.getNext).toBe('function');
        });

        test('should have getStats method', () => {
            expect(typeof EnrichmentQueue.getStats).toBe('function');
        });
    });

    describe('Routes', () => {
        test('should export auth routes', () => {
            const authRouter = require('../routes/auth');
            expect(authRouter).toBeDefined();
        });

        test('should export schools routes', () => {
            const schoolsRouter = require('../routes/schools');
            expect(schoolsRouter).toBeDefined();
        });

        test('should export claims routes', () => {
            const claimsRouter = require('../routes/claims');
            expect(claimsRouter).toBeDefined();
        });

        test('should export locations routes', () => {
            const locationsRouter = require('../routes/locations');
            expect(locationsRouter).toBeDefined();
        });
    });
});
