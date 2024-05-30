const express = require('express');
const controller = require('../controllers/indexController');
const validateUser = require('../middlewares/userValidation');
const router = express.Router();


router.post('/create-user', validateUser, controller.userController.createUser)
router.post('/login-user', controller.userController.loginUser)

module.exports = router