import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, signOut, onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCj1RfBO_-DnhFScif-_TPOkbOYSugaO3U",
  authDomain: "timber-recorder-app.firebaseapp.com",
  projectId: "timber-recorder-app",
  storageBucket: "timber-recorder-app.appspot.com",
  messagingSenderId: "85268585117",
  appId: "1:85268585117:web:6af7b89a8e820164125274",
  measurementId: "G-Q04Y9TNGG2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const API_URL = 'http://localhost:5000/api';

const GridButton = ({ value, group, onClick, isHighlighted, isSpecial, isDisabled }) => {
    const baseClasses = "w-full h-full flex items-center justify-center p-2 rounded-lg shadow-sm transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2";
    let typeClasses = '';
    let specialStyle = '';
    if (isSpecial) {
        if (value === 'Next') specialStyle = 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500';
        else if (value === 'Finish') specialStyle = 'bg-green-600 hover:bg-green-700 focus:ring-green-500';
        else if (value === 'Undo') specialStyle = 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-400';
        typeClasses = `border-transparent text-white font-semibold ${specialStyle}`;
    } else {
        typeClasses = "border border-gray-300 text-gray-700 bg-white hover:bg-gray-100 focus:ring-indigo-500";
    }
    const highlightedClass = isHighlighted ? "bg-indigo-100 border-indigo-400 ring-2 ring-indigo-400 shadow-md" : "";
    const disabledClass = isDisabled ? "opacity-50 cursor-not-allowed" : "";
    return (
        <button
            className={`${baseClasses} ${typeClasses} ${highlightedClass} ${disabledClass}`}
            onClick={() => onClick(value, group)}
            disabled={isDisabled}
        >
            {value}
        </button>
    );
};

export default function App() {
    const [user, setUser] = useState(null);
    const [page, setPage] = useState('login');

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    setUser({ uid: currentUser.uid, ...userDoc.data() });
                }
                setPage('app');
            } else {
                setUser(null);
                setPage('login');
            }
        });
        return () => unsubscribe();
    }, []);

    const renderPage = () => {
        switch (page) {
            case 'register': return <RegisterPage setPage={setPage} />;
            case 'app': return <TimberRecorderPage user={user} setPage={setPage} />;
            case 'admin': return <AdminPage setPage={setPage} />;
            case 'reports': return <ReportsPage setPage={setPage} />;
            case 'login': default: return <LoginPage setPage={setPage} />;
        }
    };

    return <div className="min-h-screen bg-gray-100">{renderPage()}</div>;
}

// --- UPDATED: Login Page with IP Check ---
function LoginPage({ setPage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const token = await userCredential.user.getIdToken();
            
            // IP check after login
            try {
                await axios.post(`${API_URL}/login-activity`, {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // onAuthStateChanged will handle navigation
            } catch (ipError) {
                // If IP check fails, sign the user out immediately
                await signOut(auth);
                if (ipError.response && ipError.response.status === 403) {
                    setError('Access from your current IP address is not allowed.');
                } else {
                    setError('An error occurred during login verification.');
                }
            }
        } catch (err) {
            setError('Failed to login. Please check your credentials.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 bg-white rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
                <form onSubmit={handleLogin}>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full p-2 mb-4 border rounded" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="w-full p-2 mb-4 border rounded" />
                    <button type="submit" className="w-full p-2 bg-blue-600 text-white rounded hover:bg-blue-700">Login</button>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                </form>
                <p className="mt-4 text-center">
                    Don't have an account? <button onClick={() => setPage('register')} className="text-blue-600">Register</button>
                </p>
            </div>
        </div>
    );
}

function RegisterPage({ setPage }) {
    const [formData, setFormData] = useState({
        name: '',
        surname: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        try {
            await axios.post(`${API_URL}/register`, { 
                email: formData.email, 
                password: formData.password,
                name: formData.name,
                surname: formData.surname,
                phone: formData.phone
            });
            await signInWithEmailAndPassword(auth, formData.email, formData.password);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register.');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="p-8 bg-white rounded-lg shadow-md w-96">
                <h1 className="text-2xl font-bold mb-6 text-center">Registration</h1>
                <form onSubmit={handleRegister}>
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Name" className="w-full p-2 mb-4 border rounded" required />
                    <input name="surname" value={formData.surname} onChange={handleChange} placeholder="Surname" className="w-full p-2 mb-4 border rounded" required />
                    <input name="email" type="email" value={formData.email} onChange={handleChange} placeholder="Email" className="w-full p-2 mb-4 border rounded" required />
                    <input name="phone" type="tel" value={formData.phone} onChange={handleChange} placeholder="Phone Number" className="w-full p-2 mb-4 border rounded" required />
                    <input name="password" type="password" value={formData.password} onChange={handleChange} placeholder="Password" className="w-full p-2 mb-4 border rounded" required />
                    <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} placeholder="Confirm Password" className="w-full p-2 mb-4 border rounded" required />
                    <button type="submit" className="w-full p-2 bg-green-600 text-white rounded hover:bg-green-700">Register</button>
                    {error && <p className="text-red-500 mt-4 text-center">{error}</p>}
                </form>
                <p className="mt-4 text-center">
                    Already have an account? <button onClick={() => setPage('login')} className="text-blue-600">Login</button>
                </p>
            </div>
        </div>
    );
}

// --- UPDATED: Admin Page with IP Locking ---
function AdminPage({ setPage }) {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchUsers = async () => {
            if (auth.currentUser) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    const response = await axios.get(`${API_URL}/users`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUsers(response.data);
                } catch (error) {
                    console.error("Failed to fetch users:", error);
                }
            }
        };
        fetchUsers();
    }, []);

    const handleDeleteUser = async (uid) => {
        if (window.confirm("Are you sure you want to permanently delete this user? This action cannot be undone.")) {
            try {
                const token = await auth.currentUser.getIdToken();
                await axios.delete(`${API_URL}/users/${uid}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUsers(users.filter(user => user.uid !== uid));
            } catch (error) {
                console.error("Failed to delete user:", error);
                alert("Could not delete user.");
            }
        }
    };

    // Sub-component for each user row to manage its own state
    const UserRow = ({ user }) => {
        const [ipAddress, setIpAddress] = useState(user.allowedIp || '');

        const handleSaveIp = async () => {
            try {
                const token = await auth.currentUser.getIdToken();
                await axios.post(`${API_URL}/users/${user.uid}/lock-ip`, { ipAddress }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                alert('IP address updated!');
            } catch (error) {
                console.error("Failed to save IP:", error);
                alert("Failed to save IP address.");
            }
        };

        return (
            <tr className="border-b">
                <td className="p-2">{user.name} {user.surname}</td>
                <td className="p-2">{user.email}</td>
                <td className="p-2 font-mono">{user.lastLoginIp || 'N/A'}</td>
                <td className="p-2 flex items-center gap-2">
                    <input 
                        type="text" 
                        value={ipAddress} 
                        onChange={(e) => setIpAddress(e.target.value)}
                        placeholder="Allow any IP"
                        className="p-1 border rounded w-40"
                    />
                    <button onClick={handleSaveIp} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm">Save IP</button>
                </td>
                <td className="p-2">
                    <button onClick={() => handleDeleteUser(user.uid)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                </td>
            </tr>
        );
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <button onClick={() => setPage('app')} className="mb-6 p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to App</button>
            <h1 className="text-3xl font-bold mb-6">Admin Panel - Registered Users</h1>
            <div className="bg-white p-6 rounded-lg shadow-md overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b">
                            <th className="p-2">Name</th>
                            <th className="p-2">Email</th>
                            <th className="p-2">Last Login IP</th>
                            <th className="p-2">Lock to IP Address</th>
                            <th className="p-2">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => <UserRow key={user.uid} user={user} />)}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function ReportsPage({ setPage }) {
    const [reports, setReports] = useState([]);

    useEffect(() => {
        const fetchReports = async () => {
            if (auth.currentUser) {
                try {
                    const token = await auth.currentUser.getIdToken();
                    const response = await axios.get(`${API_URL}/reports`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setReports(response.data);
                } catch (error) {
                    console.error("Failed to fetch reports:", error);
                }
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
                const token = await auth.currentUser.getIdToken();
                await axios.delete(`${API_URL}/reports/${reportId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setReports(reports.filter(report => report.id !== reportId));
            } catch (error) {
                console.error("Failed to delete report:", error);
                alert("Could not delete report.");
            }
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button onClick={() => setPage('app')} className="mb-6 p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to App</button>
            <h1 className="text-3xl font-bold mb-6">Saved Reports</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                {reports.length > 0 ? reports.map(report => (
                    <div key={report.id} className="flex justify-between items-center p-2 border-b">
                        <span>{report.fileName}</span>
                        <div className="space-x-2">
                            <button onClick={() => downloadReport(report.data, report.fileName)} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">Download</button>
                            <button onClick={() => handleDeleteReport(report.id)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                )) : <p>No reports saved yet.</p>}
            </div>
        </div>
    );
}


function TimberRecorderPage({ user, setPage }) {
    const thicknessData = [0.75, 1, 1.5, 2, 2.5, 3];
    const lengthData = [1, 1.25, 1.5, 1.75, 2, 2.25, 2.5, 2.75, 3, 3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75, 6, 6.25, 6.5, 6.75, 7, 7.25, 7.5, 7.75, 8, 8.25, 8.5, 8.75, 9, 9.25, 9.5, 9.75, 10, 10.25, 10.5, 10.75, 11, 11.25, 11.5, 11.75, 12, 12.25, 12.5, 12.75, 13, 13.25, 13.5, 13.75];
    const widthData = [
        [3, 4, 5],
        [6, 7, 8],
        [9, 10, 11],
        [12]
    ];

    const [selections, setSelections] = useState({ thickness: thicknessData[0], length: null, width: null });
    const [recordedData, setRecordedData] = useState({});
    const [quantity, setQuantity] = useState(1);
    const [useQuantity, setUseQuantity] = useState(false);

    const generateAndDownloadXLSX = (dataToExport, fileName) => {
        const groupedByThickness = {};
        for (const key in dataToExport) {
            const [t, l, w] = key.split('-');
            const count = dataToExport[key];
            if (!groupedByThickness[t]) groupedByThickness[t] = {};
            if (!groupedByThickness[t][l]) groupedByThickness[t][l] = {};
            groupedByThickness[t][l][w] = count;
        }
        const wb = XLSX.utils.book_new();
        for (const thickness in groupedByThickness) {
            const sheetData = groupedByThickness[thickness];
            const allLengths = Object.keys(sheetData).sort((a, b) => parseFloat(a) - parseFloat(b));
            const allWidths = new Set();
            allLengths.forEach(l => Object.keys(sheetData[l]).forEach(w => allWidths.add(w)));
            const sortedWidths = Array.from(allWidths).sort((a, b) => parseFloat(a) - parseFloat(b));
            const matrix = [['Length \\ Width', ...sortedWidths, 'Total', 'CFT']];
            const colTotals = new Array(sortedWidths.length).fill(0);
            let sheetTotalCFT = 0;
            allLengths.forEach(length => {
                let rowTotal = 0;
                const row = [parseFloat(length)];
                let weightedWidthSum = 0;
                sortedWidths.forEach((width, index) => {
                    const count = sheetData[length][width] || 0;
                    row.push(count);
                    rowTotal += count;
                    colTotals[index] += count;
                    weightedWidthSum += parseFloat(width) * count;
                });
                row.push(rowTotal);
                const rowCFT = (parseFloat(thickness) * parseFloat(length) * weightedWidthSum) / 144;
                row.push(parseFloat(rowCFT.toFixed(4)));
                sheetTotalCFT += rowCFT;
                matrix.push(row);
            });
            const totalRow = ['Total'];
            let grandTotal = 0;
            colTotals.forEach(total => {
                totalRow.push(total);
                grandTotal += total;
            });
            totalRow.push(grandTotal);
            totalRow.push(parseFloat(sheetTotalCFT.toFixed(4)));
            matrix.push(totalRow);
            const ws = XLSX.utils.aoa_to_sheet(matrix);
            XLSX.utils.book_append_sheet(wb, ws, `Thickness ${thickness}`);
        }
        XLSX.writeFile(wb, fileName);
    };
    
    const handleThicknessChange = (event) => {
        const newThickness = parseFloat(event.target.value);
        setSelections({ thickness: newThickness, length: null, width: null });
    };

    const handleQuantityChange = (event) => {
        setQuantity(parseInt(event.target.value, 10));
    };

    const handleButtonClick = async (value, group) => {
        if (value === 'Next') {
            if (selections.thickness && selections.length && selections.width) {
                const key = `${selections.thickness}-${selections.length}-${selections.width}`;
                const incrementAmount = useQuantity ? quantity : 1;
                setRecordedData(prevData => ({ ...prevData, [key]: (prevData[key] || 0) + incrementAmount }));
                setSelections(prev => ({ ...prev, length: null, width: null }));
            }
            return;
        }
        if (value === 'Finish') {
            if (Object.keys(recordedData).length === 0) {
                console.warn("No data to save or export.");
                return;
            }
            const date = new Date();
            const dateStr = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}-${date.getFullYear()}`;
            let hours = date.getHours();
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            const minutes = String(date.getMinutes()).padStart(2, '0');
            const timeStr = `${hours}-${minutes}-${ampm}`;
            const fileName = `timber_record_${dateStr}_${timeStr}.xlsx`;
            
            generateAndDownloadXLSX(recordedData, fileName);

            try {
                const token = await auth.currentUser.getIdToken();
                await axios.post(`${API_URL}/reports`, {
                    reportData: recordedData,
                    fileName: fileName
                }, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (error) {
                console.error("Failed to save report:", error);
            }

            setRecordedData({});
            return;
        }
        if (value === 'Undo') {
            if (selections.width !== null) {
                setSelections(prev => ({ ...prev, width: null }));
            } else if (selections.length !== null) {
                setSelections(prev => ({ ...prev, length: null }));
            }
            return;
        }
        if (group === 'width' && !selections.length) {
            return;
        }
        if (group in selections) {
            setSelections(prev => ({ ...prev, [group]: value }));
        }
    };

    return (
         <div className="bg-gray-50 text-gray-800 p-4 md-p-6 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p>Welcome, {user?.name} {user?.surname}</p>
                    </div>
                    <div>
                        {user?.isAdmin && <button onClick={() => setPage('admin')} className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 mr-2">Admin Panel</button>}
                        <button onClick={() => setPage('reports')} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 mr-4">View Reports</button>
                        <button onClick={() => signOut(auth)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
                    </div>
                </div>
                <div className="mb-6 p-4 bg-white rounded-lg shadow flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">TCAL</h1>
                    <div className="font-mono text-blue-600 text-lg">
                       T: {selections.thickness || '_'} | L: {selections.length || '_'} | W: {selections.width || '_'}
                    </div>
                    <div className="w-16"></div> 
                </div>
                <div className="grid gap-4 grid-cols-1 md:grid-cols-[1fr_4fr_3fr_2fr]">
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">THICKNESS</h2>
                        <select
                            value={selections.thickness}
                            onChange={handleThicknessChange}
                            className="w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {thicknessData.map(value => <option key={`t-opt-${value}`} value={value}>{value}</option>)}
                        </select>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Length(FEET)</h2>
                        <div className="grid grid-rows-13 grid-cols-4 gap-3">
                            {lengthData.map(value => (
                                <GridButton
                                    key={`len-${value}`}
                                    value={value}
                                    group="length"
                                    onClick={handleButtonClick}
                                    isHighlighted={selections.length === value}
                                />
                            ))}
                        </div>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold mb-2 text-center text-gray-700">Width(INCH)</h2>
                        <div className="space-y-3">
                            {widthData.map((row, rowIndex) => (
                                <div key={`w-row-${rowIndex}`} className="grid grid-cols-3 gap-3">
                                    {row.map(value => (
                                        <GridButton
                                            key={`w-${value}`}
                                            value={value}
                                            group="width"
                                            onClick={handleButtonClick}
                                            isHighlighted={selections.width === value}
                                            isDisabled={!selections.length}
                                        />
                                    ))}
                                </div>
                            ))}
                             <div className="mt-4">
                                <div className="flex items-center justify-center">
                                    <input
                                        id="use-quantity"
                                        type="checkbox"
                                        checked={useQuantity}
                                        onChange={(e) => setUseQuantity(e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <label htmlFor="use-quantity" className="ml-2 text-sm font-medium text-gray-700">Use Quantity</label>
                                </div>
                                {useQuantity && (
                                    <div className="mt-2">
                                        <select
                                            value={quantity}
                                            onChange={handleQuantityChange}
                                            className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        >
                                            {Array.from({ length: 10 }, (_, i) => i + 1).map(num => (
                                                <option key={`qty-${num}`} value={num}>{num}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-center space-y-4">
                        <h2 className="text-lg font-semibold mb-2 text-center text-transparent">Actions</h2>
                        <div className="w-full">
                            <GridButton
                                value="Next"
                                group="action"
                                onClick={handleButtonClick}
                                isSpecial={true}
                                isDisabled={!selections.length || !selections.width}
                            />
                        </div>
                    </div>
                </div>
                 <div className="mt-6 flex justify-center items-center gap-4">
                    <button 
                        onClick={() => handleButtonClick('Finish', 'action')} 
                        className="p-3 w-40 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold shadow-md transition-all"
                    >
                        Finish
                    </button>
                    <button 
                        onClick={() => handleButtonClick('Undo', 'action')} 
                        className="p-3 w-40 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-semibold shadow-md transition-all"
                    >
                        Undo
                    </button>
                </div>
            </div>
        </div>
    );
}
