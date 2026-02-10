import axios from 'axios';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleUser {
    sub: string;         // Unique Google user ID
    name: string;
    given_name: string;
    family_name: string;
    picture: string;
    email: string;
    email_verified: boolean;
}

interface GoogleTokenResponse {
    access_token: string;
    expires_in: number;
    scope: string;
    token_type: string;
    id_token?: string;
}

export class GoogleService {
    /**
     * Generate Google OAuth authorization URL
     */
    static getAuthorizationUrl(state: string): string {
        const params = new URLSearchParams({
            client_id: env.GOOGLE_CLIENT_ID,
            redirect_uri: env.GOOGLE_CALLBACK_URL,
            response_type: 'code',
            scope: 'openid email profile',
            state,
            access_type: 'offline',
            prompt: 'consent',
        });

        return `${GOOGLE_AUTH_URL}?${params.toString()}`;
    }

    /**
     * Exchange authorization code for access token
     */
    static async exchangeCodeForToken(code: string): Promise<string> {
        try {
            const response = await axios.post<GoogleTokenResponse>(
                GOOGLE_TOKEN_URL,
                {
                    code,
                    client_id: env.GOOGLE_CLIENT_ID,
                    client_secret: env.GOOGLE_CLIENT_SECRET,
                    redirect_uri: env.GOOGLE_CALLBACK_URL,
                    grant_type: 'authorization_code',
                },
                {
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                    },
                }
            );

            if (!response.data.access_token) {
                throw new Error('No access token received from Google');
            }

            return response.data.access_token;
        } catch (error) {
            logger.error({ error }, 'Failed to exchange code for token with Google');
            throw new Error('Google authentication failed');
        }
    }

    /**
     * Fetch user profile from Google
     */
    static async getUserProfile(accessToken: string): Promise<GoogleUser> {
        try {
            const response = await axios.get<GoogleUser>(GOOGLE_USERINFO_URL, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            return response.data;
        } catch (error) {
            logger.error({ error }, 'Failed to fetch Google user profile');
            throw new Error('Failed to fetch user profile from Google');
        }
    }
}

export default GoogleService;
