var express = require('express');
var router = express.Router();
const untils = require('../utils/multer');



const usercontroller = require('../controller/user');
router.post('/post', untils.upload.single('image'), usercontroller.register);
router.get('/getusers', usercontroller.getusers);
router.patch('/:updateid', untils.upload.single('image'), usercontroller.updateProfile);
router.post('/login', usercontroller.login);
router.post('/forgotpassword',usercontroller.forgotpassword);
router.post('/verifyotp',usercontroller.verifyotp);
router.post('/resetpassword',usercontroller.resetpassword);


module.exports = router;
