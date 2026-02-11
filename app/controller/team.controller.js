const mongoose = require('mongoose');
const { Resend } = require("resend");
const Team = require('../models/team.model');
const User = require('../models/users.models');

const resend = new Resend(process.env.RESEND_API_KEY);
const frontendAppUrl = process.env.FRONTEND_APP_URL?.trim() || 'http://localhost:5173';

const isAdminRole = (role) => {
    if (!role) {
        return false;
    }

    const normalized = role.toString().toUpperCase();
    return normalized === 'ADMIN' || normalized === 'SUPER_ADMIN';
};

const normalizeMonthlyBudget = (value) => {
    if (value === undefined || value === null || value === '') {
        return undefined;
    }

    const numeric = Number(value);

    if (!Number.isFinite(numeric) || numeric < 0) {
        throw new Error('INVALID_MONTHLY_BUDGET');
    }

    return numeric;
};

const createTeam = async (req, res) => {
    try {
        const { name, description, team_leader: explicitLeader, members = [], monthly_budget } = req.body || {};
        const requesterId = req.userId;

        if (!requesterId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const requester = await User.findById(requesterId).select('role');

        if (!requester) {
            return res.status(404).json({ message: 'Requesting user not found' });
        }

        //only admin can create team
        if (!isAdminRole(requester.role)) {
            return res.status(403).json({ message: 'Only admin can create team' });
        }

        if (!name) {
            return res.status(400).json({ message: 'Team name is required' });
        }

        const teamLeaderId = explicitLeader || requesterId;

        if (!mongoose.Types.ObjectId.isValid(teamLeaderId)) {
            return res.status(400).json({ message: 'Invalid team leader ID' });
        }

        let parsedMonthlyBudget;
        try {
            parsedMonthlyBudget = normalizeMonthlyBudget(monthly_budget);
        } catch (error) {
            if (error.message === 'INVALID_MONTHLY_BUDGET') {
                return res.status(400).json({ message: 'Monthly budget must be a non-negative number' });
            }
            throw error;
        }
        
        // Check if team with the same name already exists
        const existingTeam = await Team.findOne({ name });
        if(existingTeam){
            return res.status(400).json({ message: 'Team name already exists' });
        }

        if (!Array.isArray(members)) {
            return res.status(400).json({ message: 'Members must be an array when provided' });
        }

        const normalizedMembers = members;

        const teamData = {
            name,
            description,
            team_leader: teamLeaderId,
            members: normalizedMembers
        };

        if (parsedMonthlyBudget !== undefined) {
            teamData.monthly_budget = parsedMonthlyBudget;
            teamData.monthly_budget_remaining = parsedMonthlyBudget;
        }

        const team = await Team.create(teamData);
        
        // Populate leader and members with user details
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
            .populate('team_leader', 'name username email role')
            .populate('members', 'name username email role');
        res.status(200).json(team);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get team', error: error.message });
    }
}   

const getAllTeams = async (req, res) => {
    try {
        const teams = await Team.find()
            .populate('team_leader', 'name username email role')
            .populate('members', 'name username email role');
        res.status(200).json(teams);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get teams', error: error.message });
    }
}

const updateTeam = async (req, res) => {
    try {
        const { name, description, team_leader, members, monthly_budget } = req.body || {};
        const updatePayload = {};

        if (name !== undefined) {
            updatePayload.name = name;
        }

        if (description !== undefined) {
            updatePayload.description = description;
        }

        if (team_leader !== undefined) {
            if (team_leader && !mongoose.Types.ObjectId.isValid(team_leader)) {
                return res.status(400).json({ message: 'Invalid team leader ID' });
            }
            updatePayload.team_leader = team_leader;
        }

        if (members !== undefined) {
            if (!Array.isArray(members)) {
                return res.status(400).json({ message: 'Members must be an array when provided' });
            }
            updatePayload.members = members;
        }

        if (monthly_budget !== undefined) {
            let parsedMonthlyBudget;
            try {
                parsedMonthlyBudget = normalizeMonthlyBudget(monthly_budget);
            } catch (error) {
                if (error.message === 'INVALID_MONTHLY_BUDGET') {
                    return res.status(400).json({ message: 'Monthly budget must be a non-negative number' });
                }
                throw error;
            }
            updatePayload.monthly_budget = parsedMonthlyBudget;
            updatePayload.monthly_budget_remaining = parsedMonthlyBudget;
        }

        const team = await Team.findByIdAndUpdate(
            req.params.id, 
            updatePayload, 
            { new: true }
        )
        .populate('team_leader', 'name username email role')
        .populate('members', 'name username email role');
        res.status(200).json({ message: 'Team updated successfully', team: team });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update team', error: error.message });
    }
}

const inviteTeamMembers = async (req, res) => {
    try {
        const managerId = req.userId;
        const { id: teamId } = req.params;
        const { userIds } = req.body || {};

        if (!managerId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!mongoose.Types.ObjectId.isValid(teamId)) {
            return res.status(400).json({ message: 'Invalid team ID' });
        }

        if (!Array.isArray(userIds) || userIds.length === 0) {
            return res.status(400).json({ message: 'userIds array is required' });
        }

        const manager = await User.findById(managerId).select('name email role');
        if (!manager) {
            return res.status(404).json({ message: 'Requesting user not found' });
        }

        const team = await Team.findById(teamId)
            .populate('team_leader', 'name email');

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const leaderId = team.team_leader?._id
            ? team.team_leader._id.toString()
            : team.team_leader?.toString();

        if (leaderId !== managerId && !isAdminRole(manager.role)) {
            return res.status(403).json({ message: 'Only the team manager can invite members' });
        }

        const uniqueUserIds = [...new Set(userIds.map(id => id?.toString()))];
        const invited = [];
        const skipped = [];
        let membersUpdated = false;

        const existingMemberIds = new Set(team.members.map(memberId => memberId.toString()));

        for (const userId of uniqueUserIds) {
            if (!mongoose.Types.ObjectId.isValid(userId)) {
                skipped.push({ userId, reason: 'Invalid user ID' });
                continue;
            }

            const user = await User.findById(userId);

            if (!user) {
                skipped.push({ userId, reason: 'User not found' });
                continue;
            }

            const isAlreadyMember = existingMemberIds.has(user._id.toString()) || leaderId === user._id.toString();

            if (isAlreadyMember) {
                skipped.push({ userId: user._id.toString(), reason: 'User already part of the team' });
                continue;
            }

            const inviteLink = `${frontendAppUrl}/teams/${team._id.toString()}`;
            const inviterName = manager.name || 'Team Manager';

            try {
                await resend.emails.send({
                    from: 'team@aictum.com',
                    to: user.email,
                    subject: `You've been invited to join ${team.name}`,
                    html: `
                        <div>
                            <p>Hi ${user.name || 'there'},</p>
                            <p>${inviterName} has invited you to join the <strong>${team.name}</strong> team.</p>
                            <p>Visit your dashboard to review and start collaborating:</p>
                            <p><a href="${inviteLink}">${inviteLink}</a></p>
                            <p>If you weren't expecting this, feel free to ignore this email.</p>
                        </div>
                    `
                });
            } catch (emailError) {
                skipped.push({
                    userId: user._id.toString(),
                    reason: `Failed to send invite email: ${emailError.message}`
                });
                continue;
            }

            user.status = 'pending';
            if (user.invitation !== 'accepted') {
                user.invitation = 'pending';
            }
            user.invitedBy = managerId;
            await user.save();

            team.members.push(user._id);
            existingMemberIds.add(user._id.toString());
            membersUpdated = true;

            invited.push({
                userId: user._id.toString(),
                email: user.email
            });
        }

        if (membersUpdated) {
            await team.save();
        }

        return res.status(200).json({
            message: 'Team invitations processed',
            invited,
            skipped
        });
    } catch (error) {
        console.error('Invite team members error:', error);
        return res.status(500).json({ message: 'Failed to invite team members', error: error.message });
    }
};

const removeTeamMember = async (req, res) => {
    try {
        const requesterId = req.userId;
        const { id: teamId, memberId } = req.params;

        if (!requesterId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!mongoose.Types.ObjectId.isValid(teamId) || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Invalid team or member ID' });
        }

        const requester = await User.findById(requesterId).select('role name email');

        if (!requester) {
            return res.status(404).json({ message: 'Requesting user not found' });
        }

        const team = await Team.findById(teamId);

        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const leaderId = team.team_leader?._id
            ? team.team_leader._id.toString()
            : team.team_leader?.toString();

        const isRequesterAdmin = isAdminRole(requester.role);
        const isRequesterManager = leaderId === requesterId;

        if (!isRequesterAdmin && !isRequesterManager) {
            return res.status(403).json({ message: 'Only admin or the team manager can remove members' });
        }

        const teamMembersArray = Array.isArray(team.members) ? team.members : [];
        const teamMemberIds = teamMembersArray.map(member => member.toString());

        const isMemberOfTeam = teamMemberIds.includes(memberId);

        if (!isMemberOfTeam && memberId !== leaderId) {
            return res.status(404).json({ message: 'User is not a member of this team' });
        }

        const member = await User.findById(memberId).select('member_type role default_team active_team');

        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        if (!isRequesterAdmin) {
            if (member.member_type === 'MANAGER') {
                return res.status(403).json({ message: 'Managers can only be removed by an admin' });
            }

            if (memberId === leaderId) {
                return res.status(403).json({ message: 'Team manager cannot remove themselves. Contact an admin.' });
            }
        }

        if (memberId === leaderId) {
            // Admin removing the team manager - clear manager assignment
            team.team_leader = null;
        }

        const originalMemberCount = teamMembersArray.length;
        const filteredMembers = teamMembersArray.filter(member => member.toString() !== memberId);
        const removedFromMembers = filteredMembers.length !== originalMemberCount;
        team.members = filteredMembers;

        if (!removedFromMembers && memberId !== leaderId) {
            return res.status(404).json({ message: 'Member is not part of the team' });
        }

        let userUpdated = false;

        if (member.default_team && member.default_team.toString() === teamId) {
            member.default_team = null;
            userUpdated = true;
        }

        if (member.active_team && member.active_team.toString() === teamId) {
            member.active_team = null;
            userUpdated = true;
        }

        if (userUpdated) {
            await member.save();
        }

        await team.save();

        return res.status(200).json({
            message: 'Member removed from the team successfully',
            teamId: team._id.toString(),
            removedMemberId: memberId
        });
    } catch (error) {
        console.error('Remove team member error:', error);
        return res.status(500).json({ message: 'Failed to remove team member', error: error.message });
    }
};

const updateTeamMemberRole = async (req, res) => {
    try {
        const requesterId = req.userId;
        const { id: teamId, memberId } = req.params;
        const { role } = req.body || {};

        if (!requesterId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        if (!mongoose.Types.ObjectId.isValid(teamId) || !mongoose.Types.ObjectId.isValid(memberId)) {
            return res.status(400).json({ message: 'Invalid team or member ID' });
        }

        if (!role) {
            return res.status(400).json({ message: 'Role is required' });
        }

        const normalizedRole = role.toString().toUpperCase();
        if (!['MANAGER', 'MEMBER'].includes(normalizedRole)) {
            return res.status(400).json({ message: 'Role must be either MANAGER or MEMBER' });
        }

        const team = await Team.findById(teamId);
        if (!team) {
            return res.status(404).json({ message: 'Team not found' });
        }

        const leaderId = team.team_leader?._id
            ? team.team_leader._id.toString()
            : team.team_leader?.toString();

        if (leaderId !== requesterId) {
            return res.status(403).json({ message: 'Only the team manager can change member roles' });
        }

        const member = await User.findById(memberId);
        if (!member) {
            return res.status(404).json({ message: 'Member not found' });
        }

        const teamMembersArray = Array.isArray(team.members) ? team.members : [];
        const teamMemberIds = teamMembersArray.map(member => member.toString());
        const isMemberOfTeam = teamMemberIds.includes(memberId) || memberId === leaderId;

        if (!isMemberOfTeam) {
            return res.status(404).json({ message: 'User is not a member of this team' });
        }

        if (member.member_type === normalizedRole) {
            return res.status(200).json({
                message: 'Member role is already up to date',
                memberId: member._id.toString(),
                role: member.member_type
            });
        }

        member.member_type = normalizedRole;
        await member.save();

        return res.status(200).json({
            message: 'Team member role updated successfully',
            memberId: member._id.toString(),
            role: member.member_type
        });
    } catch (error) {
        console.error('Update team member role error:', error);
        return res.status(500).json({ message: 'Failed to update team member role', error: error.message });
    }
};

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
module.exports = { createTeam, getTeamById, getAllTeams, updateTeam, inviteTeamMembers, removeTeamMember, updateTeamMemberRole, deleteTeam }