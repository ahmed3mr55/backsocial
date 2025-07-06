const mongoose = require('mongoose');

const replyCommentSchema = new mongoose.Schema({
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment',
        required: true,
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    body: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    }, {
    timestamps: true,
});

const ReplyComment = mongoose.model('ReplyComment', replyCommentSchema);
module.exports = { ReplyComment };