const Joi = require('joi');

const userSignupSchema = Joi.object({
    firstName: Joi.string().trim().min(2).max(30).required().messages({
        'string.empty': 'First name is required',
        'string.min': 'First name should have a minimum length of 2',
        'string.max': 'First name should have a maximum length of 30',
    }),
    lastName: Joi.string().trim().min(2).max(30).required().messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name should have a minimum length of 2',
        'string.max': 'Last name should have a maximum length of 30',
    }),
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
    }),
    password: Joi.string().trim().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"|,.<>/?]).{8,}$')).required().messages({
        'string.empty': 'Password is required',
        'string.pattern.base': 'Password must have at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long',
    }),
    mobile: Joi.string().trim().pattern(new RegExp('^[0-9]{10}$')).required().messages({
        'string.empty': 'Mobile number is required',
        'string.pattern.base': 'Mobile number must be a 10-digit number',
    }),
    avatar: Joi.string().trim(),
});

const userLoginSchema = Joi.object({
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
    }),
    password: Joi.string().trim().required().messages({
        'string.empty': 'Password is required',
    }),
});

const userEditSchema = Joi.object({
    firstName: Joi.string().trim().min(2).max(30).required().messages({
        'string.empty': 'First name is required',
        'string.min': 'First name should have a minimum length of 2',
        'string.max': 'First name should have a maximum length of 30',
    }),
    lastName: Joi.string().trim().min(2).max(30).required().messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name should have a minimum length of 2',
        'string.max': 'Last name should have a maximum length of 30',
    }),
    mobile: Joi.string().trim().pattern(new RegExp('^[0-9]{10}$')).required().messages({
        'string.empty': 'Mobile number is required',
        'string.pattern.base': 'Mobile number must be a 10-digit number',
    }),
});

const forgetPasswordSchema = Joi.object({
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
    })
});

const userChangePasswordSchema = Joi.object({
    oldPassword: Joi.string().trim().required().messages({
        'string.empty': 'Old Password is required',
    }),
    newPassword: Joi.string().trim().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"|,.<>/?]).{8,}$')).required().messages({
        'string.empty': 'New Password is required',
        'string.pattern.base': 'Password must have at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long',
    }),
});

const userResetPasswordSchema = Joi.object({
    newPassword: Joi.string().trim().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"|,.<>/?]).{8,}$')).required().messages({
        'string.empty': 'New Password is required',
        'string.pattern.base': 'Password must have at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long',
    }),
    resetToken: Joi.string().trim().required()
});

const userFeedbackValidation = Joi.object({
    name: Joi.string().trim().required().messages({
        'string.empty': 'Name is required',
    }),
    email: Joi.string().trim().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Email must be a valid email address',
    }),
    subject: Joi.string().trim().required().messages({
        'string.empty': 'Subject is required',
    }),
    message: Joi.string().trim().required().messages({
        'string.empty': 'Message is required',
    })
});

const validate = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(', ');
            return res.status(400).json({ success: false, message: errorMessage });
        }
        next();
    };
};


module.exports = {
    userSignupSchema,
    userLoginSchema,
    userEditSchema,
    userChangePasswordSchema,
    forgetPasswordSchema,
    userResetPasswordSchema,
    userFeedbackValidation,
    validate
};
