const express = require('express');
const http = require('http');
const app = express();
const server = http.createServer(app);
const cors = require('cors');
const helmet = require('helmet');
const { dummyApiFun } = require('./src/templates/dummyTemplate');
const { connectDB } = require('./src/config/connection');
require('dotenv').config();
const indexRoute = require('./src/routes/indexRoute')

let PORT = process.env.APP_PORT || 3007

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({
    extended: true,
}))

connectDB().catch(console.dir);

app.use('/api/v1', indexRoute)

app.get('/api/demo', (req, res) => {
    const result = dummyApiFun()
    res.send(result);
});


server.listen((PORT), () => {
    console.log(`Server is running on port ${PORT}`);
})