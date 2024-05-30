const { body } = require('express-validator');
const Joi = require('joi');

const userSchema = Joi.object({
    firstName: Joi.string().min(2).max(30).required().messages({
        'string.empty': 'First name is required',
        'string.min': 'First name should have a minimum length of 2',
        'string.max': 'First name should have a maximum length of 30',
    }),
    lastName: Joi.string().min(2).max(30).required().messages({
        'string.empty': 'Last name is required',
        'string.min': 'Last name should have a minimum length of 2',
        'string.max': 'Last name should have a maximum length of 30',
    }),
    email: Joi.string().email().required().messages({
        'string.empty': 'Email is required',
        'string.email': 'Please enter a valid email address',
    }),
    password: Joi.string().pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[!@#$%^&*()_+\\-=[\\]{};:"|,.<>/?]).{8,}$')).required().messages({
        'string.empty': 'Password is required',
        'string.pattern.base': 'Password must have at least one uppercase letter, one lowercase letter, one digit, one special character, and be at least 8 characters long',
    }),
    mobile: Joi.string().pattern(new RegExp('^[0-9]{10}$')).required().messages({
        'string.empty': 'Mobile number is required',
        'string.pattern.base': 'Mobile number must be a 10-digit number',
    }),
});

const validateUser = (req, res, next) => {
    const { error } = userSchema.validate(req.body);
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(', ');
        return res.status(400).json({ success: false, message: errorMessage });
    }
    next();
};

module.exports = validateUser;
