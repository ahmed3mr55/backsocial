const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
    name: { type: String, required: true },
    url: { type: String, required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now }
})

const Link = mongoose.model('Link', linkSchema);
module.exports = { Link };