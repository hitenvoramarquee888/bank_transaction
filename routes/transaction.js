var express = require('express');
var router = express.Router();
// const { authcheck } = require('../middleware/auth');
const transactionController = require('../controller/bank');
router.post('/post', transactionController.transaction);
router.get('/alldata', transactionController.alldata)
router.get('/history/:id',transactionController.history);
router.get( "/statement",  transactionController.downloadStatement);
router.post("/transfer",  transactionController.transfer);
router.post( "/add-beneficiary",transactionController.addBeneficiary);
// router.get("/receipt/:fileName",authcheck,transactionController.downloadReceipt);



module.exports = router;