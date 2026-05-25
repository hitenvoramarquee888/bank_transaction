var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cors = require('cors');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
require("dotenv").config();


var usersRouter = require('./routes/users');
var trasactionRoutes = require('./routes/transaction');
var middelewere = require('./middleware/auth');
// var adminroutes = require('./routes/admin');
const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/Hnewprojec' )
.then(()=>{
  console.log("mongoDB database connect successfuly")
  
})
.catch((err)=>{
  console.log(err);
});



var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(cors());
// app,use(sockets())
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/transaction',middelewere.authcheck, trasactionRoutes);
// app.use('/admin', adminroutes);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
