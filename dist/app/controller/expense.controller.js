const Expense = require("../models/expense.model");

const createExpense = async (req, res) => {
  try {
    const { title, amount, category, description } = req.body;
    const createdBy = req.user._id;
    const date = new Date();
    const team = req.user.team;
    const expense = await Expense.create({
      amount,
      category,
      description,
      title,
      createdBy,
      date,
      team,
    });
    res
      .status(201)
      .json({ message: "Expense created successfully", expense: expense });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create expense", error: error.message });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    res.status(200).json(expense);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get expense", error: error.message });
  }
};
const getExpensesByCategory = async (req, res) => {
  try {
    const expenses = await Expense.find({ category: req.params.categoryId });
    res.status(200).json(expenses);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to get expenses by category",
        error: error.message,
      });
  }
};

const getExpensesByUser = async (req, res) => {
  try {
    const expenses = await Expense.find({ createdBy: req.params.userId });
    res.status(200).json(expenses);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to get expenses by user",
        error: error.message,
      });
  }
};

const getExpensesByTeam = async (req, res) => {
  try {
    const expenses = await Expense.find({ team: req.params.teamId });
    res.status(200).json(expenses);
  } catch (error) {
    res
      .status(500)
      .json({
        message: "Failed to get expenses by team",
        error: error.message,
      });
  }
};
const getAllExpenses = async (req, res) => {
  try {
    const expenses = await Expense.find();
    res.status(200).json(expenses);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get expenses", error: error.message });
  }
};

const updateExpense = async (req, res) => {
  try {
    const { amount, date, category, description, createdBy } = req.body;
    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      { amount, date, category, description, createdBy },
      { new: true },
    );
    res
      .status(200)
      .json({ message: "Expense updated successfully", expense: expense });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update expense", error: error.message });
  }
};

const deleteExpense = async (req, res) => {
  try {
    await Expense.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete expense", error: error.message });
  }
};
module.exports = {
  createExpense,
  getExpenseById,
  getAllExpenses,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  getExpensesByUser,
  getExpensesByTeam,
};
