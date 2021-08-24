const express = require('express');
const mongoose = require('mongoose');
const passport = require('passport');
const cors = require('cors');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const flash = require('connect-flash');
//  Load models
const User = require('./models/User');
const Message = require('./models/Message');

const bodyParser = require('body-parser');
const Handlebars = require('handlebars');

const exphbs = require('express-handlebars');

const {
  allowInsecurePrototypeAccess,
} = require('@handlebars/allow-prototype-access');

dotenv.config();
const app = express();
// load keys file
const Keys = require('./config/keys');

// Load Helpers
const { requireLogin, ensureGuest } = require('./helpers/auth');

app.set('port', process.env.PORT || 3000);

app.use(express.urlencoded({ extended: true }));

app.use(express.json());
app.use(cors());

// configuration for authentication
app.use(cookieParser());
app.use(
  session({
    secret: 'mysecret',
    resave: true,
    saveUninitialized: true,
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// setup express static folder to serve js and css files
app.use(express.static('public'));

// Make user global object
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});
// load facebook Strategy
require('./passport/facebook');

// connect to MongoDB
mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@${process.env.DB_HOST}/${process.env.DB_NAME}?retryWrites=true&w=majority`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log('You are connected to MongoDB 🙉');
  })
  .catch((error) => {
    console.log('an error occurred while connecting ot the db', error);
  });

// environment for port
const port = process.env.PORT || 3000;

// setup view engine
app.engine(
  'handlebars',
  exphbs({
    defaultLayout: 'main',
    handlebars: allowInsecurePrototypeAccess(Handlebars),
  })
);
app.set('view engine', 'handlebars');

app.get('/', ensureGuest, (req, res) => {
  res.render('home', {
    title: 'Home',
  });
});

app.get('/about/', ensureGuest, (req, res) => {
  res.render('about', {
    title: 'About',
  });
});

app.get('/contact/', ensureGuest, (req, res) => {
  res.render('contact', {
    title: 'Contact',
  });
});

app.get(
  '/auth/facebook',
  passport.authenticate('facebook', {
    scope: ['email'],
  })
);
app.get(
  '/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/profile',
    failureRedirect: '/',
  })
);
app.get('/profile', requireLogin, (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    if (user) {
      user.online = true;
      user.save((err, user) => {
        if (err) {
          throw err;
        } else {
          res.render('profile', {
            title: 'Profile',
            user: user,
          });
        }
      });
    }
  });
});

app.get('/newAccount', (req, res) => {
  res.render('newAccount', {
    title: 'Signup',
  });
});
app.post('/signup', (req, res) => {
  console.log(req.body);
  let errors = [];

  if (req.body.password !== req.body.password2) {
    errors.push({ text: 'Password does Not match' });
  }
  if (req.body.password.length < 5) {
    errors.push({ text: 'Password must be at least 5 characters' });
  }
  if (errors.length > 0) {
    res.render('newAccount', {
      errors: errors,
      title: 'Error',
      fullname: req.body.username,
      email: req.body.email,
      password: req.body.password,
      password2: req.body.password2,
    });
  } else {
    res.send('No errors! Ready to create new account');
  }
});

app.get('/logout', (req, res) => {
  User.findById({ _id: req.user._id }).then((user) => {
    user.online = false;
    user.save((err, user) => {
      if (err) {
        throw err;
      }
      if (user) {
        req.logout();
        res.redirect('/');
      }
    });
  });
});

app.post('/contactUs', (req, res) => {
  console.log(req.body);
  const newMessage = {
    fullname: req.body.fullname,
    email: req.body.email,
    message: req.body.message,
    date: new Date(),
  };
  new Message(newMessage).save((err, message) => {
    if (err) {
      throw err;
    } else {
      Message.find({}).then((messages) => {
        if (messages) {
          res.render('newmessage', {
            title: 'Message sent',
            messages: messages,
          });
        } else {
          res.render('noMessage', {
            title: 'Not found',
          });
        }
      });
    }
  });
});

app.post('/signup', (req, res) => {
  console.log(req.body);
});
app.listen(app.get('port'), () => {
  console.log('Server started on port ' + app.get('port'));
});
