var express = require('express');
var router = express.Router();

const usercontroller = require('../controller/user');
router.post('/post', usercontroller.register);
router.get('/getusers', usercontroller.getusers);
router.patch('/:updateid', usercontroller.updateProfile);
router.post('/login', usercontroller.login);
router.post('/forgotpassword',usercontroller.forgotpassword);
router.post('/verifyotp',usercontroller.verifyotp);
router.post('/resetpassword',usercontroller.resetpassword);


module.exports = router;
