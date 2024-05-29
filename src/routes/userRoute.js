const express = require('express');
const controller = require('../controllers/indexController');
const router = express.Router();


router.get('/create-user', controller.userController.createUser)

module.exports = router