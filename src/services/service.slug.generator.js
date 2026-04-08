import slugify from "slugify";

export const createSlug = (lastName) => {
  const baseSlug = slugify(lastName, {
    lower: true,
    strict: true, // removes special characters
    trim: true,
  });

  const now = new Date();

  const datetime =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    "-" +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");

  return `${baseSlug}-${datetime}`;
};

export const generateApplicationSlug = (
  applicationType,
  userId,
  jobId
) => {
  return slugify(`application-${applicationType}-${userId}-${jobId}`, {
    lower: true,
    strict: true
  });
};