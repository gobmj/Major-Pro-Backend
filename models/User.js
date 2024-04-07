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
    count: { type: Number, default: 0 }
});

const UserSchema = new Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: Number,
        required: true,
        unique: true,
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isAdmin:{
        default:false,
        type:Boolean
    },
    address: {
        type: String
    },
    zipCode: {
        type: String
    },
    city: {
        type: String
    },
    userState: {
        type: String
    },
    longitude:{
        type:Number,
        default:0
    },
    latitude:{
        type:Number,
        default:0
    },
    products: [{type: Object}] 

}, { timestamps: true });
module.exports = mongoose.model('user', UserSchema)