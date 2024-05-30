const { catchRes, successRes, SwrRes } = require("../utils/response")

module.exports.createUser = async (req, res, next) => {
    let { firstName, lastName, email, password, mobile } = req.body

    try {

    } catch (error) {
        return catchRes(res, error)
    }

}