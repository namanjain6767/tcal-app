import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';

const API_URL = import.meta.env.VITE_API_URL;

const getAuthToken = () => localStorage.getItem('token');

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

api.interceptors.request.use(config => {
    const token = getAuthToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default function ReportsPage({ setPage, setActiveDraft }) {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        const fetchReports = async () => {
            try {
                const response = await api.get('/reports');
                setReports(response.data);
            } catch (error) {
                console.error("Failed to fetch reports:", error);
            }
        };
        fetchReports();
    }, []);

    const downloadReport = (reportData, fileName) => {
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(Object.entries(reportData).map(([key, count]) => ({ Combination: key, Count: count })));
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, fileName);
    };

    const handleDeleteReport = async (reportId) => {
        if (window.confirm("Are you sure you want to delete this report?")) {
            try {
                await api.delete(`/reports/${reportId}`);
                setReports(reports.filter(report => report.id !== reportId));
            } catch (error) {
                alert("Could not delete report.");
            }
        }
    };

    const handleLoadReport = (report) => {
        const draftToLoad = {
            draft_name: `Copy of ${report.file_name}`,
            draft_data: report.report_data
        };
        setActiveDraft(draftToLoad);
        setPage('app');
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button onClick={() => setPage('dashboard')} className="mb-6 p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to Dashboard</button>
            <h1 className="text-3xl font-bold mb-6">Saved Reports</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                {reports.length > 0 ? reports.map(report => (
                    <div key={report.id} className="flex justify-between items-center p-2 border-b">
                        <span>{report.file_name}</span>
                        <div className="space-x-2">
                            <button onClick={() => handleLoadReport(report)} className="p-2 bg-teal-600 text-white rounded hover:bg-teal-700">Load</button>
                            <button onClick={() => downloadReport(report.report_data, report.file_name)} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">Download</button>
                            <button onClick={() => handleDeleteReport(report.id)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                )) : <p>No reports saved yet.</p>}
            </div>
        </div>
    );
}
