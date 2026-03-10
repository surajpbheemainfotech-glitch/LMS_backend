import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../../config/cloudinaryConfig.js";

const pdfFilter = (req, file, cb) => {
  const allowedTypes = ["application/pdf"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed"), false);
  }
};

export const createPdfUpload = (folderName, namePrefix) => {
  const storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      let baseName = file.originalname
        .replace(/\.[^/.]+$/, "")
        .replace(/[^a-zA-Z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");

      if (!baseName) {
        baseName = "pdf";
      }

      baseName = baseName.substring(0, 40);

      return {
        folder: folderName,
        resource_type: "raw",
        public_id: `${namePrefix}-${Date.now()}-${baseName}`,
        format: "pdf",
      };
    },
  });

  return multer({
    storage,
    fileFilter: pdfFilter,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  });
};