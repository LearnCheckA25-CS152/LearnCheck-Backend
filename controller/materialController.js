import axios from 'axios';

export async function _fetchMaterialById(tutorialId) {
  const baseUrl = process.env.MOCK_API_BASE_URL;

  try {
    const response = await axios.get(`${baseUrl}/api/tutorials/${tutorialId}`, {
      timeout: 15000,
    });

    const content = response.data?.data?.content || '';
    const title = response.data?.data?.title || `Material id ${tutorialId}`;

    return { id: tutorialId, title, content };
  } catch (err) {
    if (err.response?.status === 404) {
      const error = new Error(`Material with id ${tutorialId} not found`);
      error.status = 404;
      throw error;
    }

    console.error('Gagal memanggil Mock API Dicoding:', err.message);
    const error = new Error('Failed to retrieve data from Mock API Dicoding');
    error.status = 500;
    throw error;
  }
}

export const getMaterialById = async (req, res) => {
  const { tutorialId } = req.params;

  try {
    const materialData = await _fetchMaterialById(tutorialId);

    res.status(200).json({
      status: 'success',
      message: 'Successfully get material by Id',
      data: materialData,
    });
  } catch (err) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      status: statusCode === 404 ? 'fail' : 'error',
      message: err.message,
    });
  }
};
