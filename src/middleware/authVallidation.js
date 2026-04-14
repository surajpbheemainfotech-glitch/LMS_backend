import Joi from "joi";

export const signupValidation = (req, res, next) => {

  const schema = Joi.object({

    first_name: Joi.string()
      .trim()
      .pattern(/^[A-Za-z]+$/)
      .min(2)
      .max(50)
      .required()
      .messages({
        "string.pattern.base": "First name must contain only letters",
      }),

    last_name: Joi.string()
      .trim()
      .pattern(/^[A-Za-z]+$/)
      .min(2)
      .max(50)
      .required()
      .messages({
        "string.pattern.base": "Last name must contain only letters",
      }),

    mobile: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "string.pattern.base": "Mobile must be valid 10-digit Indian number",
      }),

    email: Joi.string()
      .trim()
      .email({ tlds: { allow: false } })
      .lowercase()
      .required(),

    role: Joi.string()
      .valid("user", "admin", "intern", "super admin", "teacher", "corporate")
      .default("user")
      .messages({
        "any.only":
          "Role must be one of user, admin, intern, super admin, teacher, corporate",
      }),

    // COMPANY FIELDS (only required if role = corporate)
company_name: Joi.string()
  .trim()
  .min(2)
  .max(100)
  .when("role", {
    is: "corporate",
    then: Joi.required(),
    otherwise: Joi.allow("").optional(),
  }),

industry: Joi.string()
  .trim()
  .min(2)
  .max(100)
  .when("role", {
    is: "corporate",
    then: Joi.required(),
    otherwise: Joi.allow("").optional(),
  }),

location: Joi.string()
  .trim()
  .min(2)
  .max(200)
  .when("role", {
    is: "corporate",
    then: Joi.required(),
    otherwise: Joi.allow("").optional(),
  }),
  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map((err) => err.message),
    });
  }

  next();
};

export const loginValidation = (req, res, next) => {

  const schema = Joi.object({

    email: Joi.string()
      .trim()
      .email({ tlds: { allow: false } })
      .lowercase()
      .required()
      .messages({
        "string.email": "Please enter a valid email",
        "any.required": "Email is required"
      }),

    password: Joi.string()
      .min(6)
      .required()
      .messages({
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required"
      }),

      role: Joi.string()
      .valid("user", "admin", "student", "super admin", "teacher", "corporate")
      .default("user")
      .messages({
        "any.only":
          "Role must be one of user, admin, intern, super admin, teacher, corporate",
      }),


  });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map(err => err.message),
    });
  }

  next();
};

export const studentValidation = (req, res, next) =>{
   const schema = Joi.object({

    first_name: Joi.string()
      .trim()
      .pattern(/^[A-Za-z]+$/)
      .min(2)
      .max(50)
      .required()
      .messages({
        "string.pattern.base": "First name must contain only letters",
      }),

    last_name: Joi.string()
      .trim()
      .pattern(/^[A-Za-z]+$/)
      .min(2)
      .max(50)
      .required()
      .messages({
        "string.pattern.base": "Last name must contain only letters",
      }),

    mobile: Joi.string()
      .trim()
      .pattern(/^[6-9]\d{9}$/)
      .required()
      .messages({
        "string.pattern.base": "Mobile must be valid 10-digit Indian number",
      }),

    email: Joi.string()
      .trim()
      .email({ tlds: { allow: false } })
      .lowercase()
      .required(),

      password: Joi.string()
      .min(6)
      .required()
      .messages({
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required"
      }),

    });

  const { error } = schema.validate(req.body, { abortEarly: false });

  if (error) {
    return res.status(400).json({
      success: false,
      errors: error.details.map((err) => err.message),
    });
  }

  next();
}