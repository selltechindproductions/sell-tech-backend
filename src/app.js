const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { errorHandler, notFound } = require("./middlewares/error.middleware");

const app = express();

// --- GLOBAL MIDDLEWARES ---
app.use(helmet()); // Security headers
app.use(cors()); // Allow requests from your Flutter Web URL
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev")); // HTTP request logging

// --- API ROUTES ---
app.use("/api/v1/auth", require("./routes/auth.routes"));
app.use('/api/v1/users', require('./routes/user.routes'));
app.use("/api/v1/blogs", require("./routes/blog.routes"));
app.use("/api/v1/products", require("./routes/product.routes"));
app.use("/api/v1/contacts", require("./routes/contact.routes"));
app.use("/api/v1/notifications", require("./routes/notification.routes"));
app.use("/api/v1/analytics", require("./routes/analytics.routes"));
// --- ERROR HANDLING ---
app.use(notFound); // Handle 404s
app.use(errorHandler); // Format all errors securely

module.exports = app;
