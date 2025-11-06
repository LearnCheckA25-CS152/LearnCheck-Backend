import axios from 'axios';

export const getUserPreferenceById = async (req, res) => {
    const {userId} = req.params;

    try {
        const baseUrl = process.env.MOCK_API_BASE_URL;
        const response = await axios.get(`${baseUrl}/users/${userId}/preferences`);
        const preferencesData = response.data;

        res.status(200).json({
            status: 'success',
            message: 'Successfully get user preferences by Id',
            data: preferencesData,
        });
    } catch (err) { 
        if (err.response && err.response.status === 404) {
            return res.status(404).json({
                status: 'fail',
                message: `User with id ${userId} not found`,
            });
        }
        console.error('Gagal memanggil mock API: ', err.message);
        res.status(500).json({
            status: 'error',
            message: 'Failed to retrieve data from Mock API Dicoding',
        });
    }
}