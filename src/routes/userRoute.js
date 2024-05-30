const express = require('express');
const controller = require('../controllers/indexController');
const validateUser = require('../middlewares/userValidation');
const { verifyUserToken } = require('../middlewares/authMiddleware');
const router = express.Router();


router.post('/create-user', validateUser, controller.userController.createUser)
router.post('/login-user', controller.userController.loginUser)
router.get('/user-profile', verifyUserToken, controller.userController.showUserProfile)
router.put('/verify-user', controller.userController.verifyUser)

module.exports = router