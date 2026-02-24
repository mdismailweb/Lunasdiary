import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AudioProvider } from './context/AudioContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import './styles/global.css'
import './styles/animations.css'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <AudioProvider>
            <ToastProvider>
                <App />
            </ToastProvider>
        </AudioProvider>
    </React.StrictMode>
)
