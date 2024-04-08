const Razorpay = require('razorpay');
const Product = require("../models/Product")
const crypto = require('crypto');
const Payment = require('../models/Payment');
const User = require('../models/User');
const Cart = require('../models/Cart');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config()


let productInfo = {};
let userData = {};
let userInfo;
let totalAmount;
const instance = new Razorpay({
  key_id: process.env.RAZORPAY_API_KEY,
  key_secret: process.env.RAZORPAY_API_SECRET,
});

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}
const checkout = async (req, res) => {
  try {
      const { amount, userId, productDetails, userDetails,longitude,latitude } = req.body;
      const totalAmount = Number(amount);
      const userInfo = userId;
      const productInfo = JSON.parse(productDetails);
      const userData = JSON.parse(userDetails);
      const userLatitude = parseFloat(latitude);
      const userLongitude = parseFloat(longitude);

      console.log(productInfo);
      let shopIds = [];
      let quantity = 0;
      const productDetailsPromises = productInfo.map(async (item) => {
        const productId = item.productId._id;
        const product = await Product.findById(productId);
        quantity = item.quantity;
        return { product };
      });
      const productDetail = await Promise.all(productDetailsPromises);
      // console.log(productDetail[0]);
      console.log(quantity)
      productDetail[0].product.addedBy.map((item) => {
        // console.log(item);
        shopIds.push(item);
      });

      let minDistance = Infinity;
      let closestShopId;

    for (const shopId of shopIds) {
      const shop = await User.findById(shopId);

      // Calculate distance between user and shop using Haversine formula
      const distance = calculateDistance(
        userLatitude,
        userLongitude,
        parseFloat(shop.latitude),
        parseFloat(shop.longitude)
      );

      if (distance < minDistance) {
        minDistance = distance;
        closestShopId = shopId;
      }
      
    }

    console.log(closestShopId);
    console.log(minDistance);

    const closestShop = await User.findById(closestShopId);

    for (const item of productDetail) {
      const product = closestShop.products.find((p) => p._id.toString() === item.product._id.toString());
      if (product) {
        // Reduce the quantity of the product
        product.count -= item.quantity;
        await closestShop.save();
      }
    }

      // Generate random values for razorpay_order_id, razorpay_payment_id, and razorpay_signature
      const razorpay_order_id = crypto.randomBytes(16).toString('hex');
      const razorpay_payment_id = crypto.randomBytes(16).toString('hex');
      const razorpay_signature = crypto.randomBytes(16).toString('hex');



      // Create entry in Payment collection
      await Payment.create({
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          user: userInfo,
          productData: productInfo,
          userData,
          totalAmount,
          storeId: closestShopId
      });

      // Delete cart records associated with the user ID
      await Cart.deleteMany({ user: userInfo });

      res.status(200).json({
          success: true,
          message: 'Payment entry created successfully',
          razorpay_order_id,
          razorpay_payment_id
      });
  } catch (error) {
      console.log(error);
      res.status(500).json({
          success: false,
          message: 'Internal server error'
      });
  }
};
// 

const paymentVerification = async (req, res) => {

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_API_SECRET)
    .update(body.toString())
    .digest("hex");

  const isAuthentic = expectedSignature === razorpay_signature;
  try {
    if (isAuthentic) {
      // Database comes here
      const transport = nodemailer.createTransport({
        service: "gmail",
        host: "smtp.gmail.email",
        port: 465,
        auth: {
          user: process.env.EMAIL,
          pass: process.env.EMAIL_PASSWORD
        },
      })
      const mailOptions = {
        from: process.env.EMAIL,
        to: userData.userEmail,
        subject: "Order Confirm",
        html: `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Order Confirmation</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 16px;
                line-height: 1.5;
                color: black;
              }
        
              h1 {
                font-size: 24px;
                margin-bottom: 20px;
                color: black;
              }
        
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
        
              th {
                text-align: left;
                padding: 10px;
                background-color: #eee;
              }
        
              td {
                padding: 10px;
                border: 1px solid #ddd;
              }
        
              .address {
                margin-bottom: 20px;
                color: black;

              }
        
              .address h2 {
                font-size: 20px;
                margin-bottom: 10px;
              }
        
              .address p {
                margin: 0;
              }
        
              .thanks {
                font-size: 18px;
                margin-top: 20px;
                color: black;

              }
        
              .signature {
                margin-top: 40px;
                color: black;

              }
        
              .signature p {
                margin: 0;
              }
            </style>
          </head>
          <body>
            <h1>Order Confirmation</h1>
            <p style="color:black;">Dear <b>${userData.firstName} ${userData.lastName}</b>,</p>
            <p>Thank you for your recent purchase on our website. We have received your payment of <b>₹${totalAmount}</b> and have processed your order.</p>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${productInfo.map((product) => {
          return `
                            <tr>
                              <td>${product.productId.name}</td>
                              <td>${product.quantity}</td>
                              <td>₹${product.productId.price}</td>
                            </tr>
                          `
        }).join('')
          }
          <tr>
          <td>Shipping Charge</td>
          <td></td>
          <td>₹100</td>
        </tr>
        <tr>
          <td>Total</td>
          <td></td>
          <td>₹${totalAmount}</td>
        </tr>
              </tbody >
            </table >
            <div class="address">
              <h2>Shipping Address</h2>
              <p>${userData.firstName} ${userData.lastName}</p>
              <p>${userData.address}</p>
              <p>${userData.city}-${userData.zipCode}</p>
              <p>${userData.userState}</p>
            </div>
            <p class="thanks">Thank you for choosing our website. If you have any questions or concerns, please don't hesitate to contact us.</p>
            <div class="signature">
              <p>Best regards,</p>
              <p> <a href="https://e-shopit.vercel.app/" target="_blank">ShopIt.com</a></p>
            </div>
          </body >
        </html >
  `,
        text: `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Order Confirmation</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                font-size: 16px;
                line-height: 1.5;
                color: black;
              }
        
              h1 {
                font-size: 24px;
                margin-bottom: 20px;
                color: black;
              }
        
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
              }
        
              th {
                text-align: left;
                padding: 10px;
                background-color: #eee;
              }
        
              td {
                padding: 10px;
                border: 1px solid #ddd;
              }
        
              .address {
                margin-bottom: 20px;
                color: black;

              }
        
              .address h2 {
                font-size: 20px;
                margin-bottom: 10px;
              }
        
              .address p {
                margin: 0;
              }
        
              .thanks {
                font-size: 18px;
                margin-top: 20px;
                color: black;

              }
        
              .signature {
                margin-top: 40px;
                color: black;

              }
        
              .signature p {
                margin: 0;
              }
            </style>
          </head>
          <body>
            <h1>Order Confirmation</h1>
            <p style="color:black;">Dear <b>${userData.firstName} ${userData.lastName}</b>,</p>
            <p>Thank you for your recent purchase on our website. We have received your payment of <b>₹${totalAmount}</b> and have processed your order.</p>
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Quantity</th>
                  <th>Price</th>
                </tr>
              </thead>
              <tbody>
                ${productInfo.map((product) => {
          return `
                            <tr>
                              <td>${product.productId.name}</td>
                              <td>${product.quantity}</td>
                              <td>₹${product.productId.price}</td>
                            </tr>
                          `
        }).join('')
          }
          <tr>
          <td>Shipping Charge</td>
          <td></td>
          <td>₹100</td>
        </tr>
        <tr>
          <td>Total</td>
          <td></td>
          <td>₹${totalAmount}</td>
        </tr>
              </tbody >
            </table >
            <div class="address">
              <h2>Shipping Address</h2>
              <p>${userData.firstName} ${userData.lastName}</p>
              <p>${userData.address}</p>
              <p>${userData.city}-${userData.zipCode}</p>
              <p>${userData.userState}</p>
            </div>
            <p class="thanks">Thank you for choosing our website. If you have any questions or concerns, please don't hesitate to contact us.</p>
            <div class="signature">
              <p>Best regards,</p>
              <p> <a href="https://e-shopit.vercel.app/" target="_blank">ShopIt.com</a></p>
            </div>
          </body >
        </html >
  `

      }

      transport.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log(error);
          // res.send({ msg: error });
        }
        else {
          return res.send({ success, msg: "Order Confirm" })
        }
      })
      await Payment.create({
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        user: userInfo,
        productData: productInfo,
        userData,
        totalAmount
      });
      const deleteCart = await Cart.deleteMany({ user: userInfo })

      res.redirect(`${process.env.PAYMENT_SUCCESS}=${razorpay_payment_id} `);
    }
    else {
      res.status(400).json({
        success: false,
      });
    }
  }
  catch (error) {
    console.log(error);
  }
}


module.exports = { checkout, paymentVerification }