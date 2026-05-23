const user = require('../model/user')
const jwt = require('jsonwebtoken')

module.exports.authcheck = async (req, res, next) => {
    try {

        const token = req.headers.authorization
        console.log(token);
        if (!token) throw new Error('attach token')

        const tokenVerify = jwt.verify(token, process.env.JWT_SECRET)
        console.log(tokenVerify);
        if (!tokenVerify) throw new Error('invalid token')
        const userVerify = await user.findById(tokenVerify.id)
        if (!userVerify) throw new Error('invalid user')

            req.user = userVerify;

        next()


    } catch(error) {
        res.status(500).json({
            status: 'fail',
            message: error.message

        })
    }
}

