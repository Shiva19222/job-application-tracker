const mongoose = require('mongoose');

// Define the schema for the Candidate model
const candidateSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    company: {
        type: String,
        required: true,
    },
    role: {
        type: String,
        required: true,
    },
    currentStage: {
        type: String,
        required: true,
        enum: ['Applied', 'Screening', 'Interview', 'Offer', 'Rejected'],
        default: 'Applied',
    },
    appliedDate: {
        type: Date,
        required: true,
    },
    // Adding the new fields for years of experience and resume link
    yearsOfExperience: {
        type: Number,
        required: false, // Make this optional in case some don't have this data
        default: 0,
    },
    resumeLink: {
        type: String,
        required: false,
    }
});

const Candidate = mongoose.model('Candidate', candidateSchema);

module.exports = Candidate;
