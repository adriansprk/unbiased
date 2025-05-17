import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import sharp from 'sharp';
import imageProxyHandler from '../../api/routes/imageProxy';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as unknown as {
    get: ReturnType<typeof vi.fn>;
    isAxiosError: (error: any) => boolean;
};

// Mock sharp
vi.mock('sharp', () => {
    return {
        default: vi.fn(() => ({
            resize: vi.fn().mockReturnThis(),
            webp: vi.fn().mockReturnThis(),
            toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image-data'))
        }))
    };
});

// Mock logger to prevent console output during tests
vi.mock('../../lib/logger', () => ({
    default: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

describe('Image Proxy Endpoint', () => {
    let req: any;
    let res: any;

    beforeEach(() => {
        // Reset mock response and request
        req = {
            query: {} as any
        };

        res = {
            status: vi.fn().mockReturnThis(),
            json: vi.fn().mockReturnThis(),
            setHeader: vi.fn(),
            send: vi.fn()
        };

        // Reset mocks
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    it('should return 400 if no URL is provided', async () => {
        await imageProxyHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'MISSING_URL'
            })
        }));
    });

    it('should return 400 if an invalid URL is provided', async () => {
        req.query.url = 'not-a-valid-url';

        await imageProxyHandler(req, res);

        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'INVALID_URL'
            })
        }));
    });

    it('should return 400 if content type is not an image', async () => {
        req.query.url = 'https://example.com/not-an-image.html';

        // Mock axios to return a non-image content type
        mockedAxios.get.mockResolvedValueOnce({
            data: Buffer.from('not-an-image'),
            headers: {
                'content-type': 'text/html'
            }
        });

        await imageProxyHandler(req, res);

        expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('https://example.com/not-an-image.html'), expect.any(Object));
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: 'NOT_AN_IMAGE'
            })
        }));
    });

    it('should process and return image with appropriate headers', async () => {
        req.query.url = 'https://example.com/valid-image.jpg';

        // Mock axios to return a valid image
        mockedAxios.get.mockResolvedValueOnce({
            data: Buffer.from('image-data'),
            headers: {
                'content-type': 'image/jpeg'
            }
        });

        await imageProxyHandler(req, res);

        expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('https://example.com/valid-image.jpg'), expect.any(Object));
        expect(sharp).toHaveBeenCalledWith(expect.any(Buffer));
        expect(res.setHeader).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalled();
    });

    it('should return original image if sharp processing fails', async () => {
        req.query.url = 'https://example.com/valid-image.jpg';

        // Mock axios to return a valid image
        mockedAxios.get.mockResolvedValueOnce({
            data: Buffer.from('image-data'),
            headers: {
                'content-type': 'image/jpeg'
            }
        });

        // Mock sharp to throw an error
        vi.mocked(sharp).mockImplementationOnce(() => {
            throw new Error('Sharp processing error');
        });

        await imageProxyHandler(req, res);

        expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('https://example.com/valid-image.jpg'), expect.any(Object));
        expect(res.setHeader).toHaveBeenCalled();
        expect(res.send).toHaveBeenCalled();
    });

    it('should handle external image URL errors', async () => {
        req.query.url = 'https://example.com/not-found-image.jpg';

        // Mock axios to throw a 404 error
        const error: any = new Error('Not found');
        error.isAxiosError = true;
        error.response = { status: 404 };
        mockedAxios.get.mockRejectedValueOnce(error);

        await imageProxyHandler(req, res);

        expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('https://example.com/not-found-image.jpg'), expect.any(Object));
        expect(res.status).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false,
            error: expect.objectContaining({
                code: expect.any(String)
            })
        }));
    });

    it('should handle timeout errors', async () => {
        req.query.url = 'https://example.com/timeout-image.jpg';

        // Mock axios to throw a timeout error
        const error: any = new Error('Timeout');
        error.isAxiosError = true;
        error.code = 'ECONNABORTED';
        mockedAxios.get.mockRejectedValueOnce(error);

        await imageProxyHandler(req, res);

        expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining('https://example.com/timeout-image.jpg'), expect.any(Object));
        expect(res.status).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: false
        }));
    });
}); 