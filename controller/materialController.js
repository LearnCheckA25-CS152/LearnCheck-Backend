import axios from 'axios';

export const getMaterialById = async (req, res) => {
    const {tutorialId} = req.params;

    try {
        const baseUrl = process.env.MOCK_API_BASE_URL;
        const response = await axios.get(`${baseUrl}api/tutorials/${tutorialId}`);
      
        const materialData = {
            id: tutorialId,
            title: response.title || `Material id ${tutorialId}`, 
            content: response.data,
        };

        res.status(200).json({
            status: 'success',
            message: 'Successfully get material by Id',
            data: materialData,
        });
    } catch (err) { 
        if (err.response && err.response.status === 404) {
            return res.status(404).json({
                status: 'fail',
                message: `Material with id ${tutorialId} not found`,
            });
        }

        console.error('Gagal memanggil mock API: ', err.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve data from Mock API Dicoding',
        });
    }
}