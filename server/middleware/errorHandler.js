const errorHandler = (err, req, res, next) => {
  // Log detailed error information
  console.error('Error occurred:', {
    type: err.type,
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    headers: req.headers,
    body: req.body,
    file: req.file
  });

  // Handle specific error types
  if (err.type === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      details: err.details || err.message,
      path: req.path
    });
  }

  if (err.type === 'FileProcessingError') {
    return res.status(422).json({
      error: 'File Processing Error',
      details: err.message,
      path: req.path
    });
  }

  if (err.type === 'NotFoundError') {
    return res.status(404).json({
      error: 'Not Found',
      details: err.message,
      path: req.path
    });
  }

  // Handle multer errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      error: 'File Upload Error',
      details: err.message,
      code: err.code,
      field: err.field
    });
  }

  // Default error
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    path: req.path,
    requestId: req.id,
    timestamp: new Date().toISOString()
  });
};

module.exports = errorHandler;
