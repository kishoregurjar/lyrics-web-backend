const topChartModel = require("../models/topChartModel");
const { catchRes, successRes } = require("../utils/response");


//for both user and  admin
module.exports.getTopChartList = async (req, res) => {
    try {
        const topChart = await topChartModel.find().sort({
            createdAt: -1
        })

        if (topChart.length == 0) {
            return successRes(res, 200, false, "Empty Top Chart List", [])
        }
        return successRes(res, 200, true, "Top Chart List", topChart)
    } catch (error) {
        return catchRes(res, error)
    }
}

//for both user and admin
module.exports.topChartDetails = async (req, res) => {
    try {
        const chartId = req.query.chartId
        if (!chartId || chartId == undefined || chartId == null || chartId == '') {
            return successRes(res, 400, false, "Please Provide Chart Id")
        }
        const topChartDetails = await topChartModel.findById(chartId)
        if (!topChartDetails) {
            return successRes(res, 200, false, "Top Chart Not Found", [])
        }
        return successRes(res, 200, true, "Top Chart Details", topChartDetails)
    } catch (error) {
        return catchRes(res, error)
    }
}

//delete top Chart for admin
module.exports.deleteTopChart = async (req, res) => {
    try {
        const chartId = req.query.chartId
        if (!chartId || chartId == undefined || chartId == null || chartId == '') {
            return successRes(res, 400, false, "Please Provide Chart Id")
        }
        const deletTopChart = await topChartModel.findByIdAndDelete(chartId)
        if (!deletTopChart) {
            return catchRes(res, { message: "Something went wrong" })
        }
        else {
            return successRes(res, 200, true, "Top Chart Deleted successfully");
        }

    } catch (error) {
        return catchRes(res, error)
    }
}