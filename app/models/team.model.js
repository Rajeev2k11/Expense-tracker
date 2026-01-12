const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    team_leader: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    members: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    monthly_budget: {
        type: Number,
        required: false
    },
    monthly_budget_remaining: {
        type: Number,
        required: false
    }
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;