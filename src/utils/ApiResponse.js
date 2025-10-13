// utils/ApiResponse.js
const statusCodes = Object.freeze({
  200: 'OK',
  201: 'Created',
  202: 'No Data Found',
  301: 'Moved Permanently',
  302: 'Found',
  304: 'Not Modified',
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Page Not Found',
  405: 'Method Not Allowed',
  408: 'Request Timeout',
  409: 'Conflict',
  410: 'Gone',
  415: 'Unsupported Media Type',
  422: 'Unprocessable Entity',
  // 429: "Too many API requests, please try again later.",
  500: 'Something Went Wrong',
  501: 'Not Implemented',
  502: 'Bad Gateway',
  503: 'Service Unavailable',
  504: 'Gateway Timeout',
  505: 'HTTP Version Not Supported',

  // Custom App-Specific Codes
  1001: 'Plan Expired',
  1002: 'Invalid Request',
});

class ApiResponse {
  constructor(statusCode, data, message = null) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message || statusCodes[statusCode] || 'Unknown status';
    this.success = statusCode < 400;
  }
}

export { ApiResponse, statusCodes };
