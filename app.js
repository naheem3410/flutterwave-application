/**
 * Module dependencies.
 */
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let baseRouter = require('./routes/base-route');
let ruleValidationRouter = require('./routes/rule-validation');
const PORT = process.env.PORT || 3000
let app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/',baseRouter);
app.post('/validate-rule', ruleValidationRouter);

//handles errors from bad JSON
app.use(function(err,req,res,next){
	if(req.headers["content-type"].indexOf("application/json") != -1 && err.statusCode == 400)
		res.status(400).json({"message":"Invalid JSON payload passed.","status":"error","data":null});
	else
		next(err);
});
// default error handler
app.use(function(err, req, res, next) {
  // render the error page
  res.status(err.status || 500);
  res.send('Error encoutered');
});
app.listen(PORT);
