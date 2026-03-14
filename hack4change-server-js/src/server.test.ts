import request from 'supertest';
import { app } from './server.js';
import { describe, expect, it } from 'vitest';

describe('Server API', () => {
    it('responds with a welcome message', async () => {
        const res = await request(app).get('/hello');
        expect(res.statusCode).toBe(200);
        expect(res.text).toBe('Welcome to the Hack4Change Web Server.');
    });
});
