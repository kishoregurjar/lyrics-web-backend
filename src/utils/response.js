const successRes = (res, status, success, message, data) => {
    return res.status(status).json({
        success: success,
        status: status,
        message: message,
        data: data ? data : null
    })
}

const swrRes = (res) => {
    return res.status(400).json({
        success: false,
        message: 'Something Went Wrong'
    })
}

const catchRes = (res, error) => {
    return res.status(500).json({
        success: false,
        message: error.message
    })
}

module.exports = {
    successRes,
    swrRes,
    catchRes
}