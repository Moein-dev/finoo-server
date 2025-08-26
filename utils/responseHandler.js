function sendSuccessResponse(res, data, links = null, meta = null) {
  const response = { status: 200, data, links, meta };
  if (!links || Object.keys(links).length === 0) delete response.links;
  if (!meta || Object.keys(meta).length === 0) delete response.meta;
  return res.status(200).json(response);
}

function sendErrorResponse(res, statusCode, error, details = null) {
  console.error(`❌ Error ${statusCode}:`, error);
  const response = {
    status: statusCode,
    error: error.message || error,
  };

  if (details) {
    response.details = details;
  }

  return res.status(statusCode).json(response);
}

module.exports = { sendSuccessResponse, sendErrorResponse };
