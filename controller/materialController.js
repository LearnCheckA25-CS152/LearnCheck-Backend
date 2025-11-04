import axios from 'axios';

export const getMaterialById = async (req, res) => {
    const {tutorialId} = req.params;

    try {
        const baseUrl = process.env.MOCK_API_BASE_URL;
        const response = await axios.get(`${baseUrl}/tutorials/${tutorialId}`);
        const htmlString = response.data;

        //use regex to find all <title> tags in the HTML.
        const titleMatch = htmlString.match(/<title>([^<]+)<\/title>/g);
        let title = `Material id ${tutorialId}`; //fallback title in case extraction fails

        if (titleMatch && titleMatch.length > 0) {
            //select the last match in the array
            const fullTitle = titleMatch[titleMatch.length - 1]
                                .replace('<title>', '')
                                .replace('</title>', '')
                                .trim();
            
            //split and take the first part to remove course (example, " -Belajar Dasar AI")
            title = fullTitle.split(' - ')[0]; 
        }

        const materialData = {
            id: tutorialId,
            title: title,
            content: htmlString,
            source: 'Mock API Dicoding'
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