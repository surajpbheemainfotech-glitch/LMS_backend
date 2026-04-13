import db from "../config/db.config.js";
import { error, success } from "../utils/response.js";
import logger from "../utils/logger.js";

export const getAllUser = async (req, res) => {
  try {
    const [users] = await db.execute(`
      SELECT 
        u.id, u.first_name, u.last_name, u.mobile, u.email, u.password,
        r.role_name AS role, r.description AS role_description,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE r.role_name != 'super admin'
    `);

    if (!users.length) return error(res, "Users are not available.", 400);

    logger.info({ count: users.length }, "Fetched all users");
    return success(res, { users }, 200);

  } catch (err) {
    logger.error(err, "Fetching all users failed");
    return error(res, "Internal server error!", 500);
  }
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  if (!id) return error(res, "Login please.", 404);

  try {
    const [user] = await db.execute("SELECT first_name, last_name, mobile, email FROM users WHERE id = ?", [id]);
    if (!user.length) return error(res, "User not found.", 404);

    logger.info({ userId: id }, "Fetched user by ID");
    return success(res, { user: user[0] }, 200);

  } catch (err) {
    logger.error(err, "Fetching user by ID failed");
    return error(res, "Internal server error.", 500);
  }
};


