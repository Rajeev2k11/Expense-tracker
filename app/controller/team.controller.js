const Team = require('../models/team.model');

const createTeam = async (req, res) => {
    try {
        const { name, monthly_budget, description,  members } = req.body;

        //only admin can create team
        if(req.user.role !== 'admin'){
            return res.status(403).json({ message: 'Only admin can create team' });
        }
        
        // Check if team with the same name already exists
        const existingTeam = await Team.findOne({ name });
        if(existingTeam){
            return res.status(400).json({ message: 'Team name already exists' });
        }
        
        const team = await Team.create({ name, team_leader: req.user._id, members, monthly_budget, description });
        
        // Populate owner and members with user details
        await team.populate('team_leader', 'name username email role');
        await team.populate('members', 'name username email role');
        
        res.status(201).json({ message: 'Team created successfully', team: team });

    } catch (error) {
        res.status(500).json({ message: 'Failed to create team', error: error.message });
    }
}

const getTeamById = async (req, res) => {
    try {
        const team = await Team.findById(req.params.id)
            .populate('owner', 'name username email role')
            .populate('members', 'name username email role');
        res.status(200).json(team);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get team', error: error.message });
    }
}   

const getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('owner', 'name username email role')
            .populate('members', 'name username email role');
        res.status(200).json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get teams', error: error.message });
    }
}

const updateTeam = async (req, res) => {
    try {
        const { name, owner, members } = req.body;
        //if name and owner and members are same as existing team, return error
        const existingTeam = await Team.findOne({ name, owner, members });
        if(existingTeam){
            return res.status(400).json({ message: 'Team name, owner and members are same as existing team' });
        }
        const team = await Team.findByIdAndUpdate(
            req.params.id, 
            { name, owner, members }, 
            { new: true }
        )
        .populate('owner', 'name username email role')
        .populate('members', 'name username email role');
        res.status(200).json({ message: 'Team updated successfully', team: team });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update team', error: error.message });
    }
}

const deleteTeam = async (req, res) => {
    try {
        const team = await Team.findByIdAndDelete(req.params.id);
        
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }
        
        res.status(200).json({ message: 'Team deleted successfully', deletedTeam: team });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete team', error: error.message });
    }
}
module.exports = { createTeam, getTeamById, getAllTeams, updateTeam, deleteTeam }