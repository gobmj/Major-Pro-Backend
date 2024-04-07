const mongoose = require('mongoose');
const { Schema } = mongoose;
const ProductSchema = new Schema({
    name: String,
    brand: String,
    price: Number,
    category: String,
    image: String,
    rating: Number,
    type: String,
    author: String,
    description: String,
    gender: String,
    count: { type: Number, default: 0 }, // Product count
    addedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }] // Array to store user IDs
});
module.exports = mongoose.model("product", ProductSchema)