const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const compression = require("compression");
const { dummyApiFun } = require("./src/templates/dummyTemplate");
const { connectDB } = require("./src/config/connection");
require("dotenv").config();
const indexRoute = require("./src/routes/indexRoute");
const { winstonLogMiddleware } = require("./src/middlewares/loggerMiddleware");

let PORT = process.env.APP_PORT || 3007;
// const limiter = rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: "Too many requests from this IP, please try again after 15 minutes",
// });
// app.use(limiter);
app.use(compression());

app.use(express.static("uploads"));
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

connectDB().catch(console.dir);

app.use(winstonLogMiddleware);

app.use("/api/v1", indexRoute);

app.get("/api/demo", (req, res) => {
  const result = dummyApiFun();
  res.send(result);
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
