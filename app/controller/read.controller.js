const Read = require('../models/read.model');
const Expense = require('../models/expense.model');

const getOverview = async (req, res) => {
    try {
        // Get total spent from all expenses
        const expenseResult = await Expense.aggregate([
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$amount' }
                }
            }
        ]);

        const totalSpent = expenseResult.length > 0 ? expenseResult[0].totalSpent : 0;

        // Get the budget configuration (assuming there's one record for overall budget)
        const budgetConfig = await Read.findOne().sort({ createdAt: -1 });

        const totalBudget = budgetConfig ? budgetConfig.totalBudget : 0;
        const budgetLeft = totalBudget - totalSpent;

        res.status(200).json({
            message: 'Overview fetched successfully',
            data: {
                totalSpent: totalSpent,
                totalBudget: totalBudget,
                budgetLeft: budgetLeft
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch overview', error: error.message });
    }
};

// Set or update budget
const setBudget = async (req, res) => {
    try {
        const { totalBudget } = req.body;

        if (!totalBudget || totalBudget <= 0) {
            return res.status(400).json({ message: 'Valid totalBudget is required' });
        }

        // Get current total spent
        const expenseResult = await Expense.aggregate([
            {
                $group: {
                    _id: null,
                    totalSpent: { $sum: '$amount' }
                }
            }
        ]);

        const totalSpent = expenseResult.length > 0 ? expenseResult[0].totalSpent : 0;
        const budgetLeft = totalBudget - totalSpent;

        // Create new budget record
        const budget = await Read.create({
            totalBudget: totalBudget,
            totalSpent: totalSpent,
            budgetLeft: budgetLeft
        });

        res.status(201).json({
            message: 'Budget set successfully',
            data: budget
        });
    } catch (error) {
        res.status(500).json({ message: 'Failed to set budget', error: error.message });
    }
};

module.exports = { getOverview, setBudget };
