import React, { useState, useEffect } from "react";
import axios from "axios";
import "react-tooltip/dist/react-tooltip.css";
import styled from "styled-components";
import { createGlobalStyle } from "styled-components";

const GlobalStyle = createGlobalStyle`
  body {
    background-color: #f5f5dc; /* A soft, natural beige color */
    margin: 0;
    padding: 0;
    font-family: 'Arial', sans-serif;
    color: #333;
  }
`;

const Title = styled.h1`
  font-size: 2.5rem; /* Slightly larger, but not overwhelming */
  color: #4a4a4a; /* A warm gray */
  text-align: center;
  margin: 20px 0;
  font-weight: 400; /* Lighter for a softer look */
  @media (max-width: 768px) {
    font-size: 2rem; /* Adjust for smaller screens */
  }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  @media (max-width: 768px) {
    padding: 10px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 400px;
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Input = styled.input`
  padding: 10px;
  font-size: 1rem;
  border: 1px solid #ccc;
  border-radius: 5px;
  margin-bottom: 20px;
  width: 80%;
  max-width: 300px;
  text-align: center;
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const Button = styled.button`
  background: #4caf50;
  color: white;
  padding: 10px;
  border: none;
  border-radius: 5px;
  cursor: pointer;

  &:hover {
    background: #45a049;
  }
`;

const DisabledButton = styled(Button)`
  opacity: 0.5;
  cursor: not-allowed;
  background: #ccc;
  color: #000;

  &:hover {
    color: #fff;
    background: #ccc;
  }
`;

const App = () => {
  const [file, setFile] = useState(null);
  const [token, setToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const storedToken = localStorage.getItem("authToken");
    if (storedToken) {
      setToken(storedToken);
    }
  }, []);

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
      setErrorMessage("");
      link.setAttribute("download", "cleaned_transactions.csv");
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      if (error.response && error.response.data) {
        const errorBlob = error.response.data;
        const errorText = await errorBlob.text();
        setErrorMessage(errorText.replace(/<[^>]*>/g, ""));
      } else {
        setErrorMessage(error.message.replace(/<[^>]*>/g, ""));
      }
    }

    setTimeout(() => {
      setIsLoading(false);
    }, 1000);
  };

  return (
    <>
      <GlobalStyle />
      <Container>
        <Title>Upload JSON and Get CSV, stripped from any HTML tags</Title>
        {errorMessage && <div style={{ color: "red" }}>{errorMessage}</div>}
        {
          <Form onSubmit={handleUpload}>
            <Input type="file" onChange={handleFileChange} />
            {isLoading ? (
              <DisabledButton type="submit">Loading...</DisabledButton>
            ) : !file ? (
              <DisabledButton type="submit">
                No JSON is selected!
              </DisabledButton>
            ) : (
              <Button type="submit">Download CSV</Button>
            )}
          </Form>
        }
      </Container>
    </>
  );
};

export default App;
