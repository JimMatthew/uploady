const createError = require('http-errors');
const express = require('express');
const path = require('path');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const session = require('express-session');
const bcrypt = require('bcryptjs');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const users = [
  { id: 1, username: 'admin', passwordHash: bcrypt.hashSync('123', 10) } 
]

const app = express()

app.use(session({
  secret: 'secret_key',
  resave: false,
  saveUninitialized: true,
}))

app.use(passport.initialize())
app.use(passport.session())
// view engine setup
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use(express.static(path.join(__dirname, 'public')))

passport.use(new LocalStrategy(
  (username, password, done) => {
    const user = users.find(user => user.username === username)
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' })
    }
    if (!bcrypt.compareSync(password, user.passwordHash)) {
      return done(null, false, { message: 'Incorrect password.' })
    }
    return done(null, user)
  }
))

// Serialize and deserialize user
passport.serializeUser((user, done) => {
  done(null, user.id)
})

passport.deserializeUser((id, done) => {
  const user = users.find(user => user.id === id)
  done(null, user)
})

// Middleware to check if the user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next()
  }
  res.redirect('/login')
}

const routes = require('./routes/route')(path.join(__dirname, 'uploads'), isAuthenticated)

app.use('/', routes)
app.get('/login', (req, res) => {
  res.render('login', { message: req.session.messages || '' })
})

//app.use('/sftp', sfptRouter)

app.post('/login',
  passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureMessage: true,
  })
)

// Logout route
app.get('/logout', (req, res) => {
  req.logout(() => {
    res.redirect('/login')
  })
})

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404))
})

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  res.render('error')
})

module.exports = app
