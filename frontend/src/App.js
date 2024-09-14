import React, { useState, useEffect } from "react";
import axios from "axios";
import "react-tooltip/dist/react-tooltip.css";
import { Tooltip } from "react-tooltip";

const App = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [file, setFile] = useState(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const isTestUser = localStorage.getItem("username");

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
    }
    if (isTestUser) {
      // Fetch the test file from the backend
      const fetchTestFile = async () => {
        try {
          const response = await axios.get(
            `${process.env.REACT_APP_API_URL}/download`,
            {
              responseType: "blob",
              headers: {
                Authorization: `Bearer ${storedToken}`,
              },
            }
          );

          const testFile = new File([response.data], "test.json", {
            type: "application/json",
          });
          setFile(testFile);
        } catch (error) {
          console.error("Failed to fetch test file:", error);
          setErrorMessage("Failed to fetch test file");
        }
      };

      fetchTestFile();
    }
  }, [isTestUser]);

  const handleTestLogin = async () => {
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/login`,
        { username: "test", password: "test" }
      );
      setToken(response.data.token);
      localStorage.setItem("authToken", response.data.token); // Store token in localStorage
      localStorage.setItem("username", "test");
      setErrorMessage(""); // Clear error message on successful login
    } catch (error) {
      setErrorMessage("Login failed"); // Set error message on failure
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    setIsLoading(true);
    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/login`,
        { username, password }
      );
      setToken(response.data.token);
      localStorage.setItem("authToken", response.data.token); // Store token in localStorage
      setErrorMessage(""); // Clear error message on successful login
    } catch (error) {
      setErrorMessage("Login failed"); // Set error message on failure
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setToken("");
    localStorage.removeItem("authToken"); // Remove token from localStorage
    localStorage.removeItem("username");
    setUsername("");
    setPassword("");
    setErrorMessage(""); // Clear error message on successful logout
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleDownloadTestFile = async () => {
    try {
      setIsLoading(true); // Set loading state to true
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/download`,
        {
          responseType: "blob", // Important: ensures that the response is treated as a file
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`, // Make sure to send the authorization token
          },
        }
      );

      // Create a URL from the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "testfile.json"); // Set the filename for the download
      document.body.appendChild(link);
      link.click();

      // Clean up by revoking the URL and removing the link
      window.URL.revokeObjectURL(url);
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error("Error downloading file:", error.message);
      setErrorMessage("Failed to download file"); // Update error message state
    }
    setIsLoading(false); // Set loading state to false
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      // Create a link to download the file
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "cleaned_transactions.csv");
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      if (error.response && error.response.data) {
        const errorBlob = error.response.data;
        const errorText = await errorBlob.text();
        console.error("File upload failed:", errorText);
      } else {
        console.error("File upload failed:", error.message);
      }
    }

    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: "50px",
        padding: "20px",
        border: "1px solid black",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <h1>Upload JSON and Get CSV, stripped from the HTML tags</h1>
      {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
      {
          <form onSubmit={handleUpload}>
            <input type="file" onChange={handleFileChange} />
            {isLoading ? (
              <button type="submit" disabled>
                Loading...
              </button>
            ) : (
              <button type="submit">Upload and Convert</button>
            )}
          </form>
      }
    </div>
  );
};

export default App;
