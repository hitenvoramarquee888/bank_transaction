const mongoose = require("mongoose");

const beneficiarySchema = new mongoose.Schema(
{
    userId: {
    type: mongoose.Schema.Types.ObjectId,

    ref: "User",
    },

    beneficiaryName: {
    type: String,
    },

    accountNo: {
    type: Number,
    },
},{ timestamps: true });
module.exports = mongoose.model("Beneficiary", beneficiarySchema);
