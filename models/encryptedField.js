const mongoose = require("mongoose");

const encryptedFieldSchema = new mongoose.Schema(
  {
    iv: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    tag: {
      type: String,
      required: true,
    },
  },
  { _id: false },
);

module.exports = encryptedFieldSchema;