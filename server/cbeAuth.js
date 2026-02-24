import dotenv from "dotenv";

dotenv.config();

const VERIFY_API_BASE = "https://verifyapi.leulzenebe.pro";
const API_KEY = process.env.VERIFIER_API_KEY;

const defaultHeaders = () => {
	if (!API_KEY) {
		throw new Error("VERIFIER_API_KEY env variable is missing");
	}

	return {
		"Content-Type": "application/json",
		"x-api-key": API_KEY,
	};
};

const request = async (path, payload) => {
	const response = await fetch(`${VERIFY_API_BASE}${path}`, {
		method: "POST",
		headers: defaultHeaders(),
		body: JSON.stringify(payload),
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Verifier API error (${response.status}): ${text}`);
	}

	return response.json();
};



export const verifyCbePayment = async ({ reference, accountSuffix }) => {
	if (!reference || !accountSuffix) {
		throw new Error("reference and accountSuffix are required");
	}

	return request("/verify-cbe", {
		reference,
		accountSuffix,
	});
};
