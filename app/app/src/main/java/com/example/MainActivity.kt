package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.lifecycle.lifecycleScope
import com.example.data.local.AppDatabase
import com.example.data.repository.VlsonneRepository
import com.example.ui.MainApp
import com.example.ui.theme.MyApplicationTheme
import com.example.ui.viewmodel.VlsonneViewModel
import com.example.ui.viewmodel.VlsonneViewModelFactory

class MainActivity : ComponentActivity() {

    private val viewModel: VlsonneViewModel by viewModels {
        val database = AppDatabase.getDatabase(applicationContext)
        val repository = VlsonneRepository(database.vlsonneDao(), lifecycleScope)
        VlsonneViewModelFactory(repository)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val uiState by viewModel.uiState.collectAsState()
            MyApplicationTheme(themeMode = uiState.themeMode) {
                MainApp(viewModel = viewModel)
            }
        }
    }
}
