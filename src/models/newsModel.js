const mongoose = require("mongoose");

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    required: true,
  },
  publishDate: {
    type: Date,
    required: true,
  },
  coverImg: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
});

// Middleware to update `updatedAt` before save
newsSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const News = mongoose.model("News", newsSchema);

module.exports = News;
