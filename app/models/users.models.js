const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role:{
        type: String,
        enum: ['admin', 'user', 'manager'],
        default: 'user'
    },
    invitation:{
        type:String,
        enum:['pending', 'accepted', 'rejected'],
        required:false
    },
    invitedBy:{
        type:String,
        required:false
    }
}, { timestamps: true });



module.exports = mongoose.model('User', userSchema);

