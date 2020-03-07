const fs = require('fs');
const path = require('path');

const PDFDocument = require('pdfkit');
const stripe = require('stripe')(process.env.STRIPE_SECRET);

const Product = require('../models/product');
const Order = require('../models/order');

const ITEMS_PER_PAGE = 8;

exports.getIndex = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;
    const totalProducts = await Product.countDocuments();
    const pages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    const products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render('shop/index', {
      prods: products,
      pageTitle: 'Shop',
      path: '/',
      page,
      nextPage: page + 1,
      previousPage: page - 1,
      pages
    }); //dirname:absolute path to routes folder
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;
    const totalProducts = await Product.countDocuments();
    const pages = Math.ceil(totalProducts / ITEMS_PER_PAGE);

    const products = await Product.find()
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render('shop/product-list', {
      prods: products,
      pageTitle: 'All Products',
      path: '/products',
      page,
      nextPage: page + 1,
      previousPage: page - 1,
      pages
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findById(productId);
    if (product) {
      return res.render('shop/product-detail', {
        product: product,
        pageTitle: product.title,
        path: '/products'
      }); //dirname:absolute path to routes folder
    }
    res.redirect('/products');
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCart = async (req, res, next) => {
  try {
    const products = await req.user.getCart();
    res.render('shop/cart', {
      path: '/cart',
      pageTitle: 'Your Cart',
      products,
      totalPrice: products.reduce((totalPrice, currProduct) => {
        return totalPrice + currProduct.quantity * currProduct.product.price;
      }, 0)
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCart = async (req, res, next) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    await req.user.addToCart(product);
    res.redirect('/cart');
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postCartDeleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.body;
    await req.user.removeFromCart(productId);
    res.redirect('/cart');
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postOrder = async (req, res, next) => {
  try {
    const { email, _id: userId } = req.user;
    const products = await req.user.getCart();
    await Order.create({
      user: { email, userId },
      products: products.map(product => {
        return {
          quantity: product.quantity,
          product: { ...product.product._doc }
        };
      })
    });
    await req.user.clearCart();
    res.redirect('/orders');
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ 'user.userId': req.user._id });
    res.render('shop/orders', {
      path: '/orders',
      pageTitle: 'Your Orders',
      orders
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getInvoice = async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return next(new Error('No order found'));
    }
    if (order.user.userId.toString() !== req.user._id.toString()) {
      return next(new Error('Forbidden'));
    }
    const invoiceName = `invoice-${orderId}.pdf`;
    const invoicePath = path.join('data', 'invoices', invoiceName);

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'inline; filename="' + invoiceName + '"' //attachment for filename
    );
    doc.pipe(fs.createWriteStream(invoicePath));
    doc.pipe(res);
    doc.fontSize(30).text('INVOICE', { align: 'center' });
    doc.fontSize(24).text(`Order - #${order._id}`, { underline: true });
    doc.fontSize(16).text(`
Buyer Email: ${order.user.email}
    `);
    let totalPrice = 0;
    order.products.length > 0 &&
      order.products.map(product => {
        totalPrice += product.quantity * product.product.price;

        doc.fontSize(12).text(
          `
${product.product.title} - $ ${product.product.price} x ${product.quantity}
Product Description: ${product.product.description}
      `,
          {
            indent: 0
          }
        );
        doc.moveDown();
      });
    doc.fontSize(16).text('Total Price: $ ' + totalPrice);
    doc.end();
    // fs.readFile(invoicePath, (err, data) => {
    //   if (err) return next(err);
    //   res.setHeader('Content-Type', 'application/pdf');
    //   res.setHeader(
    //     'Content-Disposition',
    //     'inline; filename="' + invoiceName + '"' //attachment for filename
    //   );
    //   res.send(data);
    // });
    // const file = fs.createReadStream(invoicePath);
  } catch (err) {
    err.httpStatusCode = 500;
    next(err);
  }
};

exports.getCheckout = async (req, res, next) => {
  try {
    const products = await req.user.getCart();
    const totalPrice = products.reduce((totalPrice, currProduct) => {
      return totalPrice + currProduct.quantity * currProduct.product.price;
    }, 0);
    if (totalPrice < 4) {
      return res.render('shop/checkout', {
        path: '/checkout',
        pageTitle: 'Checkout',
        products,
        totalPrice,
        sessionId: null
      });
    }
    stripe.checkout.sessions
      .create({
        success_url: `${req.protocol}://${req.get('host')}/checkout/success`,
        cancel_url: `${req.protocol}://${req.get('host')}/checkout/cancel`,
        payment_method_types: ['card'],
        line_items: products.map(p => {
          return {
            name: p.product.title,
            description: p.product.description,
            amount: p.product.price * 100,
            currency: 'hkd',
            quantity: p.quantity
          };
        })
      })
      .then(session => {
        res.render('shop/checkout', {
          path: '/checkout',
          pageTitle: 'Checkout',
          products,
          totalPrice,
          sessionId: session.id
        });
      })
      .catch(err => next(err));
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getCheckoutSuccess = async (req, res, next) => {
  try {
    //ALERT: need to check manually if users paid of not
    // as no webhooks are developed
    const { email, _id: userId } = req.user;
    const products = await req.user.getCart();
    await Order.create({
      user: { email, userId },
      products: products.map(product => {
        return {
          quantity: product.quantity,
          product: { ...product.product._doc }
        };
      })
    });
    await req.user.clearCart();
    res.redirect('/orders');
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};
