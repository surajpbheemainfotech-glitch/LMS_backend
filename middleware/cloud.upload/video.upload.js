import  multer from"multer";
import  { CloudinaryStorage } from"multer-storage-cloudinary";
import cloudinary from '../../config/cloudinaryConfig.js'

export const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    "video/mp4",
    "video/x-matroska",
    "video/x-msvideo",
    "video/quicktime",
    "video/webm"
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only video files allowed"), false);
  }
};

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "LMS_PROJECT/videos",
    resource_type: "video",
    public_id: `${Date.now()}-${file.originalname.split(".")[0]}`,
  }),
});

export const videoUpload = multer({
  storage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 500 * 1024 * 1024,
  },
});

