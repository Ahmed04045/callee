package com.example.util

import android.content.Context
import android.net.Uri
import java.io.File
import java.io.FileOutputStream

object FileUtils {
    /**
     * Copies a content URI (e.g. from photo picker/file manager) into the app's internal files directory.
     * Returns the file path or URI string for permanent local storage.
     */
    fun saveImageToInternalStorage(context: Context, uri: Uri): String {
        return try {
            val contentResolver = context.contentResolver
            val inputStream = contentResolver.openInputStream(uri) ?: return uri.toString()
            val avatarsDir = File(context.filesDir, "avatars").apply { if (!exists()) mkdirs() }
            val file = File(avatarsDir, "avatar_${System.currentTimeMillis()}.jpg")

            FileOutputStream(file).use { output ->
                inputStream.copyTo(output)
            }
            file.absolutePath
        } catch (e: Exception) {
            uri.toString()
        }
    }
}
