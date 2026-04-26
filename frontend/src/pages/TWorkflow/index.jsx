import React from 'react';
import useWorkflowData from './hooks/useWorkflowData';
import { BackArrowIcon, PlusIcon, TrashIcon } from './components/Icons';

export default function TWorkflowPage({ setPage }) {
    const w = useWorkflowData();
    const {
        // Auth
        tWorkflowToken, setTWorkflowToken, loginEmail, setLoginEmail, loginPassword, setLoginPassword, loginError, isLoggingIn, handleWorkflowLogin,
        // Core
        activeTab, setActiveTab, orders, isLoading, isSaving,
        // Data pools
        buyersList, itemsMasterList, suppliersList, managersList,
        // Create Order
        showCreateModal, setShowCreateModal, orderNumber, setOrderNumber, buyerName, setBuyerName, createLineItems, setCreateLineItems, createError,
        handleOpenCreateModal, handleAddCreateLineItem, handleRemoveCreateLineItem, handleItemChangeCreate, submitCreateOrder,
        // Assign Order
        showAssignModal, setShowAssignModal, activeAssignOrder, assignPoNumber, setAssignPoNumber, assignType, setAssignType, assigneeId, setAssigneeId, assignDate, setAssignDate,
        assignLineItems, setAssignLineItems, assignDeliveryDate, setAssignDeliveryDate, assignNote, setAssignNote, assignError,
        handleOpenAssignModal, submitAssignOrder,
        // Bulk Assign
        selectedUnassignedItemIds, setSelectedUnassignedItemIds, showBulkAssignModal, setShowBulkAssignModal,
        handleOpenBulkAssignModal, submitBulkAssignOrder, toggleUnassignedItemSelection,
        // Navigation
        expandedAssignedOrderId, setExpandedAssignedOrderId, expandedAssignedGroupId, setExpandedAssignedGroupId,
        expandedAllBuyerName, setExpandedAllBuyerName, expandedAllOrderId, setExpandedAllOrderId,
        assignedSearchQuery, setAssignedSearchQuery,
        // Items
        showCreateItemModal, setShowCreateItemModal, newItemName, setNewItemName,
        newItemCode, setNewItemCode, newItemSize, setNewItemSize, newItemCbm, setNewItemCbm, createItemError,
        handleOpenCreateItemModal, submitCreateItem, handleDeleteItem,
        // Inward & Inventory
        inventoryList, isFetchingInventory, fetchInventory,
        showInwardModal, setShowInwardModal, activeInwardGroup, inwardDate, setInwardDate, inwardChallanNo, setInwardChallanNo,
        inwardItems, setInwardItems, inwardError, setInwardError, handleOpenInwardModal, submitInwardRecord, handleImportExcel, isImporting,
        // Directory
        supplierViewMode, setSupplierViewMode, managerViewMode, setManagerViewMode,
        showCreateSupplierModal, setShowCreateSupplierModal, showCreateManagerModal, setShowCreateManagerModal,
        newDirectoryName, setNewDirectoryName, newDirectoryPhone, setNewDirectoryPhone, newDirectoryEmail, setNewDirectoryEmail, newDirectoryAddress, setNewDirectoryAddress, directoryError,
        handleCreateDirectory, handleDeleteDirectory,
        // Computed
        filteredOrders, groupedAssignments, orderGroupedAssignments, buyerGroupedOrders, unassignedItemsList,
        // Export
        handleDeleteOrder, handleExportExcel, handleExportAssignmentExcel,
    } = w;

    const searchedOrderGroupedAssignments = assignedSearchQuery.trim() === '' ? orderGroupedAssignments : orderGroupedAssignments.filter(og => {
        const query = assignedSearchQuery.toLowerCase();
        if (og.orderNumber?.toLowerCase().includes(query)) return true;
        if (og.assignments.some(a => a.poNumber?.toLowerCase().includes(query))) return true;
        return false;
    });

    // ================= LOGIN GUARD =================
    if (!tWorkflowToken) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="p-8 bg-white rounded-xl shadow-lg w-full max-w-md border border-gray-100">
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-orange-100 text-orange-600 mb-4 shadow-sm">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="6" r="2"></circle><circle cx="12" cy="18" r="2"></circle><path d="M6.7 7.5 10.5 10.5"></path><path d="M17.3 7.5 13.5 10.5"></path><path d="M12 14v2"></path></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">T-Workflow Login</h1>
                        <p className="text-gray-500 text-sm mt-1">Owner access only</p>
                    </div>
                    <form onSubmit={handleWorkflowLogin} className="space-y-5">
                        <div>
                            <input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white transition-colors" required />
                        </div>
                        <div>
                            <input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-gray-50 focus:bg-white transition-colors" required />
                        </div>
                        <button type="submit" className="w-full py-3 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 disabled:bg-orange-400 transition-colors shadow-sm" disabled={isLoggingIn}>
                            {isLoggingIn ? 'Verifying...' : 'Sign In'}
                        </button>
                        {loginError && <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-md">{loginError}</p>}
                    </form>
                    <div className="mt-8 text-center pt-6 border-t border-gray-100">
                        <button onClick={() => setPage('appsList')} className="text-sm font-medium text-gray-500 hover:text-gray-800 transition-colors">
                            ← Back to Applications
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ================= RENDER DIRECTORY TAB =================
    const renderDirectoryTab = (type, list, viewMode, setViewMode, setShowModal) => {
        const isSupplier = type === 'supplier';
        if (viewMode === 'workloads') {
            const workloads = {};
            orders.forEach(order => {
                order.items?.forEach(item => {
                    item.assignments?.forEach(a => {
                        if (a.assign_type === type) {
                            const name = a.assignee_name || 'Unknown';
                            if (!workloads[name]) { workloads[name] = { name: name, totalPieces: 0, orders: {} }; }
                            workloads[name].totalPieces += parseInt(a.assigned_pieces || 0);
                            if (!workloads[name].orders[order.order_number]) { workloads[name].orders[order.order_number] = { order: order, pieces: 0, assignments: [] }; }
                            workloads[name].orders[order.order_number].pieces += parseInt(a.assigned_pieces || 0);
                            workloads[name].orders[order.order_number].assignments.push({ ...a, itemName: item.item_name });
                        }
                    });
                });
            });
            const workloadArr = Object.values(workloads).sort((a,b) => a.name.localeCompare(b.name));
            return (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-4 bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setViewMode('workloads')} className={`px-5 py-2 rounded-md font-medium text-sm transition ${viewMode === 'workloads' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Workloads</button>
                            <button onClick={() => setViewMode('directory')} className={`px-5 py-2 rounded-md font-medium text-sm transition ${viewMode === 'directory' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Directory</button>
                        </div>
                    </div>
                    {workloadArr.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center shadow-sm">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>
                            </div>
                            <p className="text-gray-500 font-medium text-lg">No active workloads for {isSupplier ? 'suppliers' : 'job managers'}.</p>
                            <p className="text-gray-400 text-sm mt-1">Assign orders to see them here.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {workloadArr.map(w => (
                                <div key={w.name} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                    <div className="px-6 py-5 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center font-bold text-xl shadow-inner">{w.name.charAt(0).toUpperCase()}</div>
                                            <div>
                                                <h3 className="font-bold text-gray-900 text-xl">{w.name}</h3>
                                                <div className="flex items-center gap-3 text-sm text-gray-500 mt-0.5">
                                                    <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg> {Object.keys(w.orders).length} Orders</span>
                                                    <span>•</span>
                                                    <span className="flex items-center gap-1 font-medium text-orange-600"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"></path><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg> {w.totalPieces} Pcs</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-gray-50/30">
                                        {Object.values(w.orders).map(orderGrp => (
                                            <div key={orderGrp.order.id} className="bg-white border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition-all group">
                                                <div className="flex justify-between items-start mb-4 pb-3 border-b border-gray-100">
                                                    <div>
                                                        <span className="font-bold text-gray-800 text-lg group-hover:text-orange-600 transition-colors">#{orderGrp.order.order_number}</span>
                                                        <p className="text-sm font-medium text-blue-600 mt-1 mb-0.5">PO: {orderGrp.assignments[0]?.po_number || '-'}</p>
                                                        <p className="text-xs text-gray-500 mt-0.5">{orderGrp.order.buyer_name}</p>
                                                    </div>
                                                    <span className="text-xs font-bold px-2.5 py-1.5 bg-orange-50 text-orange-700 rounded-lg">{orderGrp.pieces} pcs</span>
                                                </div>
                                                <div className="text-sm text-gray-600 space-y-2">
                                                    {orderGrp.assignments.map((a, i) => (
                                                        <div key={i} className="flex justify-between items-center p-2 rounded-md hover:bg-gray-50 transition-colors">
                                                            <span className="truncate pr-2 font-medium" title={a.itemName}>{a.itemName}</span>
                                                            <span className="font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">{a.assigned_pieces}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        } else {
            return (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div className="flex gap-4 bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setViewMode('workloads')} className={`px-5 py-2 rounded-md font-medium text-sm transition ${viewMode === 'workloads' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Workloads</button>
                            <button onClick={() => setViewMode('directory')} className={`px-5 py-2 rounded-md font-medium text-sm transition ${viewMode === 'directory' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Directory</button>
                        </div>
                        <button onClick={() => {
                            setNewDirectoryName(''); setNewDirectoryPhone(''); setNewDirectoryEmail(''); setNewDirectoryAddress('');
                            setShowModal(true);
                        }} className="px-5 py-2.5 bg-orange-600 text-white font-medium text-sm rounded-lg hover:bg-orange-700 shadow-sm flex items-center gap-2 transition-colors">
                            <PlusIcon width="16" height="16" /> Add {isSupplier ? 'Supplier' : 'Job Manager'}
                        </button>
                    </div>
                    {list.length === 0 ? (
                        <div className="bg-white p-12 rounded-2xl border border-gray-100 text-center shadow-sm">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-50 text-gray-400 mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                            </div>
                            <p className="text-gray-500 font-medium text-lg">No directory entries found.</p>
                            <p className="text-gray-400 text-sm mt-1">Click the button above to add one.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                            {list.map(entry => (
                                <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm hover:shadow-md hover:border-blue-300 transition-all flex flex-col group">
                                    <div className="flex justify-between items-start mb-5 pb-4 border-b border-gray-100">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center font-bold text-xl shadow-inner">{entry.name.charAt(0).toUpperCase()}</div>
                                            <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-700 transition-colors">{entry.name}</h3>
                                        </div>
                                        <button onClick={() => handleDeleteDirectory(type, entry.id, entry.name)} className="text-gray-300 hover:text-red-500 p-2 rounded-md hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100">
                                            <TrashIcon width="18" height="18" />
                                        </button>
                                    </div>
                                    <div className="text-sm text-gray-600 space-y-3 flex-1 px-1">
                                        {entry.phone ? <div className="flex items-center gap-3"><svg className="text-gray-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> {entry.phone}</div> : <div className="flex items-center gap-3 text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg> No phone provided</div>}
                                        {entry.email ? <div className="flex items-center gap-3"><svg className="text-gray-400" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg> {entry.email}</div> : <div className="flex items-center gap-3 text-gray-300"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"></rect><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path></svg> No email provided</div>}
                                        {entry.address ? <div className="flex items-start gap-3 mt-3"><svg className="text-gray-400 mt-0.5 min-w-[16px]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg> <span className="leading-relaxed">{entry.address}</span></div> : <div className="flex items-start gap-3 mt-3 text-gray-300"><svg className="mt-0.5 min-w-[16px]" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path><circle cx="12" cy="10" r="3"></circle></svg> No address provided</div>}
                                    </div>
                                    <div className="mt-6 text-xs text-gray-400 bg-gray-50 -mx-6 -mb-6 px-6 py-3 border-t border-gray-100 flex justify-between items-center rounded-b-xl">
                                        <span>Added on {new Date(entry.created_at).toLocaleDateString()}</span>
                                        <span className="font-mono text-[10px]">ID: {entry.id}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            );
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-10">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10 text-[15px]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="5" cy="6" r="2"></circle><circle cx="12" cy="12" r="2"></circle><circle cx="19" cy="6" r="2"></circle><circle cx="12" cy="18" r="2"></circle><path d="M6.7 7.5 10.5 10.5"></path><path d="M17.3 7.5 13.5 10.5"></path><path d="M12 14v2"></path></svg>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800 tracking-tight">T-Workflow</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleOpenCreateModal}
                            className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition shadow-sm"
                        >
                            <PlusIcon />
                            Create Order
                        </button>
                        <button 
                            onClick={() => {
                                localStorage.removeItem('tWorkflowToken');
                                setTWorkflowToken(null);
                            }}
                            className="flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition"
                        >
                            Logout
                        </button>
                    </div>
                </div>
                
                {/* Tabs */}
                <div className="max-w-7xl mx-auto px-6 flex gap-6 mt-2">
                    {['all', 'assigned', 'unassigned'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`pb-3 font-medium text-sm capitalize transition-colors duration-200 ${
                                activeTab === tab 
                                    ? 'text-orange-600 border-b-2 border-orange-600' 
                                    : 'text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {tab} Orders
                        </button>
                    ))}
                    <button
                        onClick={() => setActiveTab('items')}
                        className={`pb-3 font-medium text-sm transition-colors duration-200 ${
                            activeTab === 'items' 
                                ? 'text-orange-600 border-b-2 border-orange-600' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Items
                    </button>
                    <button
                        onClick={() => setActiveTab('unassigned_items')}
                        className={`pb-3 font-medium text-sm transition-colors duration-200 ${
                            activeTab === 'unassigned_items' 
                                ? 'text-orange-600 border-b-2 border-orange-600' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Unassigned Items
                    </button>
                    <button
                        onClick={() => setActiveTab('suppliers')}
                        className={`pb-3 font-medium text-sm transition-colors duration-200 ${
                            activeTab === 'suppliers' 
                                ? 'text-orange-600 border-b-2 border-orange-600' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Suppliers
                    </button>
                    <button
                        onClick={() => setActiveTab('job_managers')}
                        className={`pb-3 font-medium text-sm transition-colors duration-200 ${
                            activeTab === 'job_managers' 
                                ? 'text-orange-600 border-b-2 border-orange-600' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Job Managers
                    </button>
                    <button
                        onClick={() => setActiveTab('inventory')}
                        className={`pb-3 font-medium text-sm transition-colors duration-200 ${
                            activeTab === 'inventory' 
                                ? 'text-orange-600 border-b-2 border-orange-600' 
                                : 'text-gray-500 hover:text-gray-800'
                        }`}
                    >
                        Inventory
                    </button>
                </div>
            </div>

            {/* Dashboard Content */}
            <div className="max-w-7xl mx-auto px-6 pt-8">
                {activeTab === 'items' ? (
                    /* ================= ITEMS TAB ================= */
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Item Catalog</h2>
                            <div className="flex gap-3">
                                <label className={`flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 font-medium rounded-lg transition-colors cursor-pointer shadow-sm text-sm ${isImporting ? 'opacity-70 pointer-events-none' : 'hover:bg-blue-200'}`}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    {isImporting ? 'Importing...' : 'Import Excel'}
                                    <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="hidden" />
                                </label>
                                <button 
                                    onClick={handleOpenCreateItemModal}
                                    className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition shadow-sm text-sm"
                                >
                                    <PlusIcon /> Add Item
                                </button>
                            </div>
                        </div>

                        {itemsMasterList.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-xl font-medium text-gray-600 mb-2">No items yet</h3>
                                <p className="text-gray-400">Add items here or they'll appear automatically when you create orders.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-1">#</div>
                                    <div className="col-span-3">Item Name</div>
                                    <div className="col-span-3">Item Code</div>
                                    <div className="col-span-2">Size</div>
                                    <div className="col-span-1">CBM</div>
                                    <div className="col-span-2 text-right">Actions</div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {itemsMasterList.map((item, index) => (
                                        <div key={item.id} className="grid grid-cols-12 gap-4 px-6 py-3.5 items-center hover:bg-gray-50 transition-colors text-sm">
                                            <div className="col-span-1 text-gray-400 font-mono text-xs">{index + 1}</div>
                                            <div className="col-span-3 font-semibold text-gray-800">{item.item_name}</div>
                                            <div className="col-span-3 text-gray-600 font-mono text-xs">{item.item_code || '-'}</div>
                                            <div className="col-span-2 text-gray-600">{item.size || '-'}</div>
                                            <div className="col-span-1 text-gray-600">{item.cbm || '-'}</div>
                                            <div className="col-span-2 text-right">
                                                <button 
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'unassigned_items' ? (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Unassigned Items</h2>
                            <button 
                                onClick={handleOpenBulkAssignModal}
                                disabled={selectedUnassignedItemIds.length === 0}
                                className={`flex items-center gap-2 px-4 py-2 font-medium rounded-lg transition shadow-sm text-sm ${
                                    selectedUnassignedItemIds.length > 0 
                                        ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                Bulk Assign Selected ({selectedUnassignedItemIds.length})
                            </button>
                        </div>
                        {unassignedItemsList.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-xl font-medium text-gray-600 mb-2">No unassigned items found</h3>
                                <p className="text-gray-400">All your items have been completely assigned.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-1 text-center">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedUnassignedItemIds.length === unassignedItemsList.length && unassignedItemsList.length > 0}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setSelectedUnassignedItemIds(unassignedItemsList.map(i => i.id));
                                                } else {
                                                    setSelectedUnassignedItemIds([]);
                                                }
                                            }}
                                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                                        />
                                    </div>
                                    <div className="col-span-2">Order</div>
                                    <div className="col-span-4">Item Details</div>
                                    <div className="col-span-3 text-center">Pieces</div>
                                    <div className="col-span-2 text-right">Remaining</div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {unassignedItemsList.map((item) => (
                                        <div key={item.id} className={`grid grid-cols-12 gap-4 px-6 py-3.5 items-center transition-colors text-sm ${selectedUnassignedItemIds.includes(item.id) ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                                            <div className="col-span-1 text-center">
                                                <input 
                                                    type="checkbox"
                                                    checked={selectedUnassignedItemIds.includes(item.id)}
                                                    onChange={() => toggleUnassignedItemSelection(item.id)}
                                                    className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500 cursor-pointer"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <div className="font-bold text-gray-800">#{item.orderNumber}</div>
                                                <div className="text-xs text-gray-500">{item.buyerName}</div>
                                            </div>
                                            <div className="col-span-4">
                                                <div className="font-semibold text-gray-800">{item.itemName}</div>
                                                <div className="text-xs text-gray-500 flex gap-2">
                                                    <span>{item.itemCode || 'No Code'}</span>
                                                    <span>&bull;</span>
                                                    <span>{item.size || 'No Size'}</span>
                                                </div>
                                            </div>
                                            <div className="col-span-3 text-center">
                                                <span className="text-gray-500 line-through mr-2">{item.totalPieces}</span>
                                                <span className="text-blue-600 font-medium">({item.assignedPieces} ass.)</span>
                                            </div>
                                            <div className="col-span-2 text-right">
                                                <span className="inline-flex items-center text-xs font-bold px-2.5 py-1 rounded-md bg-orange-100 text-orange-700">
                                                    {item.remainingPieces} pcs
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : activeTab === 'suppliers' ? (
                    renderDirectoryTab('supplier', suppliersList, supplierViewMode, setSupplierViewMode, setShowCreateSupplierModal)
                ) : activeTab === 'job_managers' ? (
                    renderDirectoryTab('job_manager', managersList, managerViewMode, setManagerViewMode, setShowCreateManagerModal)
                ) : activeTab === 'inventory' ? (
                    <div>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-gray-800">Inventory Status</h2>
                            <button onClick={fetchInventory} className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition text-sm">
                                {isFetchingInventory ? 'Refreshing...' : 'Refresh'}
                            </button>
                        </div>
                        {inventoryList.length === 0 ? (
                            <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                                <h3 className="text-xl font-medium text-gray-600 mb-2">No inventory available</h3>
                                <p className="text-gray-400">Receive items via Inward Record to build inventory.</p>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 text-left">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Name</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Item Code</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">Dimensions</th>
                                            <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Available Pcs</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {inventoryList.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-800">{item.item_name}</td>
                                                <td className="px-6 py-4 text-gray-500 font-mono text-sm">{item.item_code || '-'}</td>
                                                <td className="px-6 py-4 text-gray-500 text-sm text-center">{item.size || '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <span className="inline-flex items-center text-sm font-bold px-3 py-1 rounded-full bg-green-100 text-green-700">
                                                        {item.total_pieces} pcs
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : isLoading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-orange-600 rounded-full animate-spin"></div>
                    </div>
                ) : activeTab === 'assigned' ? (
                     <div className="space-y-6">
                         {!expandedAssignedOrderId && !expandedAssignedGroupId && (
                             <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                 <h3 className="text-lg font-bold text-gray-800">Assigned Orders</h3>
                                 <div className="relative w-72">
                                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                         <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
                                     </div>
                                     <input
                                         type="text"
                                         placeholder="Search Order or PO Number..."
                                         value={assignedSearchQuery}
                                         onChange={(e) => setAssignedSearchQuery(e.target.value)}
                                         className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                                     />
                                 </div>
                             </div>
                         )}
                         {searchedOrderGroupedAssignments.length === 0 ? (
                             <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                                 <h3 className="text-xl font-medium text-gray-600 mb-2">No assigned orders found</h3>
                                 <p className="text-gray-400">Try adjusting your search query or assign some items.</p>
                             </div>
                         ) : expandedAssignedGroupId ? (
                         /* ---- LEVEL 3: DEDICATED ASSIGNMENT VIEW ---- */
                         (() => {
                             let targetGroup = null;
                             orderGroupedAssignments.forEach(og => {
                                 og.assignments.forEach(g => {
                                     if (g.id === expandedAssignedGroupId) targetGroup = g;
                                 });
                             });
                             if (!targetGroup) return null;
                             return (
                                 <div>
                                     <button
                                         onClick={() => setExpandedAssignedGroupId(null)}
                                         className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-5 transition-colors"
                                     >
                                         <BackArrowIcon /> Back to Assignments List
                                     </button>
                                     <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition">
                                         <div className="flex justify-between items-start mb-5 border-b border-gray-100 pb-4">
                                             <div>
                                                 <div className="flex items-center gap-3 mb-1">
                                                     <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${targetGroup.assignType === 'supplier' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                         {targetGroup.assignType === 'supplier' ? 'SUPPLIER' : 'JOB MANAGER'}: {targetGroup.assigneeName.toUpperCase()}
                                                     </span>
                                                     <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                         PO: {targetGroup.poNumber || '-'}
                                                     </span>
                                                 </div>
                                                 <div className="text-gray-600 text-sm flex gap-3 mt-1">
                                                     <p><span className="font-medium">Assign Date:</span> {new Date(targetGroup.assignDate).toLocaleDateString('en-GB')}</p>
                                                     {targetGroup.deliveryDate && (
                                                         <>
                                                             <p>&bull;</p>
                                                             <p><span className="font-medium">Del. Date:</span> {new Date(targetGroup.deliveryDate).toLocaleDateString('en-GB')}</p>
                                                         </>
                                                     )}
                                                 </div>
                                                 {targetGroup.note && <p className="text-sm mt-1 text-gray-500 italic">Note: {targetGroup.note}</p>}
                                             </div>
                                             <div className="text-right flex items-center gap-3">
                                                 <button 
                                                     onClick={() => handleOpenInwardModal(targetGroup)}
                                                     className="flex items-center gap-2 px-3 py-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors border border-indigo-200 bg-indigo-50/50"
                                                     title="Inward Record"
                                                 >
                                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                                     <span className="text-sm font-medium">Inward Record</span>
                                                 </button>
                                                 {targetGroup.assignType === 'supplier' && (
                                                     <button 
                                                         onClick={() => handleExportAssignmentExcel(targetGroup)}
                                                         className="flex items-center gap-2 px-3 py-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors border border-green-200 bg-green-50/50"
                                                         title="Export Excel"
                                                     >
                                                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5"/></svg>
                                                         <span className="text-sm font-medium">Export Excel</span>
                                                     </button>
                                                 )}
                                             </div>
                                         </div>
                                         
                                         <div>
                                             <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 tracking-wider mb-2 px-2 uppercase">
                                                 <div className="col-span-4">Item</div>
                                                 <div className="col-span-3 text-center">Dimensions</div>
                                                 <div className="col-span-2 text-center">Rate</div>
                                                 <div className="col-span-3 text-right">Assigned / Rec'd</div>
                                             </div>
                                             <div className="space-y-2">
                                                 {targetGroup.items.map(item => (
                                                     <div key={item.itemId} className="grid grid-cols-12 gap-4 items-center bg-gray-50 p-3 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors">
                                                         <div className="col-span-4">
                                                             <p className="text-sm font-bold text-gray-800">{item.itemName}</p>
                                                             <p className="text-xs text-gray-500 font-mono mt-0.5">{item.itemCode || 'No Code'}</p>
                                                         </div>
                                                         <div className="col-span-3 text-center text-sm text-gray-600">{item.size || '-'}</div>
                                                         <div className="col-span-2 text-center text-sm font-medium text-gray-800">₹{item.rate}</div>
                                                         <div className="col-span-3 text-right text-sm">
                                                             <span className="font-bold text-gray-800">{item.assignedPieces}</span>
                                                             <span className="text-gray-400 mx-1">/</span>
                                                             <span className={`font-bold ${item.receivedPieces >= item.assignedPieces ? 'text-green-600' : 'text-orange-500'}`}>{item.receivedPieces || 0}</span>
                                                         </div>
                                                     </div>
                                                 ))}
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             );
                         })()
                     ) : expandedAssignedOrderId ? (
                         /* ---- LEVEL 2: LIST OF ASSIGNMENTS FOR ORDER ---- */
                         (() => {
                             const orderGroup = orderGroupedAssignments.find(og => og.orderId === expandedAssignedOrderId);
                             if (!orderGroup) return null;
                             return (
                                 <div>
                                     <button
                                         onClick={() => setExpandedAssignedOrderId(null)}
                                         className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-5 transition-colors"
                                     >
                                         <BackArrowIcon /> Back to Assigned Orders
                                     </button>
                                     <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex justify-between items-center">
                                         <div>
                                             <h2 className="text-xl font-bold text-gray-900 mb-1">Order #{orderGroup.orderNumber}</h2>
                                             <p className="text-sm text-gray-500">Buyer: {orderGroup.buyerName} &bull; {orderGroup.assignments.length} assignment(s)</p>
                                         </div>
                                     </div>
                                     <div className="grid gap-4">
                                         {orderGroup.assignments.map(group => {
                                             const totalPcs = group.items.reduce((s, i) => s + i.assignedPieces, 0);
                                             return (
                                                 <div 
                                                     key={group.id} 
                                                     onClick={() => setExpandedAssignedGroupId(group.id)}
                                                     className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer flex justify-between items-center"
                                                 >
                                                     <div>
                                                         <div className="flex items-center gap-3 mb-1">
                                                             <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${group.assignType === 'supplier' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                                                                 {group.assignType === 'supplier' ? 'SUPPLIER' : 'JOB MANAGER'}: {(group.assigneeName || 'Unknown').toUpperCase()}
                                                             </span>
                                                             <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                                                                 PO: {group.poNumber || '-'}
                                                             </span>
                                                         </div>
                                                         <p className="text-sm text-gray-500">
                                                             <span className="font-medium">Assigned Pieces:</span> {totalPcs}
                                                             <span className="mx-2">&bull;</span>
                                                             <span className="font-medium">Date:</span> {new Date(group.assignDate).toLocaleDateString('en-GB')}
                                                         </p>
                                                     </div>
                                                     <div className="text-gray-400">
                                                         <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                                     </div>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                 </div>
                             );
                         })()
                     ) : (
                         /* ---- LEVEL 1: ORDER LIST VIEW: grouped by order number ---- */
                         <div className="grid gap-4">
                             {searchedOrderGroupedAssignments.map(orderGroup => {
                                 const totalAssignedPcs = orderGroup.assignments.reduce((sum, g) => sum + g.items.reduce((s, i) => s + i.assignedPieces, 0), 0);
                                 const uniqueAssignees = [...new Set(orderGroup.assignments.map(a => a.assigneeName))];
                                 return (
                                     <div 
                                         key={orderGroup.orderId} 
                                         onClick={() => setExpandedAssignedOrderId(orderGroup.orderId)}
                                         className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer"
                                     >
                                         <div className="flex justify-between items-center">
                                             <div>
                                                 <div className="flex items-center gap-3 mb-1">
                                                     <h3 className="text-[18px] font-bold text-gray-900">Order #{orderGroup.orderNumber}</h3>
                                                     <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">
                                                         {orderGroup.assignments.length} Assignment{orderGroup.assignments.length > 1 ? 's' : ''}
                                                     </span>
                                                     <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                                                         {totalAssignedPcs} pcs assigned
                                                     </span>
                                                 </div>
                                                 <p className="text-sm text-gray-500">
                                                     <span className="font-medium">Buyer:</span> {orderGroup.buyerName}
                                                     <span className="mx-2">&bull;</span>
                                                     <span className="font-medium">Assigned to:</span> {uniqueAssignees.join(', ')}
                                                 </p>
                                             </div>
                                             <div className="text-gray-400">
                                                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                             </div>
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     )}
                     </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
                        <h3 className="text-xl font-medium text-gray-600 mb-2">No {activeTab} orders found</h3>
                        <p className="text-gray-400">Click the 'Create Order' button to get started.</p>
                    </div>
                ) : expandedAllOrderId ? (
                    /* ---- LEVEL 3: Order Details ---- */
                    (() => {
                        const order = filteredOrders.find(o => o.id === expandedAllOrderId);
                        if (!order) return null;
                        return (
                            <div>
                                <button
                                    onClick={() => setExpandedAllOrderId(null)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-5 transition-colors"
                                >
                                    <BackArrowIcon /> Back to Orders
                                </button>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-5 border-b border-gray-100 pb-4">
                                        <div>
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-[19px] font-bold text-gray-900">Order #{order.order_number}</h3>
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                                    order.status === 'unassigned' ? 'bg-gray-100 text-gray-600' :
                                                    order.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {order.status.toUpperCase()}
                                                </span>
                                            </div>
                                            <div className="text-gray-600 text-sm flex gap-3">
                                                <p><span className="font-medium">Buyer:</span> {order.buyer_name}</p>
                                                <p>&bull;</p>
                                                <p className="text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                        <div className="text-right flex items-center gap-3">
                                            {/* Status dynamically calculates if unassigned pieces > 0 */}
                                            {order.status === 'unassigned' && (
                                                <button 
                                                    onClick={() => handleOpenAssignModal(order)}
                                                    className="px-4 py-2 bg-orange-50 text-orange-600 font-medium rounded-lg hover:bg-orange-100 transition-colors shadow-sm"
                                                >
                                                    Assign Order
                                                </button>
                                            )}
                                            {order.status === 'assigned' && order.assigned_to_name && (
                                                <p className="text-blue-600 font-medium px-4 py-2 bg-blue-50 rounded-lg">{order.assigned_to_name}</p>
                                            )}
                                            
                                            {(order.status === 'assigned' || order.items?.some(i => i.assigned_pieces > 0)) && order.items?.some(i => i.assignments?.some(a => a.assign_type === 'supplier')) && (
                                                <button 
                                                    onClick={() => handleExportExcel(order)}
                                                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                                    title="Export Excel"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M14 2v4a2 2 0 0 0 2 2h4"></path><path d="M3 15v4c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-4M17 9l-5 5-5-5M12 12.8V2.5"/></svg>
                                                </button>
                                            )}
                                            
                                            <button 
                                                onClick={() => handleDeleteOrder(order.id, order.order_number)}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                                title="Delete Order"
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-gray-500 tracking-wider mb-2 px-2 uppercase">
                                            <div className="col-span-5">Item</div>
                                            <div className="col-span-2 text-center">Dimensions</div>
                                            <div className="col-span-2 text-center">Total Pcs</div>
                                            <div className="col-span-3 text-right">Assigned</div>
                                        </div>
                                        <div className="space-y-2">
                                            {order.items?.map(item => (
                                                <div key={item.id} className="grid grid-cols-12 gap-4 items-center bg-gray-50 rounded-lg p-3 text-sm">
                                                    <div className="col-span-5 font-medium text-gray-800">
                                                        {item.item_name} <span className="text-gray-400 font-normal">({item.item_code})</span>
                                                    </div>
                                                    <div className="col-span-2 text-center text-gray-600 font-mono text-xs">{item.size || '-'}</div>
                                                    <div className="col-span-2 text-center text-gray-700 font-semibold">{item.pieces} pcs</div>
                                                    <div className="col-span-3 text-right">
                                                         {item.assigned_pieces > 0 ? (
                                                              <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                                                  {item.assigned_pieces} assigned
                                                              </span>
                                                         ) : (
                                                              <span className="text-gray-400 font-medium text-xs">0</span>
                                                         )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })()
                ) : expandedAllBuyerName ? (
                    /* ---- LEVEL 2: Buyer's Orders ---- */
                    (() => {
                        const buyerGroup = buyerGroupedOrders.find(bg => bg.buyerName === expandedAllBuyerName);
                        if (!buyerGroup) return null;
                        return (
                            <div>
                                <button
                                    onClick={() => setExpandedAllBuyerName(null)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800 mb-5 transition-colors"
                                >
                                    <BackArrowIcon /> Back to All Buyers
                                </button>
                                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-6 flex justify-between items-center">
                                    <div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-1">{buyerGroup.buyerName}</h2>
                                        <p className="text-sm text-gray-500">{buyerGroup.orders.length} Order(s)</p>
                                    </div>
                                </div>
                                <div className="grid gap-4">
                                    {buyerGroup.orders.map(order => (
                                        <div 
                                            key={order.id}
                                            onClick={() => setExpandedAllOrderId(order.id)}
                                            className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer flex justify-between items-center"
                                        >
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h3 className="text-[18px] font-bold text-gray-900">Order #{order.order_number}</h3>
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                                        order.status === 'unassigned' ? 'bg-gray-100 text-gray-600' :
                                                        order.status === 'assigned' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-green-100 text-green-700'
                                                    }`}>
                                                        {order.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleDateString()}</p>
                                            </div>
                                            <div className="text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                ) : (activeTab === 'all' || activeTab === 'unassigned') ? (
                    /* ---- LEVEL 1: Buyer Group List ---- */
                    <div className="grid gap-4">
                        {buyerGroupedOrders.map(group => (
                            <div 
                                key={group.buyerName} 
                                onClick={() => setExpandedAllBuyerName(group.buyerName)}
                                className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-blue-200 transition cursor-pointer flex justify-between items-center"
                            >
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-[18px] font-bold text-gray-900">{group.buyerName}</h3>
                                        <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-700">
                                            {group.orders.length} Order{group.orders.length > 1 ? 's' : ''}
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-500">
                                        <span className="font-medium">Pieces:</span> {group.assignedPieces} assigned / {group.totalPieces} total
                                    </p>
                                </div>
                                <div className="text-gray-400">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </div>

            {/* Create Order Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-[800px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Create New Order</h2>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {createError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                    {createError}
                                </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Order Number</label>
                                    <input 
                                        type="text" 
                                        value={orderNumber}
                                        onChange={(e) => setOrderNumber(e.target.value)}
                                        className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Buyer Name</label>
                                    <input 
                                        type="text" 
                                        list="buyers-list"
                                        value={buyerName}
                                        onChange={(e) => setBuyerName(e.target.value)}
                                        placeholder="Enter or select buyer"
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                                    />
                                    <datalist id="buyers-list">
                                        {buyersList.map((buyer, idx) => <option key={idx} value={buyer} />)}
                                    </datalist>
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="block text-sm font-medium text-gray-700 mb-3">Items</label>
                                <div className="space-y-3">
                                    {createLineItems.map((item, index) => (
                                        <div key={item.id} className="flex gap-3 items-start group">
                                            <div className="flex-1">
                                                <input 
                                                    type="text" 
                                                    list="products-list"
                                                    value={item.itemName}
                                                    onChange={(e) => handleItemChangeCreate(item.id, e.target.value)}
                                                    placeholder="Item Name"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>
                                            <div className="w-1/4 relative">
                                                 <input 
                                                    type="text" 
                                                    value={item.itemCode}
                                                    onChange={(e) => setCreateLineItems(createLineItems.map(x => x.id === item.id ? { ...x, itemCode: e.target.value } : x))}
                                                    placeholder="Item Code"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>
                                            <div className="w-24 relative">
                                                <input 
                                                    type="text" 
                                                    value={item.size}
                                                    onChange={(e) => setCreateLineItems(createLineItems.map(x => x.id === item.id ? { ...x, size: e.target.value } : x))}
                                                    placeholder="Size (L x B) etc"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                                                />
                                            </div>
                                            <div className="w-20 relative">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={item.cbm}
                                                    onChange={(e) => setCreateLineItems(createLineItems.map(x => x.id === item.id ? { ...x, cbm: e.target.value } : x))}
                                                    placeholder="CBM"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 text-center"
                                                />
                                            </div>
                                            <div className="w-20 relative">
                                                <input 
                                                    type="number" 
                                                    min="1"
                                                    value={item.pieces}
                                                    onChange={(e) => setCreateLineItems(createLineItems.map(x => x.id === item.id ? { ...x, pieces: e.target.value } : x))}
                                                    placeholder="Pcs"
                                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-semibold text-center"
                                                />
                                            </div>
                                            <div className="pt-1 w-8 flex justify-center">
                                                {createLineItems.length > 1 && (
                                                    <button 
                                                        onClick={() => handleRemoveCreateLineItem(item.id)}
                                                        className="text-red-400 hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors opacity-50 group-hover:opacity-100"
                                                    >
                                                        <TrashIcon />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <datalist id="products-list">
                                        {itemsMasterList.map(p => <option key={p.id} value={p.item_name} />)}
                                </datalist>
                                
                                <button 
                                    onClick={handleAddCreateLineItem}
                                    className="mt-4 flex items-center gap-1.5 text-sm font-medium text-orange-600 hover:text-orange-700 px-3 py-2 rounded-lg hover:bg-orange-50 transition-colors border border-dashed border-orange-300"
                                >
                                    <PlusIcon width="16" height="16" /> Add Another Item
                                </button>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowCreateModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitCreateOrder}
                                disabled={isSaving}
                                className={`px-6 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-700'}`}
                            >
                                {isSaving ? 'Saving...' : 'Create Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Assign Order Modal */}
            {showAssignModal && activeAssignOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                     <div className="bg-white rounded-2xl w-full max-w-[800px] max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Assign Order</h2>
                                <p className="text-sm text-gray-500">Order #{activeAssignOrder.order_number} • Buyer: {activeAssignOrder.buyer_name}</p>
                            </div>
                            <button onClick={() => setShowAssignModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {assignError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                    {assignError}
                                </div>
                            )}

                            <div className="mb-6 p-5 bg-blue-50 border border-blue-100 rounded-xl">
                                <h3 className="text-sm font-bold text-blue-900 mb-4 uppercase tracking-wider">Assignment Details</h3>
                                <div className="grid grid-cols-2 gap-5">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Whom to assign?</label>
                                        <div className="flex bg-white rounded-lg border border-gray-300 overflow-hidden">
                                            <button 
                                                className={`flex-1 py-2 text-sm font-medium transition ${assignType === 'supplier' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                                                onClick={() => setAssignType('supplier')}
                                            >
                                                Supplier
                                            </button>
                                            <button 
                                                className={`flex-1 py-2 text-sm font-medium border-l border-gray-300 transition ${assignType === 'job_manager' ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                                                onClick={() => setAssignType('job_manager')}
                                            >
                                                Job Manager
                                            </button>
                                        </div>
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {assignType === 'supplier' ? 'Supplier Name' : 'Job Manager Name'}
                                        </label>
                                        <select 
                                            value={assigneeId}
                                            onChange={(e) => setAssigneeId(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="">Select a {assignType === 'supplier' ? 'supplier' : 'manager'}</option>
                                            {assignType === 'supplier'
                                                ? suppliersList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)
                                                : managersList.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)
                                            }
                                        </select>
                                    </div>

                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign Date</label>
                                        <input 
                                            type="date" 
                                            value={assignDate}
                                            onChange={(e) => setAssignDate(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                                        <input 
                                            type="date" 
                                            value={assignDeliveryDate}
                                            onChange={(e) => setAssignDeliveryDate(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                                        <input 
                                            type="text" 
                                            value={assignPoNumber}
                                            onChange={(e) => setAssignPoNumber(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                                        <input 
                                            type="text" 
                                            value={assignNote}
                                            onChange={(e) => setAssignNote(e.target.value)}
                                            placeholder="Add any global notes here..."
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <div>
                                <h3 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-200 pb-2">Items to Assign</h3>
                                <div className="space-y-3">
                                    <div className="grid grid-cols-8 gap-3 text-xs font-semibold text-gray-500 uppercase px-1">
                                        <div className="col-span-3">Item</div>
                                        <div className="col-span-1 text-center">Rem. Pcs</div>
                                        <div className="col-span-2 text-center">Rate</div>
                                        <div className="col-span-2 text-right">Assign Pcs</div>
                                    </div>
                                    
                                    {assignLineItems.map((item, index) => (
                                        <div key={item.orderItemId} className={`grid grid-cols-8 gap-3 items-center p-3 rounded-lg border ${item.maxPieces > 0 ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-60'}`}>
                                            <div className="col-span-3 font-medium text-gray-800 text-sm truncate" title={item.itemName}>
                                                {item.itemName}
                                            </div>
                                            <div className="col-span-1 text-center text-sm font-bold text-gray-700">
                                                {item.maxPieces}
                                            </div>
                                            <div className="col-span-2">
                                                <input 
                                                    type="number"
                                                    disabled={item.maxPieces === 0}
                                                    value={item.rate}
                                                    onChange={(e) => {
                                                         setAssignLineItems(assignLineItems.map(x => 
                                                             x.orderItemId === item.orderItemId ? { ...x, rate: e.target.value } : x
                                                         ));
                                                    }}
                                                    placeholder="Rate"
                                                    className="w-full px-2 py-1.5 border rounded-md text-xs border-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100 text-center"
                                                />
                                            </div>
                                            <div className="col-span-2 flex justify-end h-full items-center">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    max={item.maxPieces}
                                                    disabled={item.maxPieces === 0}
                                                    value={item.piecesToAssign}
                                                    onChange={(e) => {
                                                         setAssignLineItems(assignLineItems.map(x => 
                                                             x.orderItemId === item.orderItemId ? { ...x, piecesToAssign: e.target.value } : x
                                                         ));
                                                    }}
                                                    placeholder="0"
                                                    className={`w-full px-2 py-2 border rounded-md text-sm focus:outline-none text-right font-bold ${
                                                        item.maxPieces > 0 ? 'border-blue-300 focus:ring-2 focus:ring-blue-500 bg-blue-50/30' : 'border-gray-200 bg-gray-100 cursor-not-allowed text-gray-400'
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowAssignModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitAssignOrder}
                                disabled={isSaving}
                                className={`px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                            >
                                {isSaving ? 'Processing...' : 'Confirm Assignment'}
                            </button>
                        </div>
                    </div>
                 </div>
            )}

            {/* Create Item Modal */}
            {showCreateItemModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-[500px] flex flex-col shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Add New Item</h2>
                            <button onClick={() => setShowCreateItemModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6">
                            {createItemError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                    {createItemError}
                                </div>
                            )}
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                                    <input 
                                        type="text" 
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        placeholder="Enter item name"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Item Code</label>
                                    <input 
                                        type="text" 
                                        value={newItemCode}
                                        onChange={(e) => setNewItemCode(e.target.value)}
                                        placeholder="Enter item code"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400 font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Size / Dimensions</label>
                                    <input 
                                        type="text" 
                                        value={newItemSize}
                                        onChange={(e) => setNewItemSize(e.target.value)}
                                        placeholder="e.g. 12x12x24, L, XL"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">CBM</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={newItemCbm}
                                        onChange={(e) => setNewItemCbm(e.target.value)}
                                        placeholder="Enter CBM value"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-gray-400"
                                    />
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowCreateItemModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitCreateItem}
                                disabled={isSaving}
                                className={`px-6 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-700'}`}
                            >
                                {isSaving ? 'Saving...' : 'Add Item'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Bulk Assign Modal */}
            {showBulkAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-[900px] max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Bulk Assign Items</h2>
                            <button onClick={() => setShowBulkAssignModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {assignError && (
                                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                                    {assignError}
                                </div>
                            )}

                            <div className="bg-gray-50 p-5 rounded-xl border border-gray-200 mb-6">
                                <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4 border-b border-gray-200 pb-2">Global Assignment Details</h3>
                                <div className="grid grid-cols-2 gap-5">
                                    {/* Assign Type */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign To Role *</label>
                                        <select 
                                            value={assignType} 
                                            onChange={(e) => {
                                                setAssignType(e.target.value);
                                                setAssigneeId('');
                                            }}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                        >
                                            <option value="supplier">Supplier</option>
                                            <option value="job_manager">Job Manager</option>
                                        </select>
                                    </div>
                                    
                                    {/* Assignee Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            {assignType === 'supplier' ? 'Supplier Name *' : 'Manager Name *'}
                                        </label>
                                        <select 
                                            value={assigneeId} 
                                            onChange={(e) => setAssigneeId(e.target.value)} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                        >
                                            <option value="">Select a {assignType}</option>
                                            {assignType === 'supplier'
                                                ? suppliersList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)
                                                : managersList.map(m => <option key={m.id} value={m.id}>{m.name}</option>)
                                            }
                                        </select>
                                    </div>

                                    {/* Assign Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign Date *</label>
                                        <input 
                                            type="date" 
                                            value={assignDate} 
                                            onChange={(e) => setAssignDate(e.target.value)} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                        />
                                    </div>
                                    
                                    {/* Delivery Date */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Global Delivery Date</label>
                                        <input 
                                            type="date" 
                                            value={assignDeliveryDate} 
                                            onChange={(e) => setAssignDeliveryDate(e.target.value)} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                        />
                                    </div>

                                    {/* PO Number */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">PO Number *</label>
                                        <input 
                                            type="text" 
                                            value={assignPoNumber} 
                                            onChange={(e) => setAssignPoNumber(e.target.value)} 
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white font-medium"
                                        />
                                    </div>

                                    {/* Note */}
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Global Note / Instruction</label>
                                        <input 
                                            type="text" 
                                            value={assignNote} 
                                            onChange={(e) => setAssignNote(e.target.value)} 
                                            placeholder="Any special instructions for this assignment..."
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                                        />
                                    </div>
                                </div>
                            </div>
                            
                            <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 px-1">Selected Items to Assign</h3>
                            
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                                <div className="grid grid-cols-10 gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <div className="col-span-2">Order</div>
                                    <div className="col-span-3">Item Details</div>
                                    <div className="col-span-2 text-center">Remaining</div>
                                    <div className="col-span-2 text-center">Pcs to Assign</div>
                                    <div className="col-span-1 text-center">Rate</div>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {assignLineItems.map((item, index) => (
                                        <div key={index} className={`grid grid-cols-10 gap-3 px-4 py-3 items-center text-sm ${item.maxPieces === 0 ? 'bg-gray-50 opacity-60' : 'hover:bg-gray-50'} transition-colors`}>
                                            <div className="col-span-2 font-bold text-gray-800">
                                                #{item.orderNumber}
                                            </div>
                                            <div className="col-span-3">
                                                <div className="font-medium text-gray-800">{item.itemName} <span className="text-gray-400 font-normal">({item.itemCode})</span></div>
                                                <div className="text-xs text-gray-500 mt-0.5">{item.size || '-'}</div>
                                            </div>
                                            <div className="col-span-2 text-center font-medium text-orange-600">
                                                {item.maxPieces} pcs
                                            </div>
                                            <div className="col-span-2">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    max={item.maxPieces}
                                                    value={item.piecesToAssign}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        const newArr = [...assignLineItems];
                                                        newArr[index].piecesToAssign = val;
                                                        setAssignLineItems(newArr);
                                                    }}
                                                    placeholder="0"
                                                    disabled={item.maxPieces === 0}
                                                    className="w-full px-3 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center"
                                                />
                                            </div>
                                            <div className="col-span-1">
                                                <input 
                                                    type="number" 
                                                    min="0"
                                                    step="0.01"
                                                    value={item.rate}
                                                    onChange={(e) => {
                                                        const newArr = [...assignLineItems];
                                                        newArr[index].rate = e.target.value;
                                                        setAssignLineItems(newArr);
                                                    }}
                                                    placeholder="-"
                                                    disabled={item.maxPieces === 0}
                                                    className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xs"
                                                />
                                            </div>

                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button 
                                onClick={() => setShowBulkAssignModal(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={submitBulkAssignOrder}
                                disabled={isSaving}
                                className={`px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}
                            >
                                {isSaving ? 'Processing...' : 'Confirm Bulk Assignment'}
                            </button>
                        </div>
                    </div>
                 </div>
            )}

            {/* Create Supplier Modal */}
            {showCreateSupplierModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Add New Supplier</h2>
                            <button onClick={() => setShowCreateSupplierModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6">
                            {directoryError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{directoryError}</div>}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input type="text" value={newDirectoryName} onChange={(e) => setNewDirectoryName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="E.g. RK Textiles" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input type="text" value={newDirectoryPhone} onChange={(e) => setNewDirectoryPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="+91 9876543210" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={newDirectoryEmail} onChange={(e) => setNewDirectoryEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="contact@supplier.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea value={newDirectoryAddress} onChange={(e) => setNewDirectoryAddress(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Full business address..." rows="3"></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowCreateSupplierModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={() => handleCreateDirectory('supplier')} disabled={isSaving} className={`px-6 py-2.5 text-sm font-medium text-white bg-orange-600 rounded-lg transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-orange-700'}`}>
                                {isSaving ? 'Saving...' : 'Add Supplier'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Job Manager Modal */}
            {showCreateManagerModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-800">Add New Job Manager</h2>
                            <button onClick={() => setShowCreateManagerModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        <div className="p-6">
                            {directoryError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{directoryError}</div>}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                                    <input type="text" value={newDirectoryName} onChange={(e) => setNewDirectoryName(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="E.g. John Doe" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                                    <input type="text" value={newDirectoryPhone} onChange={(e) => setNewDirectoryPhone(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="+91 9876543210" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input type="email" value={newDirectoryEmail} onChange={(e) => setNewDirectoryEmail(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="manager@company.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                                    <textarea value={newDirectoryAddress} onChange={(e) => setNewDirectoryAddress(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500" placeholder="Full address..." rows="3"></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                            <button onClick={() => setShowCreateManagerModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={() => handleCreateDirectory('job_manager')} disabled={isSaving} className={`px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
                                {isSaving ? 'Saving...' : 'Add Job Manager'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inward Record Modal */}
            {showInwardModal && activeInwardGroup && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
                    <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
                            <div>
                                <h2 className="text-xl font-bold text-gray-800">Inward Record</h2>
                                <p className="text-sm text-gray-500 mt-1">Order #{activeInwardGroup.orderNumber} • {activeInwardGroup.assignType === 'supplier' ? 'Supplier' : 'Job Manager'}: {activeInwardGroup.assigneeName}</p>
                            </div>
                            <button onClick={() => setShowInwardModal(false)} className="text-gray-400 hover:text-gray-700 text-2xl leading-none">&times;</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1">
                            {inwardError && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">{inwardError}</div>}
                            
                            <div className="grid grid-cols-2 gap-6 mb-6">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                                    <input 
                                        type="date" 
                                        value={inwardDate} 
                                        onChange={(e) => setInwardDate(e.target.value)} 
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Challan No.</label>
                                    <input 
                                        type="text" 
                                        value={inwardChallanNo} 
                                        onChange={(e) => setInwardChallanNo(e.target.value)} 
                                        placeholder="Enter Challan Number..."
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                    />
                                </div>
                            </div>

                            <div className="border rounded-xl overflow-hidden bg-white">
                                <table className="min-w-full divide-y divide-gray-200 text-left">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Item Name</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Assigned</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Previously Rec'd</th>
                                            <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Pending</th>
                                            <th className="px-4 py-3 text-xs font-bold text-indigo-600 uppercase text-center">Receive Now</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {inwardItems.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-gray-800">{item.itemName}</div>
                                                    <div className="text-xs text-gray-500">{item.itemCode || 'No code'} • {item.size || 'No size'}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center text-sm font-medium">{item.assignedPieces}</td>
                                                <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">{item.previouslyReceived}</td>
                                                <td className="px-4 py-3 text-center text-sm text-orange-500 font-bold">{item.maxPieces}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <input 
                                                        type="number"
                                                        min="0"
                                                        max={item.maxPieces}
                                                        value={item.piecesToReceive}
                                                        onChange={(e) => {
                                                            const newItems = [...inwardItems];
                                                            newItems[idx].piecesToReceive = e.target.value;
                                                            setInwardItems(newItems);
                                                        }}
                                                        disabled={item.maxPieces === 0}
                                                        placeholder={item.maxPieces === 0 ? "Done" : "0"}
                                                        className={`w-20 px-3 py-1.5 text-center border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold ${item.maxPieces === 0 ? 'bg-gray-100 text-gray-400 border-gray-200' : 'border-gray-300 text-indigo-700 bg-indigo-50'}`}
                                                    />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        
                        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 rounded-b-2xl">
                            <button onClick={() => setShowInwardModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition">Cancel</button>
                            <button 
                                onClick={submitInwardRecord} 
                                disabled={isSaving} 
                                className={`px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-lg transition shadow-sm ${isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-indigo-700'}`}
                            >
                                {isSaving ? 'Saving...' : 'Confirm Inward'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
