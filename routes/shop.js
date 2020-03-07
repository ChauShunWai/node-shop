const router = require('express').Router();
const currUserCheck = require('../middleware/currUserCheck');

const {
  getIndex,
  getProducts,
  getProduct,
  getCart,
  postCart,
  postCartDeleteProduct,
  getOrders,
  getInvoice,
  getCheckout,
  getCheckoutSuccess
} = require('../controllers/shop');

// // top-to-bottom, if url = /abc
// // '/'will also be triggered
// // '/abc' route shd be put on top
// // as '/abc' will not move on without next()
// // unless use .get as .get will be exact match
router.get('/', getIndex);

router.get('/products', getProducts);

router.get('/products/:productId', getProduct);

router.get('/cart', currUserCheck, getCart);

router.post('/cart', currUserCheck, postCart);

router.post('/cart-delete-item', currUserCheck, postCartDeleteProduct);

// router.post('/create-order', currUserCheck, postOrder);

router.get('/orders', currUserCheck, getOrders);

router.get('/orders/:orderId', currUserCheck, getInvoice);

router.get('/checkout', currUserCheck, getCheckout);

router.get('/checkout/success', currUserCheck, getCheckoutSuccess);

router.get('/checkout/fail', currUserCheck, getCheckout);

module.exports = router;
