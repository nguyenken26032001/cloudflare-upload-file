/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */
import { Hono } from 'hono';

const app = new Hono();

app.get('/', (c) => c.text('Hello from Hono on Cloudflare Workers!'));
app.get('/hello', (c) => c.text('HELLO WORLD!'));

app.post('/upload', async (c) => {
	try {
		const formData = await c.req.formData();
		const file = formData.get('file');

		if (!file) {
			return c.text('No file uploaded', 400);
		}

		const objectKey = normalizeString(file.name); // Sử dụng tên file làm key trong bucket
		const fileContent = await file.arrayBuffer(); // Đọc nội dung file

		// Upload file lên R2
		const dataUpload = await c.env.store_file.put(objectKey, fileContent, {
			httpMetadata: { contentType: file.type }, // Đặt Content-Type của file
		});
		if (dataUpload.key) {
			return c.json(
				{ success: true, message: 'File uploaded successfully!', link: `${c.env.URL_DOWNLOAD}/${dataUpload.key}`, dataUpload },
				200
			);
		}
		return c.json({ success: false, message: 'upload failed', dataUpload }, 200);
	} catch (error) {
		return c.text(`Error: ${error.message}`, 500);
	}
});

function normalizeString(input) {
	let string = input.toLowerCase();
	const lastDotIndex = input.lastIndexOf('.');
	lastDotIndex !== -1 ? (string = string.slice(0, lastDotIndex)) : string;
	string = string.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
	string = string.replace(/\s+/g, '');
	const timestamp = Date.now();
	return `${string}-${timestamp}`;
}

export default {
	fetch: app.fetch,
};
