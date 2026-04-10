import multer from "multer";
import CloudinaryStorage from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinary.config.js";

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
    params: async (req, file) => {

      let baseName = file.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (!baseName) baseName = "image";

      baseName = baseName.substring(0, 40);

      return {
        folder: folderName,
        resource_type: "image",
        public_id: `${namePrefix}-${Date.now()}-${baseName}`,
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
      };
    },
  });

  return multer({
    storage,
    fileFilter: imageFilter,
    limits: { fileSize: 5 * 1024 * 1024 }
  });
};