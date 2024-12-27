import axios from 'axios';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();
import process from 'node:process';

// Fetch Auth0 JSON Web Key Set (JWKS)
const getAuth0Jwks = async () => {
    const url = `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`;
    const response = await axios.get(url);
    return response.data.keys;
};

// Verify Auth0 Token
export const verifyAuth0Token = async (token) => {
    try {
        const jwks = await getAuth0Jwks();
        const signingKey = jwks[0].x5c[0]; // Use the first key

        const decodedToken = jwt.verify(token, signingKey, {
            algorithms: ['RS256'],
            issuer: `https://${process.env.AUTH0_DOMAIN}/`,
        });

        return decodedToken;
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error verifying token:', error);
        throw new Error('Invalid token');
    }
};
