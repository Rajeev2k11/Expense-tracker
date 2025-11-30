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
    },
    inviteToken:{
        type:String,
        required:false
    },
    inviteTokenExpiry:{
        type:Date,
        required:false
    },
    is_phone_number_verified:{
        type:Boolean,
        default:false
    },
    phone_number:{
        type:String,
        required:false
    },
    mfa_method:{
        type:String,
        enum:['TOTP', 'PASSKEY'],
        default:null
    },
    mfa_secret:{
        type:String,
        required:false
    },
    mfa_enabled:{
        type:Boolean,
        default:false
    },
    challengeId:{
        type:String,
        required:false
    },
    webauthn_challenge:{
        type:String,
        required:false
    },
    webauthn_credentials:{
        type:Array,
        default:[],
        required:false
    },
    status:{
        type:String,
        enum:['active', 'inactive', 'pending'],
        default:null
    },
    
}, { timestamps: true });



module.exports = mongoose.model('User', userSchema);

