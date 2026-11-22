/**
 * Contact form: the submission is stored and the admin is emailed, with
 * submitted values escaped and Reply-To set to the sender. A mail failure
 * must not lose the submission.
 */
jest.mock('../config/database', () => ({
    query: jest.fn(async () => ({ rows: [] })),
    pool: { query: jest.fn(async () => ({ rows: [] })) },
    testConnection: jest.fn(),
    withTransaction: jest.fn()
}));
jest.mock('../models/ContactSubmission', () => ({
    create: jest.fn(async (data) => ({ ...data, uuid: 'sub-1' })),
}));
jest.mock('../services/emailService', () => ({ send: jest.fn(async () => ({ messageId: 'x' })) }));

process.env.ADMIN_EMAIL = 'owner@example.com';

const request = require('supertest');
const app = require('../app');
const ContactSubmission = require('../models/ContactSubmission');
const emailService = require('../services/emailService');

const valid = {
    name: 'Ada <script>alert(1)</script>',
    email: 'ada@example.com',
    subject: 'Listing correction',
    message: 'Please update the <b>address</b> for our school.',
    submission_type: 'report_error',
};

beforeEach(() => jest.clearAllMocks());

test('stores the submission and emails the admin with escaped content', async () => {
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    expect(ContactSubmission.create).toHaveBeenCalled();
    expect(emailService.send).toHaveBeenCalledTimes(1);
    const mail = emailService.send.mock.calls[0][0];
    expect(mail.to).toBe('owner@example.com');
    expect(mail.replyTo).toBe('ada@example.com');
    expect(mail.subject).toContain('Error Report');
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('&lt;b&gt;address&lt;/b&gt;');
});

test('a mail failure does not lose the submission', async () => {
    emailService.send.mockRejectedValueOnce(new Error('smtp down'));
    const res = await request(app).post('/api/contact').send(valid);
    expect(res.status).toBe(201);
    expect(ContactSubmission.create).toHaveBeenCalled();
});

test('invalid submissions are rejected and not emailed', async () => {
    const res = await request(app).post('/api/contact').send({ ...valid, email: 'not-an-email' });
    expect(res.status).toBe(422);
    expect(emailService.send).not.toHaveBeenCalled();
});
