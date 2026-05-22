const mongoose = require('mongoose')
const transactionschema = new mongoose.Schema({
    account_Holdername: {
        type: mongoose.Schema.Types.ObjectId,
        ref : 'User',
        required: [true, "please enter your name"],
        
    },

    transaction : {
        type : Number,
        required: [true, "please enter your trancaction"],
}, 
    method : {
        type : String,
        enum : ['credit','debit'],
        default : 'credit'
        
}

},{timestamps : true})
module.exports = mongoose.model('transaction', transactionschema)