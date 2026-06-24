const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  version: {
    type: Number,
    required: true,
    default: 1
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Compound index on createdAt and _id for cursor-based pagination
productSchema.index({ createdAt: -1, _id: -1 });
productSchema.index({ category: 1, createdAt: -1, _id: -1 }); // Category specific page sorting

module.exports = mongoose.model('Product', productSchema);
