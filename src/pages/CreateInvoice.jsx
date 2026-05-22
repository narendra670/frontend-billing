import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import dayjs from 'dayjs';

const CreateInvoice = () => {
    const { token, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const [customer, setCustomer] = useState({
        name: '', mobile: '', address: ''
    });

    const [items, setItems] = useState([{
        medicineName: '',
        batchNumber: '',
        expiryDate: '',
        quantity: 1,
        price: 0,
        gstPercent: 12
    }]);

    const [searchResults, setSearchResults] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);

    const [subtotal, setSubtotal] = useState(0);
    const [totalGst, setTotalGst] = useState(0);
    const [grandTotal, setGrandTotal] = useState(0);
    const [savedInvoice, setSavedInvoice] = useState(null);

    // Calculate Totals
    const calculateTotals = () => {
        let sub = 0, gstTotal = 0;
        items.forEach(item => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.price) || 0;
            const gst = Number(item.gstPercent) || 0;
            const itemTotal = price * qty;
            sub += itemTotal;
            gstTotal += (itemTotal * gst) / 100;
        });
        setSubtotal(sub);
        setTotalGst(gstTotal);
        setGrandTotal(sub + gstTotal);
    };

    useEffect(() => {
        calculateTotals();
    }, [items]);

    // ==================== FIXED SEARCH FUNCTION ====================
    const searchMedicine = async (searchTerm, index) => {
        if (searchTerm.length < 2) {
            setSearchResults([]);
            setShowSuggestions(false);
            return;
        }

        setActiveRowIndex(index);

        try {
            const res = await axios.get(`/api/invoices/medicines/search?name=${encodeURIComponent(searchTerm)}`);

            // OpenFDA returns data inside "results"
            const results = res.data.medicines || [];

            const formattedResults = results.map(item => ({
                displayName: item.display_name || 'Unknown',
                genericName: item.generic_name || '',
                manufacturer: item.manufacturer || 'N/A',
                purpose: item.purpose || '',
            }));

            setSearchResults(formattedResults);
            setShowSuggestions(true);
        } catch (err) {
            console.error('Medicine search error:', err);
            toast.error("Failed to search medicines");
            setSearchResults([]);
        }
    };

    // Select Medicine
    const selectMedicine = (index, med) => {
        const updated = [...items];
        updated[index] = {
            ...updated[index],
            medicineName: med.displayName,
            price: 0,
            gstPercent: 12
        };
        setItems(updated);
        setShowSuggestions(false);
        setSearchResults([]);
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...items];
        if (['quantity', 'price', 'gstPercent'].includes(field)) {
            updated[index][field] = value === '' ? '' : Number(value);
        } else {
            updated[index][field] = value;
        }
        setItems(updated);
    };

    const addRow = () => {
        setItems([...items, {
            medicineName: '', batchNumber: '', expiryDate: '',
            quantity: 1, price: 0, gstPercent: 12
        }]);
    };

    const removeRow = (index) => {
        if (items.length === 1) return;
        setItems(items.filter((_, i) => i !== index));
    };

    const handleMobileSearch = async () => {
        if (!customer.mobile) return;
        try {
            const res = await axios.get(`/api/customers?mobile=${customer.mobile}`);
            if (res.data) {
                setCustomer({
                    name: res.data.name || '',
                    mobile: res.data.mobile || '',
                    address: res.data.address || '',
                });
                toast.success('Customer found!');
            }
        } catch (err) {
            toast.error("Customer not found. Please enter details manually.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!customer.name || !customer.mobile) {
            toast.error("Please fill customer name and mobile");
            return;
        }
        if (items.some(item => !item.medicineName || item.price <= 0)) {
            toast.error("Please fill all required fields (Medicine + Price)");
            return;
        }

        try {
            const res = await axios.post('/api/invoices', { customer, items });
            toast.success('Invoice saved successfully!');
            setSavedInvoice(res.data);

            // Reset form
            setCustomer({ name: '', mobile: '', address: '' });
            setItems([{ medicineName: '', batchNumber: '', expiryDate: '', quantity: 1, price: 0, gstPercent: 12 }]);
        } catch (err) {
            toast.error('Failed to save invoice');
        }
    };

    const generatePDF = async () => {
        if (!savedInvoice) return;

        try {
            const response = await axios.get(`/api/invoices/${savedInvoice._id}/pdf`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `Invoice_${savedInvoice.invoiceNumber || 'Medical'}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);

            toast.success('PDF downloaded successfully!');
        } catch (error) {
            console.error('PDF generation error:', error);
            toast.error('Failed to generate PDF');
        }
    };

    return (
        <>
            <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-6xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden">
                    <div className="bg-blue-700 text-white p-8 text-center relative">
                        <button
                            onClick={() => { logout(); navigate('/login'); toast.success('Logged out successfully'); }}
                            className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition"
                        >
                            Logout
                        </button>
                        <h1 className="text-4xl font-bold">Medical Store Billing</h1>
                        <p className="mt-2 text-blue-100">Shree Ganesh Medical Store • Lucknow, Uttar Pradesh</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8">
                        {/* Customer Section - unchanged */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Mobile</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={customer.mobile}
                                        onChange={(e) => setCustomer({ ...customer, mobile: e.target.value })}
                                        className="flex-1 border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="9876543210"
                                    />
                                    <button type="button" onClick={handleMobileSearch}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-medium">
                                        Search
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Customer Name</label>
                                <input
                                    type="text"
                                    value={customer.name}
                                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                                <input
                                    type="text"
                                    value={customer.address}
                                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex justify-between mb-8 text-sm text-gray-600">
                            <div><strong>Invoice No:</strong> AUTO-GENERATED</div>
                            <div><strong>Date:</strong> {dayjs().format('DD MMMM YYYY')}</div>
                        </div>

                        {/* Medicine Table */}
                        <div className="overflow-x-auto mb-8">
                            <table className="w-full border-collapse">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="p-4 text-left">Medicine Name</th>
                                        <th className="p-4 text-center">Batch No</th>
                                        <th className="p-4 text-center">Expiry</th>
                                        <th className="p-4 text-center">Qty</th>
                                        <th className="p-4 text-right">Price (₹)</th>
                                        <th className="p-4 text-center">GST %</th>
                                        <th className="p-4 text-right">Amount (₹)</th>
                                        <th className="p-4 w-12"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className="border-b hover:bg-gray-50">
                                            <td className="p-3 relative">
                                                <input
                                                    type="text"
                                                    value={item.medicineName}
                                                    onChange={(e) => {
                                                        handleItemChange(index, 'medicineName', e.target.value);
                                                        searchMedicine(e.target.value, index);
                                                    }}
                                                    className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    placeholder="Type medicine name (e.g. paracetamol)"
                                                    required
                                                />

                                                {/* Suggestions Dropdown */}
                                                {showSuggestions && activeRowIndex === index && searchResults.length > 0 && (
                                                    <div className="absolute z-50 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-60 overflow-auto">
                                                        {searchResults.map((med, i) => (
                                                            <div
                                                                key={i}
                                                                className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                                                onClick={() => selectMedicine(index, med)}
                                                            >
                                                                <div className="font-medium">{med.displayName}</div>
                                                                {med.genericName && (
                                                                    <div className="text-sm text-gray-600">
                                                                        {med.genericName}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Batch, Expiry, Qty, Price, GST, Amount columns remain same as your code */}
                                            <td className="p-3">
                                                <input type="text" value={item.batchNumber} onChange={(e) => handleItemChange(index, 'batchNumber', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-center" placeholder="Batch" />
                                            </td>
                                            <td className="p-3">
                                                <input type="date" value={item.expiryDate} onChange={(e) => handleItemChange(index, 'expiryDate', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-3" />
                                            </td>
                                            <td className="p-3">
                                                <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-center" min="1" />
                                            </td>
                                            <td className="p-3">
                                                <input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-right" step="0.01" min="0" />
                                            </td>
                                            <td className="p-3">
                                                <input type="number" value={item.gstPercent} onChange={(e) => handleItemChange(index, 'gstPercent', e.target.value)}
                                                    className="w-full border border-gray-300 rounded-xl px-3 py-3 text-center" min="0" max="28" />
                                            </td>
                                            <td className="p-3 font-semibold text-right">
                                                ₹{((Number(item.price) || 0) * (Number(item.quantity) || 0) * (1 + (Number(item.gstPercent) || 0) / 100)).toFixed(2)}
                                            </td>
                                            <td className="p-3 text-center">
                                                {items.length > 1 && (
                                                    <button type="button" onClick={() => removeRow(index)}
                                                        className="text-red-600 hover:text-red-700 text-xl font-bold">×</button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <button type="button" onClick={addRow} className="mb-8 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl">
                            + Add Another Medicine
                        </button>

                        {/* Totals Section */}
                        <div className="flex justify-end mb-8">
                            <div className="w-80 bg-gray-50 p-6 rounded-2xl border border-gray-200">
                                <div className="space-y-3 text-lg">
                                    <div className="flex justify-between"><span>Subtotal:</span> <span>₹{subtotal.toFixed(2)}</span></div>
                                    <div className="flex justify-between"><span>Total GST:</span> <span>₹{totalGst.toFixed(2)}</span></div>
                                    <div className="flex justify-between border-t border-gray-300 pt-4 text-2xl font-bold text-blue-700">
                                        <span>Grand Total:</span> <span>₹{grandTotal.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button type="submit" className="w-full bg-blue-700 hover:bg-blue-800 text-white py-5 rounded-2xl text-xl font-semibold">
                            Save Invoice
                        </button>
                    </form>
                </div>
            </div>

            {savedInvoice && (
                <div className="max-w-6xl mx-auto mt-6">
                    <button onClick={generatePDF}
                        className="w-full bg-green-600 hover:bg-green-700 text-white py-4 rounded-2xl text-lg font-medium">
                        📄 Download PDF Invoice
                    </button>
                </div>
            )}
        </>
    );
};

export default CreateInvoice;