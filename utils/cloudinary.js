// cloudinary.js
const { v2: cloudinary } = require("cloudinary");
const { Readable } = require("stream");

// 1. config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2.function to upload
const cloudinaryUploadImage = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { resource_type: "image", folder: "images" },
      (err, result) => (err ? reject(err) : resolve(result))
    );
    Readable.from(buffer).pipe(uploadStream);
  });
};

// 3. function to delete
const cloudinaryDeleteImage = async (publicId) => {
  try {
    return await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    throw err;
  }
};

module.exports = {
  cloudinaryUploadImage,
  cloudinaryDeleteImage,
};
