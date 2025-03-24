// utils/responseHelper.js

export const formatErrorResponse = (message, data = null) => ({
    success: false,
    message,
    data,
  });
  
  export const formatSuccessResponse = (message, data = null) => ({
    success: true,
    message,
    data,
  });
  