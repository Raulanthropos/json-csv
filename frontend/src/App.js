import React, { useState } from 'react';
import axios from 'axios';

const App = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [file, setFile] = useState(null);
    const [token, setToken] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/login`, { username, password });
            setToken(response.data.token);
            setErrorMessage(''); // Clear error message on successful login
        } catch (error) {
            setErrorMessage('Login failed'); // Set error message on failure
        }
    };

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_URL}/upload`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'Authorization': token
                },
                responseType: 'blob'
            });

            // Create a link to download the file
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', 'cleaned_transactions.csv');
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error('File upload failed', error);
        }
    };

    return (
        <div style={{ textAlign: 'center' , marginTop: '50px', padding: '20px', border: '1px solid black', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <h1>Upload JSON and Get CSV, stripped from the HTML tags</h1>
            {errorMessage && <div style={{ color: 'red' }}>{errorMessage}</div>}
            {!token ? (
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button type="submit">Login</button>
                </form>
            ) : (
                <form onSubmit={handleUpload}>
                    <input type="file" onChange={handleFileChange} />
                    <button type="submit">Upload and Convert</button>
                </form>
            )}
        </div>
    );
};

export default App;
