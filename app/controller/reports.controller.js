const Reports = require('../models/reports.model');

const createReport = async (req, res) => {
    try {
        const { team, category, totalAmount, periodStart, periodEnd } = req.body;
        const report = await Reports.create({ team, category, totalAmount, periodStart, periodEnd });
        res.status(201).json({ message: 'Report created successfully', report: report });
    } catch (error) {
        res.status(500).json({ message: 'Failed to create report', error: error.message });
    }
}

const getReportById = async (req, res) => {
    try {
        const report = await Reports.findById(req.params.id);
        res.status(200).json(report);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get report', error: error.message });
    }
}

const getAllReports = async (req, res) => {
    try {
        const reports = await Reports.find();
        res.status(200).json(reports);
    } catch (error) {
        res.status(500).json({ message: 'Failed to get reports', error: error.message });
    }
}

const updateReport = async (req, res) => {
    try {
        const { team, category, totalAmount, periodStart, periodEnd } = req.body;
        const report = await Reports.findByIdAndUpdate(req.params.id, { team, category, totalAmount, periodStart, periodEnd }, { new: true });
        res.status(200).json({ message: 'Report updated successfully', report: report });
    } catch (error) {
        res.status(500).json({ message: 'Failed to update report', error: error.message });
    }
}

const deleteReport = async (req, res) => {
    try {
        await Reports.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Report deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete report', error: error.message });
    }
}

module.exports = { createReport, getReportById, getAllReports, updateReport, deleteReport }   