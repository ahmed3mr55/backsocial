const { ViewerHistory } = require("../models/ViewerHistory");

async function createViewerHistory(user, searchUser) {
    try {
        if (user === searchUser._id) return;
        const existsViewer = await ViewerHistory.exists({
            user: user,
            targetUser: searchUser._id,
        })
        if (!existsViewer) {
            const viewerHistory = new ViewerHistory({
                user: user,
                targetUser: searchUser._id,
            });
            await viewerHistory.save();
        }
    } catch (error) {
        throw error;
    }
}

module.exports = { createViewerHistory };