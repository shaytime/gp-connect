import jsforce from 'jsforce';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Creates and returns an authenticated Salesforce Connection.
 * Uses the Username-Password flow for simplicity in background synchronization jobs.
 */
export async function getSfConnection() {
    const conn = new jsforce.Connection({
        loginUrl: process.env.SF_LOGIN_URL || 'https://login.salesforce.com'
    });

    const username = process.env.SF_USERNAME;
    const password = process.env.SF_PASSWORD;
    const token = process.env.SF_TOKEN;

    if (!username || !password) {
        throw new Error('Salesforce credentials (SF_USERNAME, SF_PASSWORD) are not defined in .env');
    }

    // Salesforce requires Password + Security Token concatenated if the IP is not whitelisted
    const loginPassword = token ? `${password}${token}` : password;

    try {
        await conn.login(username, loginPassword);
        console.log('Successfully logged into Salesforce');
        return conn;
    } catch (err) {
        console.error('Salesforce login failed:', err);
        throw err;
    }
}
