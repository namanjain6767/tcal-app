import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';

const API_URL = 'http://localhost:5000/api';

// --- Helper function to get the auth token from local storage ---
const getAuthToken = () => localStorage.getItem('token');

// --- Axios instance with auth header ---
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
    const [activeDraft, setActiveDraft] = useState(null);

    useEffect(() => {
        const token = getAuthToken();
        if (token) {
            try {
                const decodedUser = jwtDecode(token);
                setUser(decodedUser);
                setPage('app');
            } catch (e) {
                localStorage.removeItem('token');
                setPage('login');
            }
        } else {
            setPage('login');
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        setUser(null);
        setActiveDraft(null);
        setPage('login');
    };

    const renderPage = () => {
        switch (page) {
            case 'register': return <RegisterPage setPage={setPage} setUser={setUser} />;
            case 'app': return <TimberRecorderPage user={user} setPage={setPage} handleLogout={handleLogout} activeDraft={activeDraft} setActiveDraft={setActiveDraft} />;
            case 'admin': return <AdminPage setPage={setPage} />;
            case 'reports': return <ReportsPage setPage={setPage} />;
            case 'drafts': return <DraftsPage setPage={setPage} setActiveDraft={setActiveDraft} />;
            case 'login': default: return <LoginPage setPage={setPage} setUser={setUser} />;
        }
    };

    return <div className="min-h-screen bg-gray-100">{renderPage()}</div>;
}

function LoginPage({ setPage, setUser }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const response = await axios.post(`${API_URL}/login`, { email, password });
            const { token } = response.data;
            localStorage.setItem('token', token);
            const decodedUser = jwtDecode(token);
            setUser(decodedUser);
            setPage('app');
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed.');
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

function RegisterPage({ setPage, setUser }) {
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
            const response = await axios.post(`${API_URL}/login`, { email: formData.email, password: formData.password });
            const { token } = response.data;
            localStorage.setItem('token', token);
            const decodedUser = jwtDecode(token);
            setUser(decodedUser);
            setPage('app');
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

function AdminPage({ setPage }) {
    // ... (Admin page logic remains the same)
}

function ReportsPage({ setPage }) {
    // ... (Reports page logic remains the same)
}

function DraftsPage({ setPage, setActiveDraft }) {
    const [drafts, setDrafts] = useState([]);

    useEffect(() => {
        const fetchDrafts = async () => {
            try {
                const response = await api.get('/drafts');
                setDrafts(response.data);
            } catch (error) {
                console.error("Failed to fetch drafts:", error);
            }
        };
        fetchDrafts();
    }, []);

    const handleLoadDraft = (draft) => {
        setActiveDraft(draft);
        setPage('app');
    };

    const handleDeleteDraft = async (draftId) => {
        if (window.confirm("Are you sure you want to delete this draft?")) {
            try {
                await api.delete(`/drafts/${draftId}`);
                setDrafts(drafts.filter(draft => draft.id !== draftId));
            } catch (error) {
                alert("Could not delete draft.");
            }
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <button onClick={() => setPage('app')} className="mb-6 p-2 bg-gray-500 text-white rounded hover:bg-gray-600">Back to App</button>
            <h1 className="text-3xl font-bold mb-6">Saved Drafts</h1>
            <div className="bg-white p-6 rounded-lg shadow-md">
                {drafts.length > 0 ? drafts.map(draft => (
                    <div key={draft.id} className="flex justify-between items-center p-2 border-b">
                        <span>{draft.draft_name}</span>
                        <div className="space-x-2">
                            <button onClick={() => handleLoadDraft(draft)} className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700">Load</button>
                            <button onClick={() => handleDeleteDraft(draft.id)} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                )) : <p>No drafts saved yet.</p>}
            </div>
        </div>
    );
}


function TimberRecorderPage({ user, setPage, handleLogout, activeDraft, setActiveDraft }) {
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

    useEffect(() => {
        if (activeDraft) {
            setRecordedData(activeDraft.draft_data);
        }
    }, [activeDraft]);

    const generateAndDownloadXLSX = (dataToExport, fileName) => {
        // ... (This function remains the same)
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
                
                const newData = { ...recordedData, [key]: (recordedData[key] || 0) + incrementAmount };
                setRecordedData(newData);
                
                if (activeDraft) {
                    await api.put(`/drafts/${activeDraft.id}`, { draftData: newData });
                } else {
                    const response = await api.post('/drafts', { draftData: newData });
                    setActiveDraft(response.data);
                }

                setSelections(prev => ({ ...prev, length: null, width: null }));
            }
            return;
        }
        if (value === 'Finish') {
            if (Object.keys(recordedData).length === 0) {
                console.warn("No data to save or export.");
                return;
            }
            
            const fileName = activeDraft ? activeDraft.draft_name : `timber_record_${new Date().toISOString()}.xlsx`;
            
            generateAndDownloadXLSX(recordedData, fileName);

            try {
                await api.post('/reports', {
                    reportData: recordedData,
                    fileName: fileName
                });
                if (activeDraft) {
                    await api.delete(`/drafts/${activeDraft.id}`);
                    setActiveDraft(null);
                }
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
         <div className="bg-gray-50 text-gray-800 p-4 md:p-6 min-h-screen font-sans">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <p>Welcome, {user?.name} {user?.surname}</p>
                    </div>
                    <div>
                        {user?.isAdmin && <button onClick={() => setPage('admin')} className="p-2 bg-purple-600 text-white rounded hover:bg-purple-700 mr-2">Admin Panel</button>}
                        <button onClick={() => setPage('drafts')} className="p-2 bg-teal-600 text-white rounded hover:bg-teal-700 mr-2">View Drafts</button>
                        <button onClick={() => setPage('reports')} className="p-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 mr-4">View Reports</button>
                        <button onClick={handleLogout} className="p-2 bg-red-600 text-white rounded hover:bg-red-700">Logout</button>
                    </div>
                </div>
                <div className="mb-6 p-4 bg-white rounded-lg shadow flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-900">TCAL</h1>
                    <div className="font-mono text-blue-600 text-lg">
                       T: {selections.thickness || '_'} | L: {selections.length || '_'} | W: {selections.width || '_'}
                    </div>
                    <div className="w-16"></div> 
                </div>
                {/* --- RESTORED UI CODE --- */}
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
