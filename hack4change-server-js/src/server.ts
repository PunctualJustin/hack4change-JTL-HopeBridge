import express from 'express';

export const app = express();

app.get('/hello', (_, res) => {
    res.send('Welcome to the Hack4Change Web Server.');
});
