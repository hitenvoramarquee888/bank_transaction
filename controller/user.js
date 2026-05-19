const user = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  try {
    let passdata = req.body;

    const password = passdata.password;

    // 🔐 Password Validation Start
    if (password.length < 8) {
      return res.status(400).json({
        status: "fail",
        message: "Password must be at least 8 characters",
      });
    }
    const salt = await bcrypt.genSalt(10);
    passdata.password = await bcrypt.hash(passdata.password, salt);
    const data = await user.create(passdata);
    res.status(200).json({
      success: true,
      message: "User created successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error creating user",
      error: error.message,
    });
  }
};
exports.getusers = async (req, res) => {
  try {
    const data = await user.find();
    res.status(200).json({
      success: true,
      message: "User data retrieved successfully",
      data: data,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error retrieving user data",
      error: error.message,
    });
  }
};
exports.login = async (req, res) => {
  try {
    let passdata = req.body;
    const emailVerify = await user.findOne({
      $or: [
        { email: passdata.email },
        { name: passdata.name },
        { phone: passdata.phone },
      ],
    });
    if (!emailVerify) throw new Error("invalid name or email");
    const passwordVerify = await bcrypt.compare(
      passdata.password,
      emailVerify.password,
    );
    if (!passwordVerify) throw new Error("invalid password");
    const token = jwt.sign({ id: emailVerify._id }, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });
    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: emailVerify,
      token: token,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Error logging in user",
      error: err.message,
    });
  }
};
exports.forgotpassword = async (req, res) => {
  try {
    const userdata = await user.findOne({
      mobile: req.body.mobile,
    });

    if (!userdata) {
      throw new Error("user not found");
    }

    const otp = Math.floor(1000 + Math.random() * 9000);

    userdata.otp = otp;

    userdata.otpExpire = Date.now() + 5 * 60 * 1000;

    await userdata.save();

    console.log("OTP :", otp);

    res.json({
      success: true,
      message: "OTP sent successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
exports.verifyotp = async (req, res) => {
  try {
    const userdata = await user.findOne({
      mobile: req.body.mobile,
    });

    if (!userdata) {
      throw new Error("user not found");
    }

    if (Date.now() > userdata.otpExpire) {
      throw new Error("OTP expired");
    }

    if (userdata.otp != req.body.otp) {
      throw new Error("Invalid OTP");
    }

    res.json({
      success: true,
      message: "OTP verified",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
exports.resetpassword = async (req, res) => {
  try {
    const userdata = await user.findOne({
      mobile: req.body.mobile,
    });

    if (!userdata) {
      throw new Error("user not found");
    }

    const hashpassword = await bcrypt.hash(req.body.password, 10);

    userdata.password = hashpassword;

    userdata.otp = null;
    userdata.otpExpire = null;

    await userdata.save();

    res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (error) {
    res.json({
      success: false,
      message: error.message,
    });
  }
};
