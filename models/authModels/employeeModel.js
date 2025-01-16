import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const employeeSchema = Schema({
    name: {
        type: String,
        required: [true, 'Please add a name']
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password']
    },
    level: {
        type: String,
        enum: ['superAdmin', 'admin', 'employee'],
        required: [true, 'Please add a Level']
    },
    image: {
        type: String
    }
}, {
    timestamps: true
})

export default model('Employee', employeeSchema);
