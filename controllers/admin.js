const { validationResult } = require('express-validator');

const Product = require('../models/product');
const { deleteFile } = require('../util/file');
const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const ITEMS_PER_PAGE = 8;

exports.getAddProduct = (req, res, next) => {
  try {
    res.render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      errorMessage: req.flash('error'),
      oldData: {},
      validationErrors: []
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postAddProduct = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(422).render('admin/edit-product', {
        pageTitle: 'Add Product',
        path: '/admin/add-product',
        editing: false,
        errorMessage: [...req.flash('error'), 'Please upload a valid image'],
        oldData: req.body,
        validationErrors: ['image']
      });
    }
    req.body.image = req.file.key;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().map(({ msg }) => req.flash('error', msg));
      const validationErrors = errors.array().map(({ param }) => param);
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('admin/edit-product', {
          pageTitle: 'Add Product',
          path: '/admin/add-product',
          editing: false,
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors
        });
      });
    }

    const user = req.user._id;
    await Product.create({
      ...req.body,
      user
    });
    console.log('product created');
    res.redirect('/');
  } catch (err) {
    console.log(err);
    return res.status(500).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      errorMessage: [
        ...req.flash('error'),
        'Database operation failed. Please try again'
      ],
      oldData: req.body,
      validationErrors: []
    });
  }
};

exports.getEditProduct = async (req, res, next) => {
  try {
    const { edit } = req.query;
    if (!edit) {
      return res.redirect('/admin/add-product');
    }
    const { productId } = req.params;
    const product = await Product.findOne({
      _id: productId,
      user: req.user._id
    });
    if (!product) {
      return res.redirect('/admin/products');
    }
    res.render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/add-product',
      editing: edit,
      product,
      errorMessage: req.flash('error'),
      oldData: {},
      validationErrors: []
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postEditProduct = async (req, res, next) => {
  try {
    const { productId: _id } = req.body;
    if (!_id) return res.redirect('/admin/add-product');
    if (req.file) {
      req.body.image = req.file.key;
    }
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().map(({ msg }) => req.flash('error', msg));
      const validationErrors = errors.array().map(({ param }) => param);
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('admin/edit-product', {
          pageTitle: 'Edit Product',
          path: '/admin/add-product',
          editing: true,
          product: { _id },
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors
        });
      });
    }

    const oldDoc = await Product.findOneAndUpdate(
      { _id, user: req.user._id },
      { ...req.body }
    );
    if (req.file && oldDoc) {
      deleteFile(oldDoc.image);
    }
    console.log('editted');
    res.redirect('/admin/products');
  } catch (err) {
    console.log(err);
    return res.status(500).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/add-product',
      editing: true,
      product: { _id },
      errorMessage: [
        ...req.flash('error'),
        'Database operation failed. Please try again'
      ],
      oldData: req.body,
      validationErrors: []
    });
  }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const oldDoc = await Product.findByIdAndRemove({
      _id: productId,
      user: req.user._id
    });
    if (oldDoc) {
      deleteFile(oldDoc.image);
    }
    console.log('deleted');
    res.status(200).json({ message: 'success' });
  } catch (err) {
    res.status(500).json({ message: 'deleting product failed' });
  }
};

exports.getProducts = async (req, res, next) => {
  try {
    const page = +req.query.page || 1;
    const totalProducts = await Product.countDocuments({ user: req.user._id });
    const pages = Math.ceil(totalProducts / ITEMS_PER_PAGE) || 1;

    const products = await Product.find({ user: req.user._id })
      .skip((page - 1) * ITEMS_PER_PAGE)
      .limit(ITEMS_PER_PAGE);

    res.render('admin/products', {
      prods: products,
      pageTitle: 'Admin Products',
      path: '/admin/products',
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
