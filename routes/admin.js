const router = require('express').Router();
const { body } = require('express-validator');

const {
  getAddProduct,
  postAddProduct,
  getEditProduct,
  postEditProduct,
  deleteProduct,
  getProducts
} = require('../controllers/admin');

router.get('/add-product', getAddProduct);

router.post(
  '/add-product',
  [
    body('title', 'Title cannot be empty')
      .isLength({ min: 1 })
      .trim(),
    body(
      'price',
      'Please use number greater than or equal to 0 for price'
    ).isFloat({
      min: 0
    }),
    body('description', 'description should not be empty')
      .isLength({ min: 1 })
      .trim()
  ],
  postAddProduct
);

router.get('/edit-product/:productId', getEditProduct);

router.post(
  '/edit-product',
  [
    body('title', 'Title cannot be empty')
      .isLength({ min: 1 })
      .trim(),
    body(
      'price',
      'Please use number greater than or equal to 0 for price'
    ).isFloat({
      min: 0
    }),
    body('description', 'description should not be empty')
      .isLength({ min: 1 })
      .trim()
  ],
  postEditProduct
);

// router.post('/delete-product', postDeleteProduct);
router.delete('/product/:productId', deleteProduct);

router.get('/products', getProducts);

module.exports = router;
