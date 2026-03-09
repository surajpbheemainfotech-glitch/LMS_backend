import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinaryConfig.js";

const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files allowed"), false);
  }
};

export const createImageUpload = (folderName, namePrefix) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: folderName,
      resource_type: "image",
      public_id: `${namePrefix}-${Date.now()}-${file.originalname.split(".")[0]}`,
    }),
  });
 
  return multer({
    storage,
    fileFilter: imageFilter,
    limits: {
      fileSize: 5 * 1024 * 1024,
    },
  });
};