const mongoose = require('mongoose');

const readSchema = new mongoose.Schema({
    
    totalExpense: {
        type: Number,
        required: true
    },
    totalSpent: {
        type: Number,
        required: true
    },
    budgetLeft: {
        type: Number,
        required: true
    },
    totalBudget: {
        type: Number,
        required: true
    }
}, { timestamps: true });

const Read = mongoose.model('Read', readSchema);

module.exports = Read;