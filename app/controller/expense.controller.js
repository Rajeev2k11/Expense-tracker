const mongoose = require("mongoose");
const Expense = require("../models/expense.model");
const User = require("../models/users.models");
const Team = require("../models/team.model");

/**
 * Get team IDs the user belongs to (as leader or member)
 */
const getTeamIdsForUser = async (userId) => {
  const teamsAsLeader = await Team.find({ team_leader: userId }).select("_id");
  const teamsAsMember = await Team.find({ members: userId }).select("_id");
  const ids = new Set([
    ...teamsAsLeader.map((t) => t._id.toString()),
    ...teamsAsMember.map((t) => t._id.toString()),
  ]);
  return Array.from(ids);
};

/**
 * Check if user is the manager (team_leader) of the expense's team
 */
const isManagerOfExpenseTeam = async (expense, userId) => {
  if (!expense.team) return false;
  const team = await Team.findById(expense.team).select("team_leader");
  if (!team) return false;
  return team.team_leader && team.team_leader.toString() === userId.toString();
};

/**
 * Check if user can edit/delete expense: creator or manager of expense's team
 */
const canEditOrDeleteExpense = async (expense, userId) => {
  if (!expense || !userId) return false;
  const isCreator =
    expense.createdBy && expense.createdBy.toString() === userId.toString();
  if (isCreator) return true;
  return isManagerOfExpenseTeam(expense, userId);
};

const createExpense = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await User.findById(userId).select("active_team default_team");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { title, amount, category, description } = req.body;
    if (!title || amount == null || amount === "" || !category) {
      return res.status(400).json({
        message: "Title, amount and category are required",
      });
    }

    const team = user.active_team || user.default_team || null;
    const date = req.body.date ? new Date(req.body.date) : new Date();

    const expense = await Expense.create({
      title,
      amount: Number(amount),
      category,
      description: description || "",
      createdBy: userId,
      date,
      team,
    });

    const populated = await Expense.findById(expense._id)
      .populate("category", "name color")
      .populate("createdBy", "name username email")
      .lean();

    const response = {
      ...populated,
      created_at: populated.createdAt,
    };
    res
      .status(201)
      .json({ message: "Expense created successfully", expense: response });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create expense", error: error.message });
  }
};

/**
 * List expenses for the current user (expenses in user's teams or created by user).
 * Query: search (title/description), status (pending|approved|rejected)
 */
const listExpenses = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const teamIds = await getTeamIdsForUser(userId);
    const baseCondition = {
      $or: [
        { team: { $in: teamIds.map((id) => new mongoose.Types.ObjectId(id)) } },
        { createdBy: new mongoose.Types.ObjectId(userId) },
      ],
    };

    const andConditions = [baseCondition];
    const { search, status } = req.query;
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), "i");
      andConditions.push({
        $or: [
          { title: searchRegex },
          { description: searchRegex },
        ],
      });
    }
    if (status && ["pending", "approved", "rejected"].includes(status)) {
      andConditions.push({ status });
    }
    const query = andConditions.length > 1 ? { $and: andConditions } : baseCondition;

    const expenses = await Expense.find(query)
      .populate("category", "name color description")
      .populate("createdBy", "name username email")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    const list = expenses.map((e) => ({
      ...e,
      created_at: e.createdAt,
    }));

    res.status(200).json(list);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to list expenses", error: error.message });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate("category", "name color description")
      .populate("createdBy", "name username email")
      .lean();
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }
    const response = { ...expense, created_at: expense.createdAt };
    res.status(200).json(response);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get expense", error: error.message });
  }
};

const getExpensesByCategory = async (req, res) => {
  try {
    const expenses = await Expense.find({ category: req.params.categoryId })
      .populate("category", "name color")
      .populate("createdBy", "name username email")
      .sort({ date: -1 })
      .lean();
    const list = expenses.map((e) => ({ ...e, created_at: e.createdAt }));
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get expenses by category",
      error: error.message,
    });
  }
};

const getExpensesByUser = async (req, res) => {
  try {
    const expenses = await Expense.find({ createdBy: req.params.userId })
      .populate("category", "name color")
      .populate("createdBy", "name username email")
      .sort({ date: -1 })
      .lean();
    const list = expenses.map((e) => ({ ...e, created_at: e.createdAt }));
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get expenses by user",
      error: error.message,
    });
  }
};

const getExpensesByTeam = async (req, res) => {
  try {
    const expenses = await Expense.find({ team: req.params.teamId })
      .populate("category", "name color")
      .populate("createdBy", "name username email")
      .sort({ date: -1 })
      .lean();
    const list = expenses.map((e) => ({ ...e, created_at: e.createdAt }));
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({
      message: "Failed to get expenses by team",
      error: error.message,
    });
  }
};

/**
 * Approve or reject an expense. Only manager (team_leader) of the expense's team can call this.
 */
const approveOrRejectExpense = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({
        message: "status must be 'approved' or 'rejected'",
      });
    }

    const expense = await Expense.findById(id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const isManager = await isManagerOfExpenseTeam(expense, userId);
    if (!isManager) {
      return res.status(403).json({
        message: "Only the manager of the team can approve or reject this expense",
      });
    }

    expense.status = status;
    await expense.save();

    const updated = await Expense.findById(expense._id)
      .populate("category", "name color description")
      .populate("createdBy", "name username email")
      .lean();

    res.status(200).json({
      message: `Expense ${status} successfully`,
      expense: { ...updated, created_at: updated.createdAt },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update expense status",
      error: error.message,
    });
  }
};

/**
 * Update expense. Only creator or manager of expense's team can update.
 */
const updateExpense = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const allowed = await canEditOrDeleteExpense(expense, userId);
    if (!allowed) {
      return res.status(403).json({
        message: "Only the expense creator or team manager can edit this expense",
      });
    }

    const { title, amount, category, description, date } = req.body;
    const update = {};
    if (title !== undefined) update.title = title;
    if (amount !== undefined) update.amount = Number(amount);
    if (category !== undefined) update.category = category;
    if (description !== undefined) update.description = description;
    if (date !== undefined) update.date = new Date(date);

    const updated = await Expense.findByIdAndUpdate(
      req.params.id,
      update,
      { new: true },
    )
      .populate("category", "name color description")
      .populate("createdBy", "name username email")
      .lean();

    res.status(200).json({
      message: "Expense updated successfully",
      expense: { ...updated, created_at: updated.createdAt },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update expense", error: error.message });
  }
};

/**
 * Delete expense. Only creator or manager of expense's team can delete.
 */
const deleteExpense = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    const allowed = await canEditOrDeleteExpense(expense, userId);
    if (!allowed) {
      return res.status(403).json({
        message: "Only the expense creator or team manager can delete this expense",
      });
    }

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
  listExpenses,
  updateExpense,
  deleteExpense,
  approveOrRejectExpense,
  getExpensesByCategory,
  getExpensesByUser,
  getExpensesByTeam,
};
