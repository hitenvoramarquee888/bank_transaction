const user = require("../model/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendMail = require("../utils/sendmail");

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
    await sendMail(
      passdata.email,

      "Welcome",
      "Hello " +
        passdata.name + 
        " welcome to our bank." +
        "Your account has been created successfully."+ 
        "Thank you for choosing us!.,for any query contact us on 1800-123-4567",
    );
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
exports.updateProfile = async (req, res) => {
  try {
    const updateid = req.params.updateid;

    const updatedata = await user.findByIdAndUpdate(updateid,req.body,{new: true , runValidators: true}).select("-password");

      if(!updatedata){
      return res.status(404).json({
      status: "fail",
      message: "user not found"
      })
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data : updatedata,

    });
  
}catch (error) {
    res.status(500).json({
      success: false,
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

    if (!emailVerify) throw new Error("Invalid name or email OR phone number");

    const passwordVerify = await bcrypt.compare(
      passdata.password,
      emailVerify.password,
    );

    if (!passwordVerify) throw new Error("Invalid password");

    if (emailVerify.isBlocked) {
      throw new Error("Your account has been blocked");
    }

    const token = jwt.sign(
      { id: emailVerify._id, role: emailVerify.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      success: true,
      message: "User logged in successfully",
      data: {
        id: emailVerify._id,
        name: emailVerify.name,
        email: emailVerify.email,
        role: emailVerify.role,
      },

      token,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
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

    await sendMail(
      userdata.email,

      "OTP Verification",

      `Your OTP is ${otp}`,
    );

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
    // 🔥 Password length validation
    if (req.body.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
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
