// frontend/src/main.jsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx'
import { TFTDataProvider } from './context/TFTDataContext.jsx'; 
// import './index.css' // <-- 이 라인을 주석 처리하거나 제거합니다.

import './styles/main.css'; // <-- 이 라인을 추가하여 main.css를 임포트합니다.

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TFTDataProvider>
     <BrowserRouter>
      <App />
     </BrowserRouter>
    </TFTDataProvider>
  </React.StrictMode>,
)