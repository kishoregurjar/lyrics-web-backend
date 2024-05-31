const express = require('express');
const controller = require('../controllers/indexController');
const { verifyUserToken } = require('../middlewares/authMiddleware');
const { validate, userSignupSchema, userLoginSchema, userEditSchema, userChangePasswordSchema, forgetPasswordSchema, userResetPasswordSchema } = require('../middlewares/userValidation');
const router = express.Router();



module.exports = validate;



router.post('/create-user', validate(userSignupSchema), controller.userController.createUser)
router.post('/login-user', validate(userLoginSchema), controller.userController.loginUser)
router.get('/user-profile', verifyUserToken, controller.userController.showUserProfile)
router.put('/verify-user', controller.userController.verifyUser)
router.put('/edit-user', validate(userEditSchema), verifyUserToken, controller.userController.editUserProfile)
router.put('/change-user-password', validate(userChangePasswordSchema), verifyUserToken, controller.userController.changePassword)
router.post('/forget-password', validate(forgetPasswordSchema), controller.userController.forgetPassword)
router.put('/reset-password', validate(userResetPasswordSchema), controller.userController.resetPassword)

module.exports = router