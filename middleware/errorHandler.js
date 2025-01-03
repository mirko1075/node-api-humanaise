export const errorHandler = (err, req, res,) => {
  console.error(err.stack); // Log the error stack trace
  res.status(500).json({ error: 'Something went wrong!' }); // Send a 500 response
};