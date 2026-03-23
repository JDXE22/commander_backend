/**
 * @desc    Health check — confirms the service is running
 * @route   GET /
 */
export const getHealth = (req, res) => {
  res.status(200).json({ status: 'ok' });
};
