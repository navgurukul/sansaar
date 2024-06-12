const crypto = require('crypto');

const CONSTANTS = require('../../config/index');
const Key = CONSTANTS.auth.password.passwordSecretKey;

const algorithm = 'aes-256-cbc';
const key = Buffer.from(Key, 'hex'); // Convert key to Buffer

const encrypt = (password) => {
    const iv = crypto.randomBytes(16); // Generate a new IV each time
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(password, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return {
        iv: iv.toString('hex'),
        encryptedData: encrypted
    };
}

const decrypt = (encryptedPassword) => {
    const iv = Buffer.from(encryptedPassword.iv, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedPassword.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
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
