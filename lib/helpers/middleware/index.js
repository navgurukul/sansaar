const crypto = require('crypto');
const CONSTANTS = require('../../config/index');
const Key = CONSTANTS.auth.password.passwordSecretKey;
const algorithm = 'aes-256-gcm';
const key = Buffer.from(Key, 'hex'); // Convert key to Buffer

const encrypt = (password) => {
    const iv = crypto.randomBytes(16); // Generate a new IV each time
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex'); // Get the authentication tag
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted,
        tag: tag // Include the tag in the output
    };
}

const decrypt = (encryptedPassword) => {
    try {
        const iv = Buffer.from(encryptedPassword.iv, 'hex');
        const tag = Buffer.from(encryptedPassword.tag, 'hex'); // Get the tag from the encrypted password
        const decipher = crypto.createDecipheriv(algorithm, key, iv);
        decipher.setAuthTag(tag); // Set the authentication tag
        let decrypted = decipher.update(encryptedPassword.encryptedData, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        console.log(decrypted, 'Decryption successful.');
        return decrypted;
    } catch (error) {
        console.log(error, 'Decryption failed.');
    }
}

const verifyPassword = (inputPassword, storedEncryptedPassword) => {
    const decryptedStoredPassword = decrypt(storedEncryptedPassword);
    return inputPassword === decryptedStoredPassword;
};

module.exports = {
    encrypt,
    decrypt,
    verifyPassword
}
