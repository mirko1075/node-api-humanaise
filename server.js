const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const apiKeyAuth = require("./middleware/apiKeyAuth");
const rateLimiter = require("./middleware/rateLimiter");
const audioRoutes = require("./routes/audio");

const app = express();

// Enable trust proxy
app.set("trust proxy", 1);

// Security Features
app.use(apiKeyAuth);
app.use(rateLimiter);

app.use(cors({ origin: ["https://www.make.com"], methods: ["POST", "GET"] }));
app.use(morgan("combined"));

// File Splitting Endpoint
app.use("/v1/audio", audioRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));