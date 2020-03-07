const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const sendgrid = require('@sendgrid/mail');
const { validationResult } = require('express-validator');

const User = require('../models/user');

exports.getLogin = async (req, res, next) => {
  try {
    if (req.user) {
      return res.redirect('/');
    }
    res.render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
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

exports.postLogin = async (req, res, next) => {
  try {
    if (req.user && req.session.isLoggedIn && req.session.user) {
      return res.redirect('/');
    }
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().map(({ msg }) => req.flash('error', msg));
      const validationErrors = errors.array().map(({ param }) => param);
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors
        });
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'Wrong email or password');
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors: ['email', 'password']
        });
      });
    }
    const correctPassword = await bcrypt.compare(password, user.password);
    if (!correctPassword) {
      req.flash('error', 'Wrong email or password');
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors: ['email', 'password']
        });
      });
    }
    req.session.isLoggedIn = true;
    req.session.user = user;
    req.session.save(err => {
      if (err) console.log(err);
      res.redirect('/');
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('auth/login', {
      path: '/login',
      pageTitle: 'Login',
      errorMessage: [
        ...req.flash('error'),
        'Database operation failed, please try again'
      ],
      oldData: req.body,
      validationErrors: []
    });
  }
};

exports.postLogout = (req, res, next) => {
  try {
    req.session.destroy(err => {
      if (err) {
        console.log(err);
      }
      res.redirect('/login');
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.getSignup = (req, res, next) => {
  try {
    if (req.user) {
      return res.redirect('/');
    }
    res.render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
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

exports.postSignup = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().map(({ msg }) => req.flash('error', msg));
      const validationErrors = errors.array().map(({ param }) => param);
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('auth/signup', {
          path: '/signup',
          pageTitle: 'Signup',
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors
        });
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({ email, password: hashedPassword });
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: email,
      from: 'chaushunwai5988@gmail.com',
      subject: 'Thank you for your register on my node.js application!',
      text: `Hi. I am Klaus. You have been 
      successfully registered with your email.
      You can log in with ${email} from now on`,
      html: `Hi. I am Klaus. You have been 
      successfully registered with your email.
      You can log in with <strong>${email}</strong> from now on`
    };
    console.log('created user');
    res.redirect('/login');
    sendgrid.send(msg).catch(err => {
      console.log(err);
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('auth/signup', {
      path: '/signup',
      pageTitle: 'Signup',
      errorMessage: [
        ...req.flash('error'),
        'Database operation failed. Please try again.'
      ],
      oldData: req.body,
      validationErrors: []
    });
  }
};

exports.getReset = (req, res, next) => {
  try {
    if (req.user) {
      return res.redirect('/');
    }
    res.render('auth/reset', {
      path: '/reset',
      pageTitle: 'Reset Password',
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

exports.postReset = async (req, res, next) => {
  try {
    const { email } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().map(({ msg }) => req.flash('error', msg));
      const validationErrors = errors.array().map(({ param }) => param);
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('auth/reset', {
          path: '/reset',
          pageTitle: 'Reset Password',
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors
        });
      });
    }
    const user = await User.findOne({ email });
    if (!user) {
      req.flash('error', 'email does not exist');
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('auth/reset', {
          path: '/reset',
          pageTitle: 'Reset Password',
          errorMessage: req.flash('error'),
          oldData: req.body,
          validationErrors: ['email']
        });
      });
    }
    crypto.randomBytes(32, async (err, buf) => {
      try {
        if (err) {
          console.log(err);
          return res.status(500).render('auth/reset', {
            path: '/reset',
            pageTitle: 'Reset Password',
            errorMessage: [
              ...req.flash('error'),
              'Internal error. Please try again'
            ],
            oldData: req.body,
            validationErrors: []
          });
        }
        const token = buf.toString('hex');
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        await user.save();
        sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
        const msg = {
          to: email,
          from: 'chaushunwai5988@gmail.com',
          subject: 'Password Reset',
          text: `
              You requested a password reset
              Go to the link below to reset the password:
              ${req.protocol}://${req.get('host')}/reset/${token}
              valid within 1 hour
            `,
          html: `
              <p>You requested a password reset</p>
              <p>Click the link below to reset the password:</p>
              <a href="${req.protocol}://${req.get('host')}/reset/${token}">
                ${req.protocol}://${req.get('host')}/reset/${token}
              </a>
              <br>
              <strong>(valid within 1 hour)</strong>
            `
        };
        res.redirect('/login');
        sendgrid.send(msg).catch(err => {
          console.log(err);
        });
      } catch (err) {
        console.log(err);
        return res.status(500).render('auth/reset', {
          path: '/reset',
          pageTitle: 'Reset Password',
          errorMessage: [
            ...req.flash('error'),
            'Database operation failed. Please try again'
          ],
          oldData: req.body,
          validationErrors: []
        });
      }
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('auth/reset', {
      path: '/reset',
      pageTitle: 'Reset Password',
      errorMessage: [
        ...req.flash('error'),
        'Database operation failed. Please try again'
      ],
      oldData: req.body,
      validationErrors: []
    });
  }
};

exports.getNewPassword = async (req, res, next) => {
  try {
    if (req.user) {
      return res.redirect('/');
    }
    const { resetToken } = req.params;
    const user = await User.findOne({
      resetToken,
      resetTokenExpiration: { $gt: Date.now() }
    });
    if (!user) {
      req.flash(
        'error',
        'Reset link is invalid or has expired. Please try again.'
      );
      return req.session.save(err => {
        if (err) console.log(err);
        return res.redirect('/reset');
      });
    }
    res.render('auth/new-password', {
      path: '/reset',
      pageTitle: 'Reset Password',
      errorMessage: req.flash('error'),
      resetToken,
      validationErrors: []
    });
  } catch (err) {
    const error = new Error(err);
    error.httpStatusCode = 500;
    return next(error);
  }
};

exports.postNewPassword = async (req, res, next) => {
  try {
    const { password, resetToken } = req.body;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      errors.array().map(({ msg }) => req.flash('error', msg));
      const validationErrors = errors.array().map(({ param }) => param);
      return req.session.save(err => {
        if (err) console.log(err);
        return res.status(422).render('auth/new-password', {
          path: '/reset',
          pageTitle: 'Reset Password',
          errorMessage: req.flash('error'),
          resetToken,
          validationErrors
        });
      });
    }
    const user = await User.findOne({
      resetToken,
      resetTokenExpiration: { $gt: Date.now() }
    });
    if (!user) {
      req.flash(
        'error',
        'Reset link is invalid or has expired. Please try again.'
      );
      return req.session.save(err => {
        if (err) console.log(err);
        return res.redirect('/reset');
      });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    await user.save();
    sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
    const msg = {
      to: user.email,
      from: 'chaushunwai5988@gmail.com',
      subject: 'Password is reset successfully',
      text: `
            Your password is reset successfully.
            If you did not reset your password,
            please reset your password again for security reason.
      `,
      html: `
        <p>Your password is reset successfully.</p>
        <p>If you did not reset your password,</p>
        <p>please reset your password again for security reason.</p>
      `
    };
    res.redirect('/login');
    sendgrid.send(msg).catch(err => {
      console.log(err);
    });
  } catch (err) {
    console.log(err);
    return res.status(500).render('auth/new-password', {
      path: '/reset',
      pageTitle: 'Reset Password',
      errorMessage: [
        ...req.flash('error'),
        'Database operation failed. Please try again.'
      ],
      resetToken: req.body.resetToken,
      validationErrors: []
    });
  }
};
