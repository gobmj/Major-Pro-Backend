const jwt = require("jsonwebtoken");
const dotenv = require('dotenv');
const User = require("../models/User");
const Cart = require("../models/Cart");
const Wishlist = require("../models/Wishlist");
const Review = require("../models/Review");
const Payment = require("../models/Payment")
const Product = require("../models/Product")
dotenv.config()

const chartData = async (req, res) => {
    try {
        // console.log("hello1")
        const cart = await Cart.find().populate("productId");
        const wishlist = await Wishlist.find().populate("productId");

        const payment = await Payment.find();
        const product = await Product.find();
        const review = await Review.find();
        // console.log(payment)
        res.send({ review, product, payment, wishlist, cart });
    } catch (error) {
        res.send(error);

    }
}
const userChartData = async (req, res) => {
    try {
        const cart = await Cart.find().populate("productId");
        const wishlist = await Wishlist.find().populate("productId");
        const token = req.header('Authorization');
        const data = jwt.verify(token, process.env.JWT_SECRET)
        req.user = data.user
        // console.log(req.user.id)
        const payment = await Payment.find({ storeId: req.user.id });
        // console.log(payment)
        // console.log("hello")
        // console.log(product);
        const user = await User.findById(req.user.id);
        const product = user.products;
        // console.log(user.products);

        const review = await Review.find();
        res.send({ review, product, payment, wishlist, cart });
    } catch (error) {
        res.send(error);
    }

}



module.exports = { chartData, userChartData }