const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf');
const flash = require('connect-flash');
const multer = require('multer');

const errorController = require('./controllers/error');
const User = require('./models/user'); 

const app = express();

const MONGODB_URI ='';     
 //connectn string as it needs to know in which db, server to store ur data.
const store = new MongoDBStore({
  uri: MONGODB_URI,             //a MongoDB connection string
  // databaseName: 'shop_db',      // the MongoDB database to store sessions in
  collection: 'shop_sessions'        //the MongoDB collection to store sessions in
});

const fileStorage = multer.diskStorage({     //where to store files
  destination: (req, file, cb) => {
    cb(null, 'images_folder');
  },
  filename: (req, file, cb) => {
    cb(null, new Date().toISOString() + '-' + file.originalname);         //??????????????
  }
  // If no filename is given, each file will be given a random name that doesn't include any file extension.
});

const fileFilter = (req, file, cb) => {      //control which files are accepted
  if (
    file.mimetype === 'image/png' ||
    file.mimetype === 'image/jpg' ||
    file.mimetype === 'image/jpeg'
  ) {
    cb(null, true);       // To accept the file
  } else {
    cb(null, false);       // To reject this file
  }
};

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(
  multer({ 
    dest:'images_folder', //tells Multer where to upload files nd multer instead of just buffering it to memory, it turns buffer back into binary data nd store it. 
    // storage: fileStorage,                                  // ????????????????????????
          // either of dest or storage
    fileFilter: fileFilter 
  })
  .single('image_name')  // have single file named image_name(input name that holds the file) stored in req.file
);
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images_folder', express.static(path.join(__dirname, 'images_folder')));
app.use(
  session({
    secret: 'mySecret',
    resave: false,
    saveUninitialized: false,
    store: store
  })
);
app.use(csrf());
app.use(flash());

app.use((req, res, next) => {
  // locals==set local variables that r passed into the views & will only exist in views which r rendered.
  // An object that contains response local variables scoped to the request, and therefore available only to the view(s) rendered during that request / response cycle (if any).
  // properties that are valid only for the lifetime of the request.
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {               //catches nly technical errors
      next(new Error(err));      //When you pass an argument to next(), Express will assume that this was an error and it will skip all other 
                                  // routes and send whatever was passed to next() to the error handling middleware that was defined.
    });
});

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500', errorController.get500);

app.use(errorController.get404);

// handle errors from requests to nonexistent paths nd also handle other errors that may happen in our app.
app.use((error, req, res, next) => {
  console.log("error middleware", error);
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  // res.status(500).render('500', {
  //   pageTitle: 'Error///!!!',
  //   path: '/500',
  //   isAuthenticated: req.session.isLoggedIn                 //????????????????????????????/
  // });
});
 
mongoose
  .connect(MONGODB_URI)
  .then(result => {
    // User.findOne().then(user => {
    //   if (!user) {
    //     const user = new User({
    //       name: 'Max',
    //       email: 'max@test.com',
    //       cart: {
    //         items: []
    //       }
    //     });
    //     user.save();
    //   }
    // });
    app.listen(3000);
  })
  .catch(err => {
    console.log(err);
  });
