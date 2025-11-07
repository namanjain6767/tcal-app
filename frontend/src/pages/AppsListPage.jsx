import React from 'react';

// --- INLINE SVG ICONS ---
const CalculatorIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-indigo-600">
        <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
        <line x1="8" y1="6" x2="16" y2="6"></line>
        <line x1="16" y1="14" x2="8" y2="14"></line>
        <line x1="16" y1="18" x2="8" y2="18"></line>
        <line x1="10" y1="10" x2="14" y2="10"></line>
    </svg>
);

const JobSheetIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-teal-600">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        <path d="M12 11h4"></path>
        <path d="M12 16h4"></path>
        <path d="M8 11h.01"></path>
        <path d="M8 16h.01"></path>
    </svg>
);

// --- NEW T-Connect Icon ---
const MarketplaceIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-green-600">
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
        <polyline points="9 22 9 12 15 12 15 22"></polyline>
    </svg>
);
// --- END INLINE SVG ICONS ---

// AppCard Component
const AppCard = ({ title, description, onSelect, icon, iconBgColor }) => (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:-translate-y-1">
        <div className="p-6">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${iconBgColor}`}>
                {icon}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mt-4 mb-2">{title}</h2>
            <p className="text-gray-600 mb-6 h-20">{description}</p>
        </div>
        <div className="px-6 pb-6">
            <button 
                onClick={onSelect}
                className="w-full p-3 bg-gradient-to-r from-indigo-600 to-blue-500 text-white font-semibold rounded-lg hover:from-indigo-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg"
            >
                Open Application
            </button>
        </div>
    </div>
);


export default function AppsListPage({ setPage, user, setLoginRedirect }) {

    const handleAppSelect = (appName) => {
        if (appName === 'T-CAL') {
            if (user) {
                // If user is logged in, send them to the correct dashboard
                setPage(user.role === 'owner' ? 'ownerDashboard' : 'dashboard');
            } else {
                // If user is not logged in, go to login and set redirect
                setLoginRedirect({ page: 'dashboard', appName: 'T-CAL' });
                setPage('login');
            }
        } else if (appName === 'T-Job Sheet') {
            if (user) {
                setPage('jobSheet');
            } else {
                // If user is not logged in, go to login and set redirect
                setLoginRedirect({ page: 'jobSheet', appName: 'T-Job Sheet' });
                setPage('login');
            }
        } else if (appName === 'T-Connect') {
            // --- NEW: Handle T-Connect ---
            // This will open the link in a new tab.
            // PLEASE PROVIDE THE CORRECT URL.
            const marketplaceUrl = 'https://google.com'; // <-- Placeholder URL
            window.open(marketplaceUrl, '_blank', 'noopener,noreferrer');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
            <div className="p-8 max-w-6xl mx-auto w-full">
                <h1 className="text-5xl font-bold text-center text-gray-900 mb-12">
                    Select an Application
                </h1>
                {/* --- UPDATED: Changed grid to 3 columns --- */}
                <div className="grid md:grid-cols-3 gap-8">
                    <AppCard 
                        title="T-CAL"
                        description="Timber calculation and inventory management."
                        onSelect={() => handleAppSelect('T-CAL')}
                        icon={<CalculatorIcon />}
                        iconBgColor="bg-indigo-100"
                    />
                    <AppCard 
                        title="T-Job Sheet"
                        description="Create, manage, and track production job sheets and product definitions."
                        onSelect={() => handleAppSelect('T-Job Sheet')}
                        icon={<JobSheetIcon />}
                        iconBgColor="bg-teal-100"
                    />
                    {/* --- NEW: T-Connect Card --- */}
                    <AppCard 
                        title="T-Connect"
                        description="A marketplace for timber sellers and manufacturers to connect and do business."
                        onSelect={() => handleAppSelect('T-Connect')}
                        icon={<MarketplaceIcon />}
                        iconBgColor="bg-green-100"
                    />
                </div>
                 <div className="mt-12 text-center">
                    <button 
                        onClick={() => setPage('home')} 
                        className="text-sm text-gray-600 hover:text-gray-800"
                    >
                        Back to Home
                    </button>
                </div>
            </div>
        </div>
    );
}