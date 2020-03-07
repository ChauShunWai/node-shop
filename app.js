const path = require('path');
const fs = require('fs');
// const https = require('https');

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');
const helmet = require('helmet');
const compression = require('compression');
// const morgan = require('morgan');
const AWS = require('aws-sdk');
const multerS3 = require('multer-s3');
const s3Proxy = require('s3-proxy');
const { v4 } = require('uuid');

const { get404, get500 } = require('./controllers/error');
const User = require('./models/user');
const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');
const currUserCheck = require('./middleware/currUserCheck');

const app = express();
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

const store = new MongoDBStore({
  uri: process.env.MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf();

// const privateKey = fs.readFileSync('server.key');
// const certificate = fs.readFileSync('server.cert');

const storage = multerS3({
  s3: s3,
  bucket: process.env.BUCKET_NAME,
  metadata: function(req, file, cb) {
    cb(null, {
      fieldName: file.fieldname,
      extension: file.mimetype.split('/')[1]
    });
  },
  key: function(req, file, cb) {
    cb(
      null,
      Date.now().toString() + '-' + v4() + '.' + file.mimetype.split('/')[1]
    );
  }
});
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.includes('image')) {
    return cb(null, false);
  }
  return cb(null, true);
};

app.set('view engine', 'ejs');
app.set('views', 'views');

// const accessLogStream = fs.createWriteStream(
//   path.join(__dirname, 'access.log'),
//   { flags: 'a' }
// );
app.use(helmet());
app.use(compression());
// app.use(morgan('combined', { stream: accessLogStream }));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(flash());
const s3router = express.Router();
app.use(
  '/media',
  s3router.get(
    '/*',
    s3Proxy({
      bucket: process.env.BUCKET_NAME,
      accessKeyId: s3.config.credentials.accessKeyId,
      secretAccessKey: s3.config.credentials.secretAccessKey,
      overrideCacheControl: 'max-age=100000',
      defaultKey: false
    })
  )
);
app.use(
  multer({
    storage,
    fileFilter,
    limits: {
      fileSize: 1048576 / 2
    }
  }).single('image')
);
app.use(csrfProtection);
app.use(function(err, req, res, next) {
  if (err.code !== 'EBADCSRFTOKEN') return next(err);
  // handle CSRF token errors here
  req.flash('error', 'CSRF token error. Please refresh and submit again');
  req.session.save(err => {
    if (err) console.log(err);
    res.status(403).redirect('back');
  });
});
app.use(function(err, req, res, next) {
  if (err.code !== 'LIMIT_FILE_SIZE') return next(err);

  req.flash('error', 'Max picture size is 512 KB');
  req.session.save(err => {
    if (err) console.log(err);

    return res.redirect('back');
  });
});

app.use(async (req, res, next) => {
  try {
    if (req.session.user) {
      const user = await User.findById(req.session.user._id);
      if (!user) {
        req.session.isLoggedIn = false;
        req.session.user = null;
        return req.session.save(err => {
          if (err) console.log(err);
          return next();
        });
      }
      req.session.isLoggedIn = true;
      return req.session.save(err => {
        if (err) console.log(err);
        req.user = user;
        return next();
      });
    }
    req.session.isLoggedIn = false;
    req.session.save(err => {
      if (err) console.log(err);
      return next();
    });
  } catch (err) {
    err.httpStatusCode = 500;
    next(err);
  }
});

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use('/admin', currUserCheck, adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.get('/500', get500);
app.use(get404);
app.use((err, req, res, next) => {
  //res.status(err.httpStatusCode).render(...)
  console.log(err);
  res.redirect('/500');
});

mongoose
  .connect(
    process.env.MONGODB_URI,
    {
      useUnifiedTopology: true,
      useNewUrlParser: true,
      useFindAndModify: false
    },
    err => {
      if (err) console.log(err);
    }
  )
  .then(res => {
    console.log('connected');
    // https
    //   .createServer({ key: privateKey, cert: certificate }, app)
    app.listen(process.env.PORT || 3000);
  });
