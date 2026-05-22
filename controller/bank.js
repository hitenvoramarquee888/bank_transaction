const transaction = require("../model/transaction");
const { Parser } = require("json2csv");
const sendMail = require("../utils/sendmail");
const user = require("../model/user");
const Beneficiary = require("../model/beneficiary");
exports.alldata = async (req, res) => {

    try {

        // 🔥 Logged in user id
        const userid = req.user.id;

        // 🔥 Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        // 🔥 Only current user transactions
        const data = await transaction.find({
            account_Holdername: userid
        })
        .populate('account_Holdername')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        // 🔥 Total transaction count
        const totaltransactions = await transaction.countDocuments({
            account_Holdername: userid
        });

        // 🔥 Current user all transactions for balance
        const alltransactions = await transaction.find({
            account_Holdername: userid
        });

        // 🔥 Balance calculate
        let totalBalance = 0;

        alltransactions.forEach((item) => {

            if (item.method === "credit") {
                totalBalance += item.transaction;
            }

            if (item.method === "debit") {
                totalBalance -= item.transaction;
            }

        });

        res.status(200).json({
            success: true,
            message: "data fetched successfully",

            currentBalance: totalBalance,

            pagination: {
                page,
                limit,
                totaltransactions
            },

            data

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Error fetching data",
            error: error.message,
        });

    }

};
exports.transaction = async (req, res) => {

    try {

        let passdata = req.body;
            

        // 🔥 Current Balance Calculate
    const alltransactions = await transaction.find({
    account_Holdername: passdata.account_Holdername
    });

        let totalBalance = 0;

        alltransactions.forEach((item) => {

            if (item.method === "credit") {
                totalBalance += item.transaction;
            }
            else {
                totalBalance -= item.transaction;
            }

        });

        // 🔥 Debit validation
        if (
            passdata.method === "debit" &&
            passdata.transaction > totalBalance
        ) {

            return res.status(400).json({
                success: false,
                message: "Insufficient balance"
            });

        }
        const userdata = await user.findById(
        passdata.account_Holdername
        );

if(!userdata){
    throw new Error("User not found");
}

        const data = await transaction.create(passdata);

    const currentBalance =
    data.method === "credit"
    ? totalBalance + data.transaction
    : totalBalance - data.transaction;

        await sendMail(

    userdata.email,

    "Transaction Alert",

    `Dear ${userdata.name},
    Your transaction has been processed successfully.
    Account Number : ${userdata.accountNo.toString().slice(-4).padStart(10, "*")}
    Transaction Type : ${data.method}
    Amount : ₹${data.transaction}
    Available Balance : ₹${currentBalance}
    Date & Time : ${data.createdAt.toLocaleString()}
    If you did not authorize this transaction, please contact customer support immediately.

    Regards,
    Bank Support Team`

);

        res.status(200).json({
            success: true,
            message: "transaction successful",
            currentBalance,
        

            data
        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: "Error creating transaction",
            error: error.message,
        });

    }

};
exports.history = async (req, res) => {

    try {

        // 🔥 Logged in user
        const userid = req.user.id;

        // 🔥 Pagination
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        const skip = (page - 1) * limit;

        // 🔥 User total transaction count
        const totalTransactions = await transaction.countDocuments({
            account_Holdername: userid
        });

        // 🔥 Paginated history
        const data = await transaction.find({
            account_Holdername: userid
        })
        .populate('account_Holdername')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        // 🔥 Balance calculate
        const alltransactions = await transaction.find({
            account_Holdername: userid
        });

        let totalBalance = 0;

        alltransactions.forEach((item) => {

            if (item.method === "credit") {
                totalBalance += item.transaction;
            }

            if (item.method === "debit") {
                totalBalance -= item.transaction;
            }

        });

        res.status(200).json({

            success: true,

            currentBalance: totalBalance,

            pagination: {
                currentPage: page,
                limit: limit,
                totalTransactions: totalTransactions,
                totalPages: Math.ceil(totalTransactions / limit)
            },

            transactions: data

        });

    } catch (error) {

        res.status(500).json({
            success: false,
            message: error.message
        });

    }

}
exports.downloadStatement = async (req, res) => {

    try {

        const userid = req.user.id;

        const data = await transaction.find({
            account_Holdername: userid
        })
        .populate("account_Holdername")
        .sort({ createdAt: -1 });

        if (data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No transactions found"
            });
        }

        const statement = data.map(item => ({
            Name: item.account_Holdername.name,
            Amount: item.transaction,
            Type: item.method,
            Date : item.createdAt.toLocaleString()
        }));

        const parser = new Parser();
        const csv = parser.parse(statement);

        res.header("Content-Type", "text/csv");
        res.attachment("statement.csv");

        return res.send(csv);

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }
}
exports.transfer = async (req, res) => {

    try {

        const senderId = req.user.id;
        // Sender details
const sender = await user.findById(
    senderId
);

if (!sender) {

    throw new Error(
        "Sender not found"
    );

}

const {
    beneficiaryId,
    receiverAccountNo,
    amount
} = req.body;

let receiver;

if (beneficiaryId) {

    const beneficiary =
    await Beneficiary.findById(
        beneficiaryId
    );

    if (!beneficiary) {

        throw new Error(
            "Beneficiary not found"
        );

    }

    receiver =
    await user.findOne({

        accountNo:
        beneficiary.accountNo

    });

}
else if (receiverAccountNo) {

    receiver =
    await user.findOne({

        accountNo:
        receiverAccountNo

    });

}

if (!receiver) {

    throw new Error(
        "Receiver not found"
    );

}

        // Same account check
        if (
            sender.accountNo ===
            receiver.accountNo
        ) {

            throw new Error(
                "Cannot transfer to same account"
            );

        }

        // Sender balance
        const alltransactions =
        await transaction.find({

            account_Holdername:
            senderId

        });

        let totalBalance = 0;

        alltransactions.forEach(
            (item) => {

            if (
                item.method ===
                "credit"
            ) {

                totalBalance +=
                item.transaction;

            }
            else {

                totalBalance -=
                item.transaction;

            }

        });

        // Balance validation
        if (
            amount >
            totalBalance
        ) {

            throw new Error(
                "Insufficient balance"
            );

        }

        // Sender debit
        await transaction.create({

            account_Holdername:
            sender._id,

            transaction:
            amount,

            method:
            "debit"

        });

        // Receiver credit
        await transaction.create({

            account_Holdername:
            receiver._id,

            transaction:
            amount,

            method:
            "credit"

        });

        // Update balance
        totalBalance -= amount;

        // Sender email
        await sendMail(

            sender.email,

            "Money Transfer Alert",

`Dear ${sender.name},

Your transfer has been completed successfully.

Debited Amount : ₹${amount}

Transferred To :
${receiver.name}

Account :
${receiver.accountNo
.toString()
.slice(-4)
.padStart(10,"*")}

Available Balance :
₹${totalBalance}

Date :
${new Date().toLocaleString()}

Regards,
Bank Support Team`

        );

        // Receiver email
        await sendMail(

            receiver.email,

            "Money Received Alert",

`Dear ${receiver.name},

You have received money successfully.

Credited Amount :
₹${amount}

Received From :
${sender.name}

Account :
${sender.accountNo
.toString()
.slice(-4)
.padStart(10,"*")}

Date :
${new Date().toLocaleString()}

Regards,
Bank Support Team`

        );

        res.status(200).json({

            success: true,

            message:
            "Transfer successful",

            currentBalance:
            totalBalance

        });

    }
    catch (error) {

        res.status(500).json({

            success: false,

            error:
            error.message

        });

    }

};
exports.addBeneficiary =
async(req,res)=>{

    try{

        const data =
        await Beneficiary.create({

            userId:
            req.user.id,

            beneficiaryName:
            req.body.name,

            accountNo:
            req.body.accountNo

        });

        res.json({

            success:true,
            data

        });

    }
    catch(error){

        res.json({

            success:false,
            error:error.message

        });

    }

}