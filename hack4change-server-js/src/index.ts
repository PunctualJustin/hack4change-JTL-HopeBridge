import { app } from './server.js';
const port = 8080;

app.listen(port, () => {
    console.log(`Hack4Change Web Server listening on port ${port}`);
});
