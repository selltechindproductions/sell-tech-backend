const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

const createCloudinaryStorage = (folder) =>
  new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: `service-platform/${folder}`,
      resource_type: "auto", // image / gif / video
      public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
    }),
  });

const uploadSingle = (folder, fieldName = "file") =>
  multer({
    storage: createCloudinaryStorage(folder),
    limits: { fileSize: 50 * 1024 * 1024 }, // 10MB
  }).single(fieldName);

const uploadMultiple = (folder, fieldName, max = 5) =>
  multer({
    storage: createCloudinaryStorage(folder),
    limits: { fileSize: 50 * 1024 * 1024 },
  }).array(fieldName, max);

module.exports = {
  uploadSingle,
  uploadMultiple,
};
