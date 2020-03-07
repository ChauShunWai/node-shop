const router = require('express').Router();
const { body } = require('express-validator');

const User = require('../models/user');

const {
  getLogin,
  postLogin,
  postLogout,
  getSignup,
  postSignup,
  getNewPassword,
  postNewPassword,
  getReset,
  postReset
} = require('../controllers/auth');

router.get('/login', getLogin);

router.post(
  '/login',
  [
    body('email', 'Please enter a valid email.')
      .isEmail()
      .normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password should contain at least 6 letters or numbers')
      .isAlphanumeric()
      .withMessage('Password should contain only letters or numbers')
  ],
  postLogin
);

router.post('/logout', postLogout);

router.get('/signup', getSignup);

router.post(
  '/signup',
  [
    body('email', 'Please enter a valid email.')
      .isEmail()
      .normalizeEmail()
      .custom(value => {
        return User.findOne({ email: value }).then(user => {
          if (user) {
            return Promise.reject('User already exists');
          }
        });
      }),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password should contain at least 6 letters or numbers')
      .isAlphanumeric()
      .withMessage('Password should contain only letters or numbers')
      .custom((value, { req }) => {
        const { confirmPassword } = req.body;
        if (value !== confirmPassword) {
          throw new Error('Password and confirm password must be equal');
        }
        return true;
      })
  ],
  postSignup
);

router.get('/reset', getReset);

router.post(
  '/reset',
  body('email', 'Please enter a valid email.')
    .isEmail()
    .normalizeEmail(),
  postReset
);

router.get('/reset/:resetToken', getNewPassword);

router.post(
  '/new-password',
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password should contain at least 6 letters or numbers')
    .isAlphanumeric()
    .withMessage('Password should contain only letters or numbers')
    .custom((value, { req }) => {
      if (value !== req.body.confirmPassword) {
        throw new Error('Password and confirm password must be equal');
      }
      return true;
    }),
  postNewPassword
);

module.exports = router;
