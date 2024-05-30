const express = require('express');
const controller = require('../controllers/indexController');
const { verifyUserToken } = require('../middlewares/authMiddleware');
const { validate, userSignupSchema, userLoginSchema, userEditSchema } = require('../middlewares/userValidation');
const router = express.Router();



module.exports = validate;



router.post('/create-user', validate(userSignupSchema), controller.userController.createUser)
router.post('/login-user', validate(userLoginSchema), controller.userController.loginUser)
router.get('/user-profile', verifyUserToken, controller.userController.showUserProfile)
router.put('/verify-user', controller.userController.verifyUser)
router.put('/edit-user', validate(userEditSchema), verifyUserToken, controller.userController.editUserProfile)

module.exports = router