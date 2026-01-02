import axios from "axios"
import { tokenCache } from "../../../Auth/cache";

export const API_BASE_URL = "https://www.appv2.olyox.com/api/v1/new"

export const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 12000,
    headers: { "Content-Type": "application/json" },
})

// Optional: plug in token here. In a real app, resolve from secure store.
async function getAuthToken() {
    const token = await tokenCache.getToken("auth_token_db");

    return token // add your token retrieval here
}

api.interceptors.request.use(async (config) => {
    const token = await getAuthToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

api.interceptors.response.use(
    (res) => res,
    (err) => {
        console.log("API Error:", err?.message, err?.response?.data)
        // Silent handling: never throw UI errors; just return a structure the caller can interpret
        return Promise.resolve({
            data: { success: false, error: err?.message, status: err?.response?.status },
            __silent_error: true,
        })
    },
)
