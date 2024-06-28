const mongoose = require("mongoose");

const userCommentSchema = new mongoose.Schema({
  comment: {
    type: String,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  isrc: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ["enabled", "disabled"],
    default: "enabled",
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

userCommentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

const userComment = mongoose.model("usercomment", userCommentSchema);
module.exports = userComment;
