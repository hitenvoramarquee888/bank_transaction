var express = require('express');
var router = express.Router();
const middleware = require('../middleware/auth');
const transactionController = require('../controller/bank');
router.post('/post', middleware.authcheck,transactionController.transaction);
router.get('/get', middleware.authcheck,transactionController.alldata)
router.get('/history/:id',middleware.authcheck,transactionController.history);
router.get( "/statement", middleware.authcheck, transactionController.downloadStatement);



module.exports = router;