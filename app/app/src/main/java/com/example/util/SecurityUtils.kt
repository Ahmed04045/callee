package com.example.util

import java.security.MessageDigest

object SecurityUtils {
    private const val PASSWORD_SALT = "circosodal_salt_secure_2026"

    /**
     * Hashes password using SHA-256 with salt.
     * Prevents plaintext credential storage in local and remote databases.
     */
    fun hashPassword(password: String): String {
        if (password.isBlank()) return ""
        val digest = MessageDigest.getInstance("SHA-256")
        val input = (password + PASSWORD_SALT).toByteArray(Charsets.UTF_8)
        val hashBytes = digest.digest(input)
        return hashBytes.joinToString("") { "%02x".format(it) }
    }

    /**
     * Compares raw user input with the stored hash safely.
     */
    fun verifyPassword(inputPassword: String, storedHashOrPlain: String): Boolean {
        if (inputPassword.isBlank() || storedHashOrPlain.isBlank()) return false
        val hashedInput = hashPassword(inputPassword)
        return hashedInput == storedHashOrPlain || inputPassword == storedHashOrPlain
    }
}
