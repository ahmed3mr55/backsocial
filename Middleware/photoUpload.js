const path = require('path');
const multer = require('multer');


const photoStorage = multer.memoryStorage();

// Photo upload middleware
const photoUpload = multer({
    storage: photoStorage,
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image')) {
            cb(null, true);
        } else {
            cb({ message: 'Unsupported file format' }, false);
        }
    },
    limits: {
        fileSize: 1024 * 1024 * 5 // 5 MB 
    }
})

module.exports = photoUpload;