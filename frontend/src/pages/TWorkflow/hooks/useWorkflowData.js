import { useState, useEffect, useMemo } from 'react';
import React from 'react';
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import api from '../../../api';
import { generateAssignmentExcel } from '../../../utils/excelGenerator';
import * as XLSX from 'xlsx-js-style';

export default function useWorkflowData() {
    const [tWorkflowToken, setTWorkflowToken] = useState(localStorage.getItem('tWorkflowToken'));
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const [activeTab, setActiveTab] = useState('unassigned');
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const workflowApi = React.useMemo(() => {
        const instance = axios.create({ baseURL: api.defaults.baseURL });
        instance.interceptors.request.use(config => {
            const token = localStorage.getItem('tWorkflowToken');
            if (token) config.headers.Authorization = `Bearer ${token}`;
            if (config.method === 'get') config.params = { ...config.params, _t: Date.now() };
            return config;
        });
        instance.interceptors.response.use(
            response => response,
            error => {
                if (error.response && error.response.status === 401) {
                    localStorage.removeItem('tWorkflowToken');
                    setTWorkflowToken(null);
                }
                return Promise.reject(error);
            }
        );
        return instance;
    }, []);

    // --- Data Pools ---
    const [buyersList, setBuyersList] = useState([]);
    const [itemsMasterList, setItemsMasterList] = useState([]);
    const [suppliersList, setSuppliersList] = useState([]);
    const [managersList, setManagersList] = useState([]);

    // --- Items Tab State ---
    const [showCreateItemModal, setShowCreateItemModal] = useState(false);
    const [newItemName, setNewItemName] = useState('');
    const [newItemCode, setNewItemCode] = useState('');
    const [newItemSize, setNewItemSize] = useState('');
    const [newItemCbm, setNewItemCbm] = useState('');
    const [createItemError, setCreateItemError] = useState('');

    // --- Create Order Modal State ---
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [buyerName, setBuyerName] = useState('');
    const [createLineItems, setCreateLineItems] = useState([
        { id: Date.now(), itemName: '', itemCode: '', size: '', cbm: '', pieces: '' }
    ]);
    const [createError, setCreateError] = useState('');

    // --- Assign Order Modal State ---
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [activeAssignOrder, setActiveAssignOrder] = useState(null);
    const [assignPoNumber, setAssignPoNumber] = useState('');
    const [assignType, setAssignType] = useState('supplier');
    const [assigneeId, setAssigneeId] = useState('');
    const [assignDate, setAssignDate] = useState(new Date().toISOString().split('T')[0]);
    const [assignLineItems, setAssignLineItems] = useState([]);
    const [assignDeliveryDate, setAssignDeliveryDate] = useState('');
    const [assignNote, setAssignNote] = useState('');
    const [assignError, setAssignError] = useState('');

    // --- Bulk Assign State ---
    const [selectedUnassignedItemIds, setSelectedUnassignedItemIds] = useState([]);
    const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);

    // --- Assigned Orders Grouped State ---
    const [assignedSearchQuery, setAssignedSearchQuery] = useState('');
    const [expandedAssignedOrderId, setExpandedAssignedOrderId] = useState(null);
    const [expandedAssignedGroupId, setExpandedAssignedGroupId] = useState(null);

    // --- Inward Record State ---
    const [showInwardModal, setShowInwardModal] = useState(false);
    const [activeInwardGroup, setActiveInwardGroup] = useState(null);
    const [inwardDate, setInwardDate] = useState(new Date().toISOString().split('T')[0]);
    const [inwardChallanNo, setInwardChallanNo] = useState('');
    const [inwardItems, setInwardItems] = useState([]);
    const [inwardError, setInwardError] = useState('');

    // --- Inventory State ---
    const [inventoryList, setInventoryList] = useState([]);
    const [isFetchingInventory, setIsFetchingInventory] = useState(false);

    // --- All Orders Grouped State ---
    const [expandedAllBuyerName, setExpandedAllBuyerName] = useState(null);
    const [expandedAllOrderId, setExpandedAllOrderId] = useState(null);

    // --- Import Items State ---
    const [isImporting, setIsImporting] = useState(false);

    // --- Suppliers / Managers Tab State ---
    const [supplierViewMode, setSupplierViewMode] = useState('workloads');
    const [managerViewMode, setManagerViewMode] = useState('workloads');

    // Directory Modals
    const [showCreateSupplierModal, setShowCreateSupplierModal] = useState(false);
    const [showCreateManagerModal, setShowCreateManagerModal] = useState(false);

    const [newDirectoryName, setNewDirectoryName] = useState('');
    const [newDirectoryPhone, setNewDirectoryPhone] = useState('');
    const [newDirectoryEmail, setNewDirectoryEmail] = useState('');
    const [newDirectoryAddress, setNewDirectoryAddress] = useState('');
    const [directoryError, setDirectoryError] = useState('');

    // ================= DATA FETCHING =================

    useEffect(() => {
        if (tWorkflowToken) {
            fetchOrders();
            fetchOptions();
            fetchItemsMaster();
            fetchInventory();
        }
    }, [tWorkflowToken]);

    const fetchOrders = async () => {
        setIsLoading(true);
        try {
            const res = await workflowApi.get('/workflow/orders');
            setOrders(res.data);
        } catch (error) {
            console.error("Error fetching orders:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchInventory = async () => {
        setIsFetchingInventory(true);
        try {
            const res = await workflowApi.get('/workflow/inventory');
            setInventoryList(res.data);
        } catch (error) {
            console.error("Error fetching inventory:", error);
        } finally {
            setIsFetchingInventory(false);
        }
    };

    const fetchOptions = async () => {
        try {
            const [buyersRes, suppliersRes, managersRes] = await Promise.all([
                workflowApi.get('/workflow/buyers'),
                workflowApi.get('/workflow/suppliers'),
                workflowApi.get('/workflow/job-managers')
            ]);
            setBuyersList(buyersRes.data);
            setSuppliersList(suppliersRes.data || []);
            setManagersList(managersRes.data || []);
        } catch (error) {
            console.error("Error loading dropdown options", error);
        }
    };

    const fetchItemsMaster = async () => {
        try {
            const res = await workflowApi.get('/workflow/item-master');
            setItemsMasterList(res.data);
        } catch (error) {
            console.error("Error fetching items master:", error);
        }
    };

    // ================= CREATE ORDER =================

    const handleOpenCreateModal = () => {
        setOrderNumber(Math.floor(1000 + Math.random() * 9000).toString());
        setBuyerName('');
        setCreateLineItems([{ id: Date.now(), itemName: '', itemCode: '', size: '', pieces: '' }]);
        setCreateError('');
        setShowCreateModal(true);
    };

    const handleAddCreateLineItem = () => {
        setCreateLineItems([...createLineItems, { id: Date.now(), itemName: '', itemCode: '', size: '', cbm: '', pieces: '' }]);
    };

    const handleRemoveCreateLineItem = (id) => {
        if (createLineItems.length === 1) return;
        setCreateLineItems(createLineItems.filter(item => item.id !== id));
    };

    const handleItemChangeCreate = (id, newItemName) => {
        const matched = itemsMasterList.find(p => p.item_name === newItemName);
        const autoCode = matched ? matched.item_code : '';
        const autoSize = matched ? matched.size : '';
        const autoCbm = matched ? matched.cbm : '';
        setCreateLineItems(createLineItems.map(item =>
            item.id === id ? { ...item, itemName: newItemName, itemCode: autoCode, size: autoSize, cbm: autoCbm } : item
        ));
    };

    const submitCreateOrder = async (e) => {
        e.preventDefault();
        setCreateError('');
        if (!orderNumber || !buyerName) { setCreateError('Order Number and Buyer Name are required.'); return; }
        const validItems = createLineItems.filter(item => item.itemName && item.pieces > 0);
        if (validItems.length === 0) { setCreateError('Please add at least one valid item with pieces > 0.'); return; }
        setIsSaving(true);
        try {
            await workflowApi.post('/workflow/orders', { orderNumber, buyerName, items: validItems });
            setShowCreateModal(false);
            setActiveTab('unassigned');
            fetchOrders();
            fetchItemsMaster();
        } catch (error) {
            setCreateError(error.response?.data?.error || 'Failed to create order.');
        } finally { setIsSaving(false); }
    };

    // ================= ASSIGN ORDER =================

    const handleOpenAssignModal = (order) => {
        setActiveAssignOrder(order);
        setAssignPoNumber('OH-' + Math.floor(10000 + Math.random() * 90000).toString());
        setAssignType('supplier');
        setAssigneeId('');
        setAssignDate(new Date().toISOString().split('T')[0]);
        setAssignDeliveryDate('');
        setAssignNote('');
        setAssignError('');
        const assignmentDrafts = order.items.map(i => {
            const availableCount = Math.max(0, parseInt(i.pieces) - parseInt(i.assigned_pieces || 0));
            return { orderItemId: i.id, itemName: i.item_name, itemCode: i.item_code, size: i.size, maxPieces: availableCount, piecesToAssign: availableCount > 0 ? '' : 0, rate: '' };
        });
        setAssignLineItems(assignmentDrafts);
        setShowAssignModal(true);
    };

    const submitAssignOrder = async (e) => {
        e.preventDefault();
        setAssignError('');
        if (!assigneeId) { setAssignError(`Please specify the ${assignType === 'supplier' ? 'Supplier' : 'Job Manager'}.`); return; }
        const hasAnyAssigned = assignLineItems.some(i => parseInt(i.piecesToAssign || 0) > 0);
        if (!hasAnyAssigned) { setAssignError('You must assign at least 1 piece for one of the items.'); return; }
        for (const item of assignLineItems) {
            const num = parseInt(item.piecesToAssign || 0);
            if (num < 0 || num > item.maxPieces) { setAssignError(`Cannot assign more than available pieces for ${item.itemName}`); return; }
        }
        const payload = {
            assignType, assigneeId, assignDate, deliveryDate: assignDeliveryDate, note: assignNote, poNumber: assignPoNumber,
            assignments: assignLineItems.map(item => ({ orderItemId: item.orderItemId, pieces: parseInt(item.piecesToAssign || 0), rate: item.rate ? parseFloat(item.rate) : 0 }))
        };
        setIsSaving(true);
        try {
            await workflowApi.post(`/workflow/orders/${activeAssignOrder.id}/assign_pieces`, payload);
            const excelData = assignLineItems.map(item => ({ itemName: item.itemName, itemCode: item.itemCode, size: item.size, pieces: item.piecesToAssign, rate: item.rate }));
            if (assignType === 'supplier') {
                const targetSupplier = suppliersList.find(s => s.id.toString() === assigneeId.toString());
                generateAssignmentExcel(activeAssignOrder, targetSupplier ? targetSupplier.name : 'Unknown', assignDate, excelData, assignDeliveryDate, assignNote, assignPoNumber);
            }
            setShowAssignModal(false);
            fetchOrders();
            fetchOptions();
        } catch (error) { setAssignError(error.response?.data?.error || 'Failed to assign pieces.'); }
        finally { setIsSaving(false); }
    };

    // ================= IMPORT EXCEL =================
    const handleImportExcel = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setIsImporting(true);
        try {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const data = new Uint8Array(event.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    const itemsToImport = jsonData.map(row => {
                        const getVal = (possibleKeys) => {
                            for (const key of Object.keys(row)) { if (possibleKeys.includes(key.trim().toLowerCase())) return row[key]; }
                            return '';
                        };
                        return { itemName: getVal(['item name', 'itemname', 'item_name']), itemCode: getVal(['item code', 'itemcode', 'item_code']), size: getVal(['dimensions', 'dimension', 'size']), cbm: getVal(['cbm', 'volume', 'item cbm']) };
                    }).filter(i => i.itemName);
                    if (itemsToImport.length === 0) { alert("No valid items found. Ensure headers are exactly: 'Item Name', 'Item Code', 'Dimensions', 'CBM'"); return; }
                    const response = await workflowApi.post('/workflow/item-master/bulk', { items: itemsToImport });
                    alert(`Successfully imported ${response.data.count} new items!`);
                    fetchItemsMaster();
                } catch (error) { console.error("Parse Excel Error:", error); alert("Failed to parse the Excel file."); }
                finally { setIsImporting(false); e.target.value = null; }
            };
            reader.readAsArrayBuffer(file);
        } catch (error) { console.error("Import Excel Error:", error); setIsImporting(false); }
    };

    // ================= DELETE / EXPORT =================

    const handleDeleteOrder = async (orderId, orderNumber) => {
        if (!window.confirm(`Are you sure you want to permanently delete Order #${orderNumber}? This will also delete all its items and assignments.`)) return;
        try { await workflowApi.delete(`/workflow/orders/${orderId}`); fetchOrders(); }
        catch (error) { console.error('Delete order error:', error); alert(error.response?.data?.error || 'Failed to delete order.'); }
    };

    const handleExportExcel = (order) => {
        let assignee = 'Multiple/Unknown', latestDate = new Date(), deliveryDate = '', note = '', poNum = '';
        if (order.items && order.items.length > 0) {
            const allAssignments = order.items.flatMap(i => i.assignments || []).filter(a => a.assign_type === 'supplier');
            if (allAssignments.length > 0) { assignee = allAssignments[0].assignee_name || assignee; latestDate = allAssignments[0].assign_date || latestDate; deliveryDate = allAssignments[0].delivery_date || ''; note = allAssignments[0].note || ''; poNum = allAssignments[0].po_number || ''; }
        }
        const excelData = order.items.map(item => {
            const supplierAssignments = (item.assignments || []).filter(a => a.assign_type === 'supplier');
            const pieces = supplierAssignments.reduce((sum, a) => sum + parseInt(a.assigned_pieces || 0), 0);
            const assignment = supplierAssignments.length > 0 ? supplierAssignments[0] : {};
            return { itemName: item.item_name, itemCode: item.item_code, size: item.size, pieces: pieces, rate: assignment.rate || 0 };
        });
        generateAssignmentExcel(order, assignee, latestDate, excelData, deliveryDate, note, poNum);
    };

    const handleExportAssignmentExcel = (assignmentGroup) => {
        const order = assignmentGroup.order;
        const excelData = assignmentGroup.items.map(item => ({ itemName: item.itemName, itemCode: item.itemCode, size: item.size, pieces: item.assignedPieces, rate: item.rate }));
        generateAssignmentExcel(order, assignmentGroup.assigneeName || 'Multiple/Unknown', assignmentGroup.assignDate || new Date(), excelData, assignmentGroup.deliveryDate || '', assignmentGroup.note || '', assignmentGroup.poNumber || '');
    };

    // ================= COMPUTED DATA =================

    const filteredOrders = orders.filter(o => activeTab === 'all' ? true : o.status === activeTab);

    const groupedAssignments = useMemo(() => {
        const groups = {};
        orders.forEach(order => {
            order.items?.forEach(item => {
                item.assignments?.forEach(a => {
                    const dateStr = a.assign_date ? new Date(a.assign_date).toISOString().split('T')[0] : 'nodate';
                    const key = `${order.id}_${a.assignee_name}_${dateStr}_${a.assign_type}_${a.po_number || ''}`;
                    if (!groups[key]) {
                        groups[key] = { id: key, order, orderNumber: order.order_number, buyerName: order.buyer_name, assigneeName: a.assignee_name, assignDate: a.assign_date, assignType: a.assign_type, deliveryDate: a.delivery_date, note: a.note, poNumber: a.po_number, createdAt: a.created_at || a.assign_date, items: [] };
                    }
                    groups[key].items.push({ assignmentId: a.id, itemId: item.id, itemName: item.item_name, itemCode: item.item_code, size: item.size, assignedPieces: parseInt(a.assigned_pieces || 0), receivedPieces: parseInt(a.received_pieces || 0), rate: a.rate || 0 });
                });
            });
        });
        return Object.values(groups).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [orders]);

    const orderGroupedAssignments = useMemo(() => {
        const orderMap = {};
        groupedAssignments.forEach(group => {
            const orderKey = group.order.id;
            if (!orderMap[orderKey]) { orderMap[orderKey] = { orderId: group.order.id, orderNumber: group.orderNumber, buyerName: group.buyerName, createdAt: group.order.created_at, assignments: [] }; }
            orderMap[orderKey].assignments.push(group);
        });
        return Object.values(orderMap).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }, [groupedAssignments]);

    const buyerGroupedOrders = useMemo(() => {
        const groups = {};
        filteredOrders.forEach(order => {
            const buyer = order.buyer_name || 'Unknown Buyer';
            if (!groups[buyer]) { groups[buyer] = { buyerName: buyer, orders: [], totalPieces: 0, assignedPieces: 0 }; }
            groups[buyer].orders.push(order);
            order.items?.forEach(item => { groups[buyer].totalPieces += (item.pieces || 0); groups[buyer].assignedPieces += (item.assigned_pieces || 0); });
        });
        return Object.values(groups).sort((a, b) => a.buyerName.localeCompare(b.buyerName));
    }, [filteredOrders]);

    const unassignedItemsList = useMemo(() => {
        const list = [];
        orders.forEach(order => {
            order.items?.forEach(item => {
                const assigned = parseInt(item.assigned_pieces || 0);
                const total = parseInt(item.pieces || 0);
                const remaining = total - assigned;
                if (remaining > 0) { list.push({ id: `${order.id}_${item.id}`, orderId: order.id, orderNumber: order.order_number, buyerName: order.buyer_name, itemId: item.id, itemName: item.item_name, itemCode: item.item_code, size: item.size, totalPieces: total, assignedPieces: assigned, remainingPieces: remaining }); }
            });
        });
        return list;
    }, [orders]);

    // ================= BULK ASSIGN =================

    const handleOpenBulkAssignModal = () => {
        setAssignPoNumber('OH-' + Math.floor(10000 + Math.random() * 90000).toString());
        setAssignType('supplier'); setAssigneeId(''); setAssignDate(new Date().toISOString().split('T')[0]); setAssignDeliveryDate(''); setAssignNote(''); setAssignError('');
        const drafts = selectedUnassignedItemIds.map(id => {
            const item = unassignedItemsList.find(x => x.id === id);
            return { orderId: item.orderId, orderItemId: item.itemId, orderNumber: item.orderNumber, itemName: item.itemName, itemCode: item.itemCode, size: item.size, maxPieces: item.remainingPieces, piecesToAssign: item.remainingPieces > 0 ? '' : 0, rate: '' };
        });
        setAssignLineItems(drafts);
        setShowBulkAssignModal(true);
    };

    const submitBulkAssignOrder = async () => {
        setAssignError('');
        if (!assigneeId) { setAssignError(`Please specify the ${assignType === 'supplier' ? 'Supplier' : 'Job Manager'}.`); return; }
        const hasAnyAssigned = assignLineItems.some(i => parseInt(i.piecesToAssign || 0) > 0);
        if (!hasAnyAssigned) { setAssignError('Please assign at least 1 piece to an item.'); return; }
        for (const item of assignLineItems) { if (parseInt(item.piecesToAssign || 0) > item.maxPieces) { setAssignError(`Cannot assign more than available pieces for ${item.itemName} (Order #${item.orderNumber})`); return; } }
        setIsSaving(true);
        try {
            const payload = {
                assignType, assigneeId, assignDate, deliveryDate: assignDeliveryDate, note: assignNote, poNumber: assignPoNumber,
                assignments: assignLineItems.map(item => ({ orderId: item.orderId, orderItemId: item.orderItemId, pieces: parseInt(item.piecesToAssign || 0), rate: item.rate ? parseFloat(item.rate) : 0 }))
            };
            await workflowApi.post('/workflow/bulk_assign_pieces', payload);
            if (assignType === 'supplier') {
                const targetSupplier = suppliersList.find(s => s.id.toString() === assigneeId.toString());
                const orderNumbers = [...new Set(assignLineItems.map(i => i.orderNumber))].join(', ');
                generateAssignmentExcel({ order_number: orderNumbers }, targetSupplier ? targetSupplier.name : 'Unknown', assignDate,
                    payload.assignments.map((a, idx) => ({ itemName: assignLineItems[idx].itemName, itemCode: assignLineItems[idx].itemCode, size: assignLineItems[idx].size, pieces: a.pieces, rate: a.rate })),
                    assignDeliveryDate, assignNote, assignPoNumber);
            }
            setShowBulkAssignModal(false); setSelectedUnassignedItemIds([]); fetchOrders();
        } catch (error) { setAssignError(error.response?.data?.error || 'Failed to bulk assign pieces.'); }
        finally { setIsSaving(false); }
    };

    const toggleUnassignedItemSelection = (id) => {
        setSelectedUnassignedItemIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    // ================= INWARD RECORD =================

    const handleOpenInwardModal = (group) => {
        setActiveInwardGroup(group);
        setInwardDate(new Date().toISOString().split('T')[0]);
        setInwardChallanNo('');
        setInwardError('');
        const drafts = group.items.map(i => ({
            assignmentId: i.assignmentId,
            itemId: i.itemId,
            itemName: i.itemName,
            itemCode: i.itemCode,
            size: i.size,
            assignedPieces: i.assignedPieces,
            previouslyReceived: i.receivedPieces,
            maxPieces: Math.max(0, i.assignedPieces - i.receivedPieces),
            piecesToReceive: ''
        }));
        setInwardItems(drafts);
        setShowInwardModal(true);
    };

    const submitInwardRecord = async () => {
        setInwardError('');
        const hasAnyReceived = inwardItems.some(i => parseInt(i.piecesToReceive || 0) > 0);
        if (!hasAnyReceived) { setInwardError('Please enter at least 1 received piece.'); return; }
        
        for (const item of inwardItems) {
            const num = parseInt(item.piecesToReceive || 0);
            if (num < 0 || num > item.maxPieces) {
                setInwardError(`Cannot receive more than pending pieces for ${item.itemName}`);
                return;
            }
        }

        setIsSaving(true);
        try {
            const payload = {
                date: inwardDate,
                challanNo: inwardChallanNo,
                items: inwardItems.map(i => ({
                    assignmentId: i.assignmentId,
                    orderItemId: i.itemId,
                    receivedPieces: parseInt(i.piecesToReceive || 0)
                }))
            };
            await workflowApi.post('/workflow/inwards', payload);
            setShowInwardModal(false);
            fetchOrders();
            fetchInventory();
        } catch (error) {
            setInwardError(error.response?.data?.error || 'Failed to record inward.');
        } finally {
            setIsSaving(false);
        }
    };

    // ================= ITEMS MASTER =================

    const handleOpenCreateItemModal = () => {
        setNewItemName(''); setNewItemCode(''); setNewItemSize(''); setNewItemCbm(''); setCreateItemError(''); setShowCreateItemModal(true);
    };

    const submitCreateItem = async (e) => {
        e.preventDefault();
        setCreateItemError('');
        if (!newItemName) { setCreateItemError('Item Name is required.'); return; }
        setIsSaving(true);
        try {
            await workflowApi.post('/workflow/item-master', { itemName: newItemName, itemCode: newItemCode, size: newItemSize, cbm: newItemCbm });
            setShowCreateItemModal(false); fetchItemsMaster();
        } catch (error) { setCreateItemError(error.response?.data?.error || 'Failed to create item.'); }
        finally { setIsSaving(false); }
    };

    const handleDeleteItem = async (itemId) => {
        if (!window.confirm('Delete this item from catalog?')) return;
        try { await workflowApi.delete(`/workflow/item-master/${itemId}`); fetchItemsMaster(); }
        catch (error) { console.error('Delete item error:', error); }
    };

    // ================= LOGIN =================

    const handleWorkflowLogin = async (e) => {
        e.preventDefault();
        setLoginError(''); setIsLoggingIn(true);
        try {
            const res = await axios.post(`${api.defaults.baseURL}/login`, { email: loginEmail, password: loginPassword });
            const token = res.data.token;
            const decoded = jwtDecode(token);
            if (decoded.role !== 'owner') { setLoginError('Access Denied: Only owners can sign in to T-Workflow.'); return; }
            localStorage.setItem('tWorkflowToken', token); setTWorkflowToken(token); setLoginEmail(''); setLoginPassword('');
        } catch (err) { setLoginError(err.response?.data?.error || 'Login failed. Please check credentials.'); }
        finally { setIsLoggingIn(false); }
    };

    // ================= DIRECTORY =================

    const handleCreateDirectory = async (type) => {
        setDirectoryError('');
        if (!newDirectoryName) { setDirectoryError('Name is required'); return; }
        setIsSaving(true);
        try {
            const endpoint = type === 'supplier' ? '/workflow/suppliers' : '/workflow/job-managers';
            await workflowApi.post(endpoint, { name: newDirectoryName, phone: newDirectoryPhone, email: newDirectoryEmail, address: newDirectoryAddress });
            fetchOptions();
            if (type === 'supplier') setShowCreateSupplierModal(false);
            if (type === 'job_manager') setShowCreateManagerModal(false);
        } catch (error) { setDirectoryError(error.response?.data?.error || 'Failed to create entry.'); }
        finally { setIsSaving(false); }
    };

    const handleDeleteDirectory = async (type, id, name) => {
        if (!window.confirm(`Are you sure you want to delete ${name}? This will NOT delete their past assignments, but removes them from the directory.`)) return;
        try { const endpoint = type === 'supplier' ? `/workflow/suppliers/${id}` : `/workflow/job-managers/${id}`; await workflowApi.delete(endpoint); fetchOptions(); }
        catch (error) { alert(error.response?.data?.error || 'Failed to delete entry.'); }
    };

    // ================= RETURN ALL =================

    return {
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
        itemsMasterList, showCreateItemModal, setShowCreateItemModal, newItemName, setNewItemName,
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
    };
}
