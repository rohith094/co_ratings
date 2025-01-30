import React, { useState } from "react";
import * as XLSX from "xlsx";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "react-toastify";

const CourseOutcomesUpload = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileData, setFileData] = useState([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const token = Cookies.get("admintoken");

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setSelectedFile(file);
    setMessage("");

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);
      setFileData(json);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    setIsLoading(true);
    setMessage("");

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const response = await axios.post(
        "http://localhost:3002/admin/addcourseoutcomes",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `${token}`,
          },
        }
      );

      setMessage(response.data.message);
      toast.success("Course Outcomes uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage("Failed to upload Course Outcomes. Please try again.");
    } finally {
      setIsLoading(false);
      setSelectedFile(null);
      setFileData([]);
    }
  };

  return (
    <div className="w-full h-[90vh] overflow-y-scroll mx-auto p-4 bg-white rounded-lg">
      <h2 className="text-2xl font-bold mb-4">Upload Course Outcomes</h2>
      <label className="block text-gray-700 font-semibold mb-2" htmlFor="fileInput">
        Select Excel File:
      </label>
      <div className="flex justify-between items-center mb-4">
        <input
          type="file"
          id="fileInput"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        <button
          onClick={handleUpload}
          disabled={isLoading}
          className={`w-full py-2 px-4 text-white font-bold rounded-full text-xl ${
            isLoading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-700 cursor-pointer"
          }`}
        >
          {isLoading ? "Uploading..." : "Upload Course Outcomes"}
        </button>
      </div>

      {fileData.length > 0 && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2">Preview:</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200">
              <thead>
                <tr>
                  {Object.keys(fileData[0]).map((key, index) => (
                    <th key={index} className="px-4 py-2 border-b border-gray-200 bg-gray-100 text-left text-sm font-medium text-gray-700">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fileData.map((row, rowIndex) => (
                  <tr key={rowIndex}>
                    {Object.values(row).map((value, colIndex) => (
                      <td key={colIndex} className="px-4 py-2 border-b border-gray-200 text-sm text-gray-700">
                        {value}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4">
          <p className={message.includes("Failed") ? "text-red-500" : "text-green-500"}>{message}</p>
        </div>
      )}
    </div>
  );
};

export default CourseOutcomesUpload;
