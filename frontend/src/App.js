import React, { useState, useEffect } from "react";
import axios from "axios";
import "react-tooltip/dist/react-tooltip.css";

const App = () => {
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

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
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
