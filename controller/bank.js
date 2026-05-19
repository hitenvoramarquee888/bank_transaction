const transaction = require("../model/transaction");
const { Parser } = require("json2csv");
const PDFDocument = require("pdfkit");



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
        const alltransactions = await transaction.find();

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

        const data = await transaction.create(passdata);

        res.status(200).json({
            success: true,
            message: "transaction successful",
            currentBalance:
                passdata.method === "credit"
                    ? totalBalance + passdata.transaction
                    : totalBalance - passdata.transaction,

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
            AccountNo: item.accountNo,
            Amount: item.transaction,
            Type: item.method,
            Date: item.createdAt.toLocaleString()
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