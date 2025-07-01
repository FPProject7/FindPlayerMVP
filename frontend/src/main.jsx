import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import { BrowserRouter } from 'react-router-dom'; // 1. Import BrowserRouter
import { ApolloProvider } from '@apollo/client';
import client from './api/apolloClient';

ReactDOM.createRoot(document.getElementById('root')).render(
  <ApolloProvider client={client}>
    <React.StrictMode>
      <BrowserRouter> {/* 2. Wrap your App component */}
        <App />
      </BrowserRouter>
    </React.StrictMode>
  </ApolloProvider>
)