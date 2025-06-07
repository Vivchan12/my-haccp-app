import React, { useState, useEffect, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile,
    signInAnonymously,
    signInWithCustomToken
} from 'firebase/auth';
import {
    getFirestore,
    collection,
    addDoc,
    query,
    Timestamp,
    orderBy,
    onSnapshot,
    doc,
    setDoc,
    deleteDoc,
    getDocs,
    where
} from 'firebase/firestore';
import {
    getStorage,
    ref,
    uploadBytesResumable,
    getDownloadURL
} from 'firebase/storage';
import { ChevronDown, LogOut, PlusCircle, Trash2, UploadCloud, Eye, Edit3, XCircle, AlertTriangle, CheckCircle2, FileText, Image as ImageIcon, Wrench, FileSpreadsheet, UserX, ListChecks, Download, History } from 'lucide-react';
// Note: jsPDF and jsPDF-Autotable are expected to be loaded via CDN <script> tags in your main index.html

// --- Firebase Configuration ---
//const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
  // apiKey: "AIzaSyB6Exd4Ku2IwU35zfyBuDNnoOHesW00eCA",
   //authDomain: "haccp-herb-x-tea.firebaseapp.com",
   //projectId: "haccp-herb-x-tea",
   //storageBucket: "haccp-herb-x-tea.firebasestorage.app",
   //messagingSenderId: "595945476159",
   //appId: "1:595945476159:web:089352a2fe30a50ed2e88a",
  // measurementId: "G-YD8HYP7HLX"
//};

const firebaseConfig = {
  apiKey: "AIzaSyB6Exd4Ku2IwU35zfyBuDNnoOHesW00eCA",
  authDomain: "haccp-herb-x-tea.firebaseapp.com",
  projectId: "haccp-herb-x-tea",
  storageBucket: "haccp-herb-x-tea.firebasestorage.app",
  messagingSenderId: "595945476159",
  appId: "1:595945476159:web:089352a2fe30a50ed2e88a",
  measurementId: "G-YD8HYP7HLX"
};

// --- App ID (for Firestore paths) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'haccp-forms-dev-app';

// --- Initialize Firebase ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// --- Form Definitions ---
const FORM_DEFINITIONS = {
    PREMISES_MAINTENANCE: {
        id: 'PREMISES_MAINTENANCE',
        title: 'Maintenance Check of Premises',
        fields: [
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'areaInspected', label: 'Area Inspected', type: 'text', required: true },
          { name: 'item_walls', label: 'Walls (Clean, good repair)', type: 'select', options: ['Satisfactory', 'Unsatisfactory', 'N/A'], required: true },
          { name: 'item_walls_action', label: 'Action (Walls)', type: 'textarea', condition: { field: 'item_walls', value: 'Unsatisfactory' } },
          { name: 'item_floors', label: 'Floors (Clean, good repair, no cracks)', type: 'select', options: ['Satisfactory', 'Unsatisfactory', 'N/A'], required: true },
          { name: 'item_floors_action', label: 'Action (Floors)', type: 'textarea', condition: { field: 'item_floors', value: 'Unsatisfactory' } },
          { name: 'item_ceilings', label: 'Ceilings (Clean, good repair, no condensation)', type: 'select', options: ['Satisfactory', 'Unsatisfactory', 'N/A'], required: true },
          { name: 'item_ceilings_action', label: 'Action (Ceilings)', type: 'textarea', condition: { field: 'item_ceilings', value: 'Unsatisfactory' } },
          { name: 'generalComments', label: 'General Comments / Other Issues', type: 'textarea' },
        ]
    },
    PERSONNEL_HYGIENE_DAILY_INSPECTION: {
        id: 'PERSONNEL_HYGIENE_DAILY_INSPECTION',
        title: 'Personnel Daily Hygiene Inspection',
        fields: [
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'employeeName', label: 'Employee Name (if specific)', type: 'text' },
          { name: 'cleanUniform', label: 'Clean Uniform/Apron', type: 'select', options: ['Yes', 'No', 'N/A'], required: true },
          { name: 'cleanUniformAction', label: 'Action (Uniform)', type: 'textarea', condition: { field: 'cleanUniform', value: 'No' } },
          { name: 'hairRestraint', label: 'Hair Restraint Used', type: 'select', options: ['Yes', 'No', 'N/A'], required: true },
          { name: 'handWashingObserved', label: 'Proper Handwashing Observed (if applicable)', type: 'select', options: ['Yes', 'No', 'N/A'] },
          { name: 'noJewelry', label: 'No Jewelry (as per policy)', type: 'select', options: ['Yes', 'No', 'N/A'] },
          { name: 'signsOfIllness', label: 'Any Visible Signs of Illness (e.g., coughing, open sores)', type: 'select', options: ['No', 'Yes'], required: true },
          { name: 'illnessDetailsAction', label: 'If Yes, Details & Action Taken', type: 'textarea', condition: { field: 'signsOfIllness', value: 'Yes'} },
          { name: 'overallCompliance', label: 'Overall Hygiene Compliance', type: 'select', options: ['Good', 'Fair', 'Needs Improvement'], required: true },
          { name: 'commentsCorrectiveActions', label: 'Comments / Corrective Actions', type: 'textarea' },
        ]
    },
    INCOMING_MATERIAL_CHECK: {
        id: 'INCOMING_MATERIAL_CHECK',
        title: 'Incoming Material Check Form',
        fields: [
            { name: 'dateOfReceiving', label: 'Date of Receiving', type: 'date', required: true },
            { name: 'supplierName', label: 'Supplier Name (from Approved List)', type: 'text', required: true },
            { name: 'productName', label: 'Product Name', type: 'text', required: true },
            { name: 'batchNo', label: 'Batch No. / Lot No.', type: 'text', required: true },
            { name: 'quantityReceived', label: 'Quantity Received', type: 'number', required: true },
            { name: 'unitOfMeasure', label: 'Unit', type: 'text', placeholder: 'e.g., kg, box, pack' },
            { name: 'expiryDate', label: 'Expiry Date / Best Before Date', type: 'date' },
            { name: 'packagingCondition', label: 'Condition of Packaging (Sealed, intact, no damage)', type: 'select', options: ['Good', 'Damaged', 'Soiled', 'Other'], required: true },
            { name: 'packagingConditionOther', label: 'If Other, specify', type: 'text', condition: { field: 'packagingCondition', value: 'Other' } },
            { name: 'temperature', label: 'Temperature (°C) (if applicable)', type: 'number' },
            { name: 'coaReceived', label: 'Certificate of Analysis (COA) Received & Verified?', type: 'select', options: ['Yes', 'No', 'N/A'], required: true },
            { name: 'coaReference', label: 'COA Reference/Number (if Yes)', type: 'text', condition: {field: 'coaReceived', value: 'Yes'}},
            { name: 'status', label: 'Accepted / Rejected', type: 'select', options: ['Accepted', 'Rejected'], required: true },
            { name: 'rejectionReason', label: 'Reason for Rejection (if Rejected)', type: 'textarea', condition: { field: 'status', value: 'Rejected' } },
        ]
    },
    PEST_CONTROL_LOG: {
        id: 'PEST_CONTROL_LOG',
        title: 'Pest Control Log',
        fields: [
            { name: 'date', label: 'Date of Service/Inspection', type: 'date', required: true },
            { name: 'time', label: 'Time', type: 'time', required: true },
            { name: 'serviceProvider', label: 'Pest Control Service Provider', type: 'text', placeholder: 'Name of company/personnel' },
            { name: 'locationInspected', label: 'Location(s) Inspected/Treated', type: 'textarea', required: true },
            { name: 'pestActivityObserved', label: 'Pest Activity Observed?', type: 'select', options: ['No', 'Yes'], required: true },
            { name: 'pestActivityDetails', label: 'If Yes, specify type, location, and evidence', type: 'textarea', condition: { field: 'pestActivityObserved', value: 'Yes' } },
            { name: 'pestControlMeasures', label: 'Pest Control Measures Taken (e.g., traps set, bait stations, spraying)', type: 'textarea', required: true },
            { name: 'recommendations', label: 'Recommendations from Service Provider', type: 'textarea' },
            { name: 'correctiveActionsTakenByStaff', label: 'Corrective Actions Taken by Staff (based on recommendations or observations)', type: 'textarea' },
            { name: 'pestControlDocument', label: 'Upload Service Report / Contract Ref (Image/PDF)', type: 'file', accept: 'image/*,.pdf' }
        ]
    },
    WASTE_MANAGEMENT_LOG: {
        id: 'WASTE_MANAGEMENT_LOG',
        title: 'Waste Management Inspection Log',
        fields: [
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'time', label: 'Time of Inspection', type: 'time' },
          { name: 'areaInspected', label: 'Area Inspected (e.g., Waste Bins, Collection Point)', type: 'text', required: true },
          { name: 'wasteSegregationCorrect', label: 'Waste Segregated Correctly (as per SOP)?', type: 'select', options: ['Yes', 'No', 'N/A'], required: true },
          { name: 'wasteSegregationAction', label: 'Action (if not segregated correctly)', type: 'textarea', condition: {field: 'wasteSegregationCorrect', value: 'No'}},
          { name: 'binsCondition', label: 'Bins Clean & Covered?', type: 'select', options: ['Yes', 'No', 'N/A'], required: true },
          { name: 'binsConditionAction', label: 'Action (if bins not clean/covered)', type: 'textarea', condition: {field: 'binsCondition', value: 'No'}},
          { name: 'collectionFrequencyAdequate', label: 'Waste Collection Frequency Adequate?', type: 'select', options: ['Yes', 'No'] },
          { name: 'issuesNoted', label: 'Other Issues Noted / Comments', type: 'textarea' },
          { name: 'correctiveActions', label: 'Corrective Actions Taken', type: 'textarea'},
        ]
    },
    EQUIPMENT_MAINTENANCE_REPAIR_LOG: {
        id: 'EQUIPMENT_MAINTENANCE_REPAIR_LOG',
        title: 'Equipment Maintenance/Repair Log',
        fields: [
          { name: 'date', label: 'Date of Maintenance/Repair', type: 'date', required: true },
          { name: 'equipmentName', label: 'Equipment Name/ID', type: 'text', required: true },
          { name: 'type', label: 'Type', type: 'select', options: ['Scheduled Maintenance', 'Repair', 'Emergency Repair'], required: true },
          { name: 'issueDescription', label: 'Issue Found / Reason for Maintenance', type: 'textarea', required: true },
          { name: 'actionTaken', label: 'Work Performed / Action Taken', type: 'textarea', required: true },
          { name: 'partsReplaced', label: 'Parts Replaced (if any)', type: 'textarea' },
          { name: 'performedBy', label: 'Performed By (Name/Company)', type: 'text', required: true },
          { name: 'downtimeHours', label: 'Equipment Downtime (Hours, if applicable)', type: 'number' },
          { name: 'status', label: 'Status Post-Work', type: 'select', options: ['Operational', 'Needs Further Action', 'Out of Service'], required: true },
          { name: 'verifiedBy', label: 'Verified By (Supervisor, if applicable)', type: 'text' },
        ]
    },
    EQUIPMENT_CALIBRATION_RECORD: {
        id: 'EQUIPMENT_CALIBRATION_RECORD',
        title: 'Equipment Calibration Record',
        fields: [
          { name: 'date', label: 'Date of Calibration', type: 'date', required: true },
          { name: 'equipmentName', label: 'Equipment Name/ID', type: 'text', required: true },
          { name: 'serialNumber', label: 'Serial Number (if applicable)', type: 'text' },
          { name: 'calibrationStandardUsed', label: 'Calibration Standard/Method Used', type: 'text', required: true },
          { name: 'resultBefore', label: 'Result Before Calibration (Reading)', type: 'text' },
          { name: 'resultAfter', label: 'Result After Calibration (Reading)', type: 'text', required: true },
          { name: 'tolerance', label: 'Acceptable Tolerance (+/-)', type: 'text'},
          { name: 'status', label: 'Status (Pass/Fail within tolerance)', type: 'select', options: ['Pass', 'Fail', 'Adjusted & Pass'], required: true },
          { name: 'nextDueDate', label: 'Next Calibration Due Date', type: 'date' },
          { name: 'calibratedBy', label: 'Calibrated By (Name/Company)', type: 'text', required: true },
          { name: 'certificateRef', label: 'Calibration Certificate Reference (if any)', type: 'text'},
        ]
    },
    EMPLOYEE_TRAINING_RECORD: {
        id: 'EMPLOYEE_TRAINING_RECORD',
        title: 'Employee Training Record',
        fields: [
          { name: 'employeeName', label: 'Employee Name', type: 'text', required: true },
          { name: 'employeeId', label: 'Employee ID (optional)', type: 'text'},
          { name: 'trainingDate', label: 'Date of Training', type: 'date', required: true },
          { name: 'trainingTopic', label: 'Training Topic/Module (e.g., HACCP Principles, Pest Control Awareness)', type: 'text', required: true },
          { name: 'trainerName', label: 'Trainer Name/Organization', type: 'text', required: true },
          { name: 'trainingDuration', label: 'Training Duration (e.g., hours, days)', type: 'text'},
          { name: 'assessmentType', label: 'Competency Assessment Type (if any)', type: 'text', placeholder: 'e.g., Written Test, Observation' },
          { name: 'assessmentResult', label: 'Assessment Result (e.g., Pass, Score %)', type: 'text' },
          { name: 'certificateIssued', label: 'Certificate Issued/Reference', type: 'select', options: ['Yes', 'No', 'N/A'] },
          { name: 'retrainingDueDate', label: 'Refresher/Retraining Due Date (if applicable)', type: 'date'},
        ]
    },
    CLEANING_RECORD: {
        id: 'CLEANING_RECORD',
        title: 'Cleaning and Sanitation Record',
        fields: [
          { name: 'date', label: 'Date', type: 'date', required: true },
          { name: 'timeCompleted', label: 'Time Completed', type: 'time'},
          { name: 'areaOrEquipment', label: 'Area / Equipment Cleaned', type: 'text', required: true, placeholder: 'e.g., Cutting Board #1, Floor - Prep Area' },
          { name: 'cleaningTask', label: 'Cleaning Task Performed (as per SOP/Schedule)', type: 'textarea', required: true },
          { name: 'cleaningAgentUsed', label: 'Cleaning Agent(s) & Concentration Used', type: 'text' },
          { name: 'sanitizerUsed', label: 'Sanitizer Used & Concentration (if applicable)', type: 'text'},
          { name: 'contactTime', label: 'Sanitizer Contact Time (if applicable)', type: 'text'},
          { name: 'issuesFound', label: 'Issues Found During Cleaning (e.g., equipment damage, pest signs)', type: 'textarea' },
          { name: 'correctiveActionTaken', label: 'Corrective Action Taken for Issues', type: 'textarea', conditionLogic: 'valueNotEmpty', conditionField: 'issuesFound' },
          { name: 'cleanedBy', label: 'Cleaned By (Initials/Name)', type: 'text', required: true },
          { name: 'verifiedBy', label: 'Verified By (Supervisor Initials/Name - if applicable)', type: 'text'},
        ]
    }
};


// --- Helper Components ---
const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-modalShow">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold text-gray-800">{title}</h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                        <XCircle size={24} />
                    </button>
                </div>
                {children}
            </div>
            <style jsx global>{`
                @keyframes modalShow {
                    to {
                        opacity: 1;
                        transform: scale(1);
                    }
                }
                .animate-modalShow {
                    animation: modalShow 0.3s forwards;
                }
            `}</style>
        </div>
    );
};

const MessageDisplay = ({ message, type, onDismiss }) => {
    if (!message) return null;
    const bgColor = type === 'error' ? 'bg-red-100 border-red-400 text-red-700' :
                    type === 'success' ? 'bg-green-100 border-green-400 text-green-700' :
                    'bg-blue-100 border-blue-400 text-blue-700';
    const Icon = type === 'error' ? AlertTriangle : type === 'success' ? CheckCircle2 : AlertTriangle;
    return (
        <div className={`border p-4 rounded-md relative ${bgColor} my-4 shadow`} role="alert">
            <div className="flex">
                <div className="py-1"><Icon className="mr-2 flex-shrink-0" size={20} /></div>
                <div className="flex-grow">
                    <p className="font-bold">{type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info'}</p>
                    <p className="text-sm break-words">{message}</p>
                </div>
            </div>
            {onDismiss && (
                 <button onClick={onDismiss} className="absolute top-2 right-2 p-1 text-inherit hover:opacity-75">
                    <XCircle size={18} />
                </button>
            )}
        </div>
    );
};


// --- Main Application Component ---
function App() {
    const [user, setUser] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [currentPage, setCurrentPage] = useState('dashboard');
    const [authInstance, setAuthInstance] = useState(null);
    const [dbInstance, setDbInstance] = useState(null);

    useEffect(() => {
        setAuthInstance(auth);
        setDbInstance(db);
        if (typeof __firebase_config === 'undefined') console.warn("Firebase config __firebase_config is undefined. Using placeholder.");
        if (typeof __app_id === 'undefined') console.warn("__app_id is undefined. Using default for Firestore paths.");

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser); setUserId(currentUser.uid);
                if (!currentUser.displayName && currentUser.email) {
                    try {
                        const nameFromEmail = currentUser.email.split('@')[0];
                        await updateProfile(currentUser, { displayName: nameFromEmail });
                        setUser(prevUser => ({...prevUser, displayName: nameFromEmail }));
                    } catch (e) { console.warn("Could not set display name from email:", e); }
                }
            } else {
                setUser(null); setUserId(null);
            }
            setIsAuthReady(true); setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const attemptSignIn = async () => {
            if (!auth.currentUser && isAuthReady) {
                setIsLoading(true);
                try {
                    if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (e) {
                    console.error("Error during initial sign-in:", e);
                    setError("Could not initialize user session. " + e.message);
                } finally { setIsLoading(false); }
            }
        };
        if (isAuthReady) attemptSignIn();
    }, [isAuthReady]);

    const handleLogin = async (email, password) => {
        setIsLoading(true); setError(''); setMessage('');
        try {
            await signInWithEmailAndPassword(auth, email, password);
            setMessage('Logged in successfully!'); setCurrentPage('dashboard');
        } catch (e) { setError(e.message); }
        setIsLoading(false);
    };

    const handleRegister = async (email, password, displayName) => {
        setIsLoading(true); setError(''); setMessage('');
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName });
            setUser({...userCredential.user, displayName});
            setMessage('Registered successfully! You are now logged in.'); setCurrentPage('dashboard');
        } catch (e) { setError(e.message); }
        setIsLoading(false);
    };

    const handleLogout = async () => {
        setIsLoading(true); setError('');
        try {
            await signOut(auth);
            setUser(null); setUserId(null); setCurrentPage('login');
            setMessage('Logged out successfully.');
        } catch (e) { setError(e.message); }
        setIsLoading(false);
    };

    if (isLoading && !isAuthReady) return <div className="min-h-screen flex items-center justify-center bg-gray-100"><div className="text-xl font-semibold">Loading Application...</div></div>;

    let authViewToShow = null;
    if (!user && isAuthReady) {
        const authProps = { onLogin:handleLogin, onRegister:handleRegister, isLoading, error, message, setCurrentPage, clearMessages:() => {setError(''); setMessage('');}, setError };
        authViewToShow = currentPage === 'register' ? <AuthPage {...authProps} initialView="register" /> : <AuthPage {...authProps} />;
    }
    if(authViewToShow) return authViewToShow;

    return (
        <div className="min-h-screen bg-gray-100 font-sans">
            <header className="bg-white shadow-md sticky top-0 z-40">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-blue-600">HACCP Forms Portal</h1>
                    {user && (
                        <div className="flex items-center space-x-3">
                            <span className="text-gray-700 text-sm sm:text-base hidden md:inline">Welcome, {user.displayName || user.email || userId}</span>
                            <span className="text-gray-700 text-sm sm:text-base md:hidden">Hi, {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'User'}</span>
                            <button onClick={handleLogout} className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-md transition duration-150 ease-in-out flex items-center text-sm sm:text-base" disabled={isLoading}>
                                <LogOut size={18} className="mr-1 sm:mr-2" /> Logout
                            </button>
                        </div>
                    )}
                </div>
            </header>
            <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && <MessageDisplay message={error} type="error" onDismiss={() => setError('')} />}
                {message && <MessageDisplay message={message} type="success" onDismiss={() => setMessage('')} />}
                {user && dbInstance && authInstance && isAuthReady ? (
                    <DashboardPage user={user} db={dbInstance} auth={authInstance} userId={userId} />
                ) : (!isLoading && <div className="text-center text-gray-600">Authenticating user...</div>)}
            </main>
            <footer className="text-center py-6 text-gray-600 text-sm border-t border-gray-200 mt-8">
                <p>&copy; {new Date().getFullYear()} HACCP Management Solutions. App ID: <span className="font-mono text-xs">{appId}</span></p>
                {user && <p className="text-xs mt-1">User ID: <span className="font-mono">{userId}</span></p>}
            </footer>
        </div>
    );
}

function AuthPage({ onLogin, onRegister, isLoading, error, message, setCurrentPage, initialView = "login", clearMessages, setError }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoginView, setIsLoginView] = useState(initialView === "login");

    const handleSubmit = (e) => {
        e.preventDefault(); clearMessages();
        if (isLoginView) onLogin(email, password);
        else { if (!displayName.trim()) { setError("Display Name is required for registration."); return; } onRegister(email, password, displayName); }
    };
    const toggleView = () => { clearMessages(); setIsLoginView(!isLoginView); setCurrentPage(isLoginView ? 'register' : 'login'); };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
            <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
                <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">{isLoginView ? 'Staff Login' : 'Staff Registration'}</h2>
                {error && <MessageDisplay message={error} type="error" onDismiss={clearMessages} />}
                {message && <MessageDisplay message={message} type="success" onDismiss={clearMessages} />}
                <form onSubmit={handleSubmit} className="space-y-6">
                    {!isLoginView && (
                        <div>
                            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                            <input id="displayName" type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="Your Full Name" />
                        </div>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="you@example.com" />
                    </div>
                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500" placeholder="••••••••" />
                    </div>
                    <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center text-base">
                        {isLoading ? 'Processing...' : (isLoginView ? 'Login' : 'Register')}
                    </button>
                </form>
                <p className="mt-6 text-center text-sm text-gray-600">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={toggleView} className="font-medium text-indigo-600 hover:text-indigo-500 ml-1">{isLoginView ? 'Register here' : 'Login here'}</button>
                </p>
            </div>
        </div>
    );
}

function DashboardPage({ user, db, auth, userId }) {
    const [activeTab, setActiveTab] = useState('forms');
    const [selectedFormId, setSelectedFormId] = useState(Object.keys(FORM_DEFINITIONS)[0] || null);
    const [formError, setFormError] = useState('');
    const [formMessage, setFormMessage] = useState('');
    const [editingForm, setEditingForm] = useState(null);

    const formsCollectionPath = `artifacts/${appId}/public/data/haccpForms`;

    const handleFormSubmit = async (formData, fileToUpload, isEditing = false, formToEditId = null) => {
        setFormError(''); setFormMessage('');
        if (!user || !db) { setFormError("User not authenticated or database not available."); return; }

        let fileUrl = formData.pestControlDocument || '';
        let originalFileName = formData.pestControlDocumentName || '';

        if (fileToUpload) {
            const filePath = `haccp_documents/${appId}/public/${userId}_${Date.now()}_${fileToUpload.name}`;
            const fileRef = ref(storage, filePath);
            try {
                const uploadTask = uploadBytesResumable(fileRef, fileToUpload);
                await new Promise((resolve, reject) => {
                    uploadTask.on('state_changed', () => {},
                                  (error) => { console.error("Upload error:", error); reject(error); },
                                  () => getDownloadURL(uploadTask.snapshot.ref).then(url => { fileUrl = url; originalFileName = fileToUpload.name; resolve(); }).catch(reject)
                    );
                });
            } catch (e) { console.error("File upload error: ", e); setFormError("Failed to upload file: " + e.message); return; }
        }

        const currentFormDefKey = isEditing ? editingForm.formIdName : selectedFormId;
        const currentFormDef = FORM_DEFINITIONS[currentFormDefKey];
        if (!currentFormDef) { setFormError(`Form definition for ID '${currentFormDefKey}' not found.`); return; }

        const submissionData = {
            formIdName: currentFormDef.id, formTitle: currentFormDef.title,
            formData: { ...formData, pestControlDocument: fileUrl, pestControlDocumentName: originalFileName },
            submittedByUid: user.uid, submittedByName: user.displayName || user.email, submittedAt: Timestamp.now(),
        };

        try {
            if (isEditing && formToEditId) {
                await setDoc(doc(db, formsCollectionPath, formToEditId), submissionData, { merge: true });
                setFormMessage("Form updated successfully!"); setEditingForm(null);
            } else {
                await addDoc(collection(db, formsCollectionPath), submissionData);
                setFormMessage("Form submitted successfully!");
            }
        } catch (e) { console.error("Firestore submission error: ", e); setFormError("Failed to submit form: " + e.message); }
    };

    const initiateEditFromHistory = (formToEdit) => {
        if (FORM_DEFINITIONS[formToEdit.formIdName]) {
            setSelectedFormId(formToEdit.formIdName);
            setEditingForm(formToEdit);
            setActiveTab('forms');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            console.error(`Cannot edit: Form definition for "${formToEdit.formTitle}" (ID: ${formToEdit.formIdName}) is missing.`);
            setFormError(`Cannot edit: Form definition for "${formToEdit.formTitle}" is missing.`);
        }
    };

    const TabButton = ({ tabName, currentTab, setTab, children, icon }) => (
        <button
            onClick={() => setTab(tabName)}
            className={`py-2 px-4 font-medium rounded-t-md transition-colors duration-150 ease-in-out flex items-center
                        ${currentTab === tabName
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
        >
            {icon && React.cloneElement(icon, { className: "mr-2"})}
            {children}
        </button>
    );

    return (
        <div className="space-y-6">
            <div className="flex border-b border-gray-300">
                <TabButton tabName="forms" currentTab={activeTab} setTab={setActiveTab} icon={<ListChecks size={20}/>}>
                    Fill Forms
                </TabButton>
                <TabButton tabName="history" currentTab={activeTab} setTab={setActiveTab} icon={<History size={20}/>}>
                    History & Downloads
                </TabButton>
                <TabButton tabName="reports" currentTab={activeTab} setTab={setActiveTab} icon={<FileSpreadsheet size={20}/>}>
                    Reports
                </TabButton>
            </div>

            {formError && <MessageDisplay message={formError} type="error" onDismiss={() => setFormError('')} />}
            {formMessage && <MessageDisplay message={formMessage} type="success" onDismiss={() => setFormMessage('')} />}

            {activeTab === 'forms' && (
                <section className="bg-white p-6 rounded-lg shadow-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
                        <h2 className="text-xl font-semibold text-gray-800 mb-2 sm:mb-0">
                            {editingForm && FORM_DEFINITIONS[editingForm.formIdName] ? `Editing: ${FORM_DEFINITIONS[editingForm.formIdName]?.title}` : "Fill New HACCP Form"}
                        </h2>
                        {editingForm && (
                            <button onClick={() => { setEditingForm(null); if (Object.keys(FORM_DEFINITIONS).length > 0) setSelectedFormId(Object.keys(FORM_DEFINITIONS)[0]); }}
                                className="text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 py-1.5 px-3 rounded-md self-start sm:self-center">
                                Cancel Edit
                            </button>
                        )}
                    </div>
                    {!editingForm && Object.keys(FORM_DEFINITIONS).length > 0 && (
                        <div className="mb-6">
                            <label htmlFor="form-select" className="block text-sm font-medium text-gray-700 mb-1">Select Form Type:</label>
                            <select id="form-select" value={selectedFormId} onChange={(e) => setSelectedFormId(e.target.value)}
                                className="w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500">
                                {Object.values(FORM_DEFINITIONS).map(formDef => <option key={formDef.id} value={formDef.id}>{formDef.title}</option>)}
                            </select>
                        </div>
                    )}
                    {Object.keys(FORM_DEFINITIONS).length === 0 && <p className="text-gray-600">No forms defined.</p>}
                    {selectedFormId && FORM_DEFINITIONS[selectedFormId] && (
                        <HaccpForm formDefinition={FORM_DEFINITIONS[editingForm ? editingForm.formIdName : selectedFormId]}
                            onSubmit={handleFormSubmit} user={user} initialData={editingForm ? editingForm.formData : null}
                            isEditing={!!editingForm} formToEditId={editingForm ? editingForm.id : null}
                            key={editingForm ? editingForm.id : selectedFormId} />
                    )}
                </section>
            )}
            {activeTab === 'history' && <HistoryPage db={db} user={user} formsCollectionPath={formsCollectionPath} initiateEdit={initiateEditFromHistory} />}
            {activeTab === 'reports' && <ReportsSection db={db} formsCollectionPath={formsCollectionPath} />}
        </div>
    );
}

function HistoryPage({ db, user, formsCollectionPath, initiateEdit }) {
    const [submittedForms, setSubmittedForms] = useState([]);
    const [isLoadingForms, setIsLoadingForms] = useState(true);
    const [historyError, setHistoryError] = useState('');
    const [historyMessage, setHistoryMessage] = useState('');
    const [viewingForm, setViewingForm] = useState(null);
    const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
    const [formToDeleteId, setFormToDeleteId] = useState(null);
    const [pdfStartDate, setPdfStartDate] = useState('');
    const [pdfEndDate, setPdfEndDate] = useState('');

    useEffect(() => {
        if (!db || !user?.uid) {
            setIsLoadingForms(false);
            return;
        }
        setIsLoadingForms(true);
        const q = query(collection(db, formsCollectionPath), orderBy('submittedAt', 'desc'));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const forms = [];
            querySnapshot.forEach((doc) => forms.push({ id: doc.id, ...doc.data() }));
            setSubmittedForms(forms);
            setIsLoadingForms(false);
        }, (error) => {
            console.error("Error fetching forms for history: ", error);
            setHistoryError(`Failed to load submitted forms. Error: ${error.message}`);
            setIsLoadingForms(false);
        });
        return () => unsubscribe();
    }, [db, user, formsCollectionPath]);

    const handleDeleteFormRequest = (formId) => { setFormToDeleteId(formId); setShowDeleteConfirmModal(true); };
    const confirmDeleteForm = async () => {
        if (!formToDeleteId) return;
        setHistoryError(''); setHistoryMessage('');
        try {
            await deleteDoc(doc(db, formsCollectionPath, formToDeleteId));
            setHistoryMessage("Form deleted successfully!");
        } catch (e) { console.error("Error deleting form: ", e); setHistoryError("Failed to delete form: " + e.message); }
        setShowDeleteConfirmModal(false); setFormToDeleteId(null);
    };

    const handleDownloadPdf = () => {
        setHistoryError(""); setHistoryMessage("");

        if (!window.jspdf || !window.jspdf.jsPDF) {
            setHistoryError("PDF generation library (jspdf) is not loaded.");
            console.error("jspdf or jspdf.jsPDF not found on window object.");
            return;
        }
        const { jsPDF } = window.jspdf;

        if (!pdfStartDate || !pdfEndDate) {
            setHistoryError("Please select both a start and end date for the PDF download.");
            return;
        }
        const startDate = new Date(pdfStartDate); startDate.setHours(0,0,0,0);
        const endDate = new Date(pdfEndDate); endDate.setHours(23,59,59,999);

        if (startDate > endDate) {
            setHistoryError("Start date cannot be after end date.");
            return;
        }

        const filteredForms = submittedForms.filter(form => {
            const formDate = form.submittedAt?.toDate();
            return formDate && formDate >= startDate && formDate <= endDate;
        });

        if (filteredForms.length === 0) {
            setHistoryMessage("No forms found for the selected date range.");
            return;
        }

        const docPdf = new jsPDF();
        docPdf.setFontSize(18); docPdf.text("HACCP Submitted Forms Report", 14, 22);
        docPdf.setFontSize(11); docPdf.setTextColor(100);
        docPdf.text(`Date Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`, 14, 30);

        const tableColumn = ["Form Title", "Submitted By", "Date Submitted", "Key Data Snippet"];
        const tableRows = [];
        filteredForms.forEach(form => {
            const formDate = form.submittedAt?.toDate() ? form.submittedAt.toDate().toLocaleDateString() : 'N/A';
            let keyDataSnippet = "N/A";
            if (form.formData) {
                if (form.formIdName === 'PERSONNEL_HYGIENE_DAILY_INSPECTION' && form.formData.signsOfIllness === 'Yes') {
                    keyDataSnippet = `Illness: Yes (Emp: ${form.formData.employeeName || 'N/A'})`;
                } else if (form.formData.date) {
                     keyDataSnippet = `Form Date: ${form.formData.date}`;
                } else if (Object.keys(form.formData).length > 0) {
                    const firstKey = Object.keys(form.formData)[0];
                    keyDataSnippet = `${firstKey}: ${String(form.formData[firstKey]).substring(0,30)}`;
                }
            }
            tableRows.push([form.formTitle || form.formIdName, form.submittedByName || 'N/A', formDate, keyDataSnippet]);
        });

        if (typeof docPdf.autoTable !== 'function') {
            setHistoryError("PDF autoTable plugin is not loaded.");
            console.error("jspdf-autotable plugin not found on jsPDF instance.");
            return;
        }
        docPdf.autoTable({ head: [tableColumn], body: tableRows, startY: 35, theme: 'striped', headStyles: { fillColor: [22, 160, 133] }, margin: { top: 30 } });
        docPdf.save(`haccp_forms_report_${pdfStartDate}_to_${pdfEndDate}.pdf`);
        setHistoryMessage("PDF download initiated.");
    };

    return (
        <section className="bg-white p-6 rounded-lg shadow-lg">
            {historyError && <MessageDisplay message={historyError} type="error" onDismiss={() => setHistoryError('')} />}
            {historyMessage && <MessageDisplay message={historyMessage} type="success" onDismiss={() => setHistoryMessage('')} />}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800">Previously Submitted Forms</h2>
                <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2 mt-3 sm:mt-0">
                    <input type="date" value={pdfStartDate} onChange={e => setPdfStartDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"/>
                    <span className="text-gray-600 hidden sm:inline">-</span>
                    <input type="date" value={pdfEndDate} onChange={e => setPdfEndDate(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm text-sm"/>
                    <button onClick={handleDownloadPdf} className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-md transition duration-150 ease-in-out flex items-center text-sm">
                        <Download size={16} className="mr-2"/> Download PDF
                    </button>
                </div>
            </div>

            {isLoadingForms ? <p className="text-gray-600">Loading forms...</p> : submittedForms.length === 0 ? <p className="text-gray-600">No forms submitted.</p> : (
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50"><tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Form Title</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted By</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date Submitted</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr></thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {submittedForms.map(form => (
                                <tr key={form.id}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{form.formTitle || form.formIdName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{form.submittedByName}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{form.submittedAt?.toDate ? form.submittedAt.toDate().toLocaleDateString() : 'N/A'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button onClick={() => setViewingForm(form)} className="text-blue-600 hover:text-blue-800" title="View"><Eye size={18}/></button>
                                        {user && user.uid === form.submittedByUid && FORM_DEFINITIONS[form.formIdName] && (<>
                                            <button onClick={() => initiateEdit(form)} className="text-indigo-600 hover:text-indigo-800" title="Edit"><Edit3 size={18}/></button>
                                            <button onClick={() => handleDeleteFormRequest(form.id)} className="text-red-600 hover:text-red-800" title="Delete"><Trash2 size={18}/></button>
                                        </>)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            <Modal isOpen={!!viewingForm} onClose={() => setViewingForm(null)} title={viewingForm?.formTitle || "Form Details"}>
                {viewingForm && <ViewFormDetails form={viewingForm} />}
            </Modal>
            <Modal isOpen={showDeleteConfirmModal} onClose={() => setShowDeleteConfirmModal(false)} title="Confirm Deletion">
                <p className="mb-6 text-gray-700">Are you sure you want to delete this form? This action cannot be undone.</p>
                <div className="flex justify-end space-x-3">
                    <button onClick={() => setShowDeleteConfirmModal(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button onClick={confirmDeleteForm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">Delete</button>
                </div>
            </Modal>
        </section>
    );
}

function ReportsSection({ db, formsCollectionPath }) {
    const [sickPersonnelReport, setSickPersonnelReport] = useState([]);
    const [isLoadingSickPersonnel, setIsLoadingSickPersonnel] = useState(true);
    const [recentActivityReport, setRecentActivityReport] = useState([]);
    const [isLoadingRecentActivity, setIsLoadingRecentActivity] = useState(true);
    const [incompleteFormsReport, setIncompleteFormsReport] = useState([]);
    const [isLoadingIncompleteForms, setIsLoadingIncompleteForms] = useState(true);
    const [reportError, setReportError] = useState('');

    useEffect(() => {
        const fetchSickPersonnel = async () => {
            setIsLoadingSickPersonnel(true); setReportError('');
            try {
                const q = query(collection(db, formsCollectionPath), where("formIdName", "==", "PERSONNEL_HYGIENE_DAILY_INSPECTION"));
                const querySnapshot = await getDocs(q);
                const allHygieneForms = querySnapshot.docs.map(doc => ({id: doc.id, ...doc.data()}));
                const report = allHygieneForms
                    .filter(form => form.formData?.signsOfIllness === "Yes")
                    .sort((a, b) => (b.submittedAt?.toDate() || 0) - (a.submittedAt?.toDate() || 0));
                setSickPersonnelReport(report);
            } catch (e) { console.error("Error fetching sick personnel report:", e); setReportError("Failed to load sick personnel report. " + e.message); }
            setIsLoadingSickPersonnel(false);
        };
        fetchSickPersonnel();
    }, [db, formsCollectionPath]);

    useEffect(() => {
        const fetchRecentActivity = async () => {
            setIsLoadingRecentActivity(true); setReportError('');
            const activity = [];
            try {
                for (const formDef of Object.values(FORM_DEFINITIONS)) {
                    const q = query(collection(db, formsCollectionPath), where("formIdName", "==", formDef.id));
                    const querySnapshot = await getDocs(q);
                    let lastSubmission = "Never";
                    let mostRecentTimestamp = null;
                    if (!querySnapshot.empty) {
                        querySnapshot.docs.forEach(doc => {
                            const formData = doc.data();
                            if (formData.submittedAt?.toDate) {
                                const currentTimestamp = formData.submittedAt.toDate();
                                if (!mostRecentTimestamp || currentTimestamp > mostRecentTimestamp) mostRecentTimestamp = currentTimestamp;
                            }
                        });
                        if (mostRecentTimestamp) lastSubmission = mostRecentTimestamp.toLocaleDateString();
                    }
                    activity.push({ title: formDef.title, lastSubmission });
                }
                setRecentActivityReport(activity);
            } catch (e) { console.error("Error fetching recent activity report:", e); setReportError("Failed to load recent form activity. " + e.message); }
            setIsLoadingRecentActivity(false);
        };
        fetchRecentActivity();
    }, [db, formsCollectionPath]);

    useEffect(() => {
        const fetchIncompletePestControl = async () => {
            setIsLoadingIncompleteForms(true); setReportError('');
            try {
                const q = query(collection(db, formsCollectionPath), where("formIdName", "==", "PEST_CONTROL_LOG"));
                const querySnapshot = await getDocs(q);
                const incomplete = querySnapshot.docs
                    .map(doc => ({id: doc.id, ...doc.data()}))
                    .filter(form => !form.formData?.pestControlMeasures || form.formData.pestControlMeasures.trim() === '');
                setIncompleteFormsReport(incomplete);
            } catch (e) { console.error("Error fetching incomplete pest control forms:", e); setReportError("Failed to load incomplete forms report. " + e.message); }
            setIsLoadingIncompleteForms(false);
        };
        fetchIncompletePestControl();
    }, [db, formsCollectionPath]);

    const ReportCard = ({ title, isLoading, error, children, icon }) => (
        <section className="bg-white p-6 rounded-lg shadow-lg">
            <h3 className="text-lg font-semibold text-gray-700 mb-3 flex items-center">
                {icon && React.cloneElement(icon, { className: "mr-2 text-blue-500"})} {title}
            </h3>
            {error && <MessageDisplay message={error} type="error" onDismiss={() => setReportError('')} />}
            {isLoading ? <p className="text-gray-500">Loading report data...</p> : children}
        </section>
    );

    return (
        <div className="space-y-6">
            {reportError && <MessageDisplay message={reportError} type="error" onDismiss={() => setReportError('')} />}
            <ReportCard title="Sick Personnel Report" isLoading={isLoadingSickPersonnel} icon={<UserX size={22} />}>
                {sickPersonnelReport.length === 0 ? <p className="text-gray-500">No personnel reported sick recently.</p> : (
                    <ul className="divide-y divide-gray-200">
                        {sickPersonnelReport.map(form => (
                            <li key={form.id} className="py-3">
                                <p className="text-sm"><strong>Date:</strong> {form.submittedAt?.toDate ? form.submittedAt.toDate().toLocaleDateString() : 'N/A'}</p>
                                <p className="text-sm"><strong>Employee:</strong> {form.formData.employeeName || 'N/A'}</p>
                                <p className="text-sm"><strong>Details:</strong> {form.formData.illnessDetailsAction || 'No details'}</p>
                                <p className="text-sm"><strong>Submitted By:</strong> {form.submittedByName}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </ReportCard>
            <ReportCard title="Recent Form Activity" isLoading={isLoadingRecentActivity} icon={<ListChecks size={22} />}>
                 {recentActivityReport.length === 0 ? <p className="text-gray-500">No form activity data available.</p> : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm">
                            <thead className="bg-gray-50"><tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Form Type</th>
                                <th className="px-4 py-2 text-left font-medium text-gray-600">Last Submitted</th>
                            </tr></thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentActivityReport.map(activity => (
                                    <tr key={activity.title}>
                                        <td className="px-4 py-2 whitespace-nowrap">{activity.title}</td>
                                        <td className="px-4 py-2 whitespace-nowrap">{activity.lastSubmission}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                 )}
            </ReportCard>
            <ReportCard title="Incomplete Pest Control Measures" isLoading={isLoadingIncompleteForms} icon={<AlertTriangle size={22} />}>
                {incompleteFormsReport.length === 0 ? <p className="text-gray-500">No Pest Control Logs found with missing 'Measures Taken'.</p> : (
                     <ul className="divide-y divide-gray-200">
                        {incompleteFormsReport.map(form => (
                            <li key={form.id} className="py-3">
                                <p className="text-sm"><strong>Date Submitted:</strong> {form.submittedAt?.toDate ? form.submittedAt.toDate().toLocaleDateString() : 'N/A'}</p>
                                <p className="text-sm"><strong>Submitted By:</strong> {form.submittedByName}</p>
                                <p className="text-sm text-red-600"><strong>Issue:</strong> 'Pest Control Measures Taken' field is empty.</p>
                                <button onClick={() => alert(`To view/edit this form, go to the 'History' tab and find Form ID: ${form.id}. (This is a placeholder, a direct link can be implemented)`)} className="text-xs text-blue-500 hover:underline mt-1">View Form (Placeholder)</button>
                            </li>
                        ))}
                    </ul>
                )}
                <p className="text-xs text-gray-500 mt-2">Note: This report checks for empty "Pest Control Measures Taken" in Pest Control Logs.</p>
            </ReportCard>
        </div>
    );
}

function HaccpForm({ formDefinition, onSubmit, user, initialData, isEditing, formToEditId }) {
    const [formData, setFormData] = useState({});
    const [fileToUpload, setFileToUpload] = useState(null);
    const [filePreview, setFilePreview] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const initial = {};
        if (!formDefinition || !formDefinition.fields) { console.error("HaccpForm: formDefinition or fields undefined."); return; }
        if (initialData) {
            formDefinition.fields.forEach(field => { initial[field.name] = initialData[field.name] !== undefined ? initialData[field.name] : (field.type === 'select' ? (field.options?.[0] || '') : ''); });
            if (formDefinition.fields.some(f => f.name === 'pestControlDocument' && f.type === 'file') && initialData.pestControlDocument && typeof initialData.pestControlDocument === 'string') {
                setFilePreview(initialData.pestControlDocument);
            }
        } else {
            formDefinition.fields.forEach(field => { initial[field.name] = field.type === 'select' ? (field.options?.[0] || '') : ''; });
        }
        setFormData(initial); setFileToUpload(null);
        if (!initialData?.pestControlDocument || !formDefinition.fields.some(f => f.name === 'pestControlDocument' && f.type === 'file')) {
            setFilePreview(null);
        }
    }, [formDefinition, initialData]);

    const handleChange = (e) => {
        const { name, value, type, checked, files } = e.target;
        if (type === 'file') {
            const file = files?.[0] || null;
            setFileToUpload(file);
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onloadend = () => setFilePreview(reader.result);
                reader.readAsDataURL(file);
            } else if (file) setFilePreview(file.name);
            else {
                const isFileField = formDefinition.fields.some(f => f.name === name && f.type === 'file');
                if (isEditing && isFileField && initialData?.[name] && typeof initialData[name] === 'string') setFilePreview(initialData[name]);
                else setFilePreview(null);
            }
            setFormData(prev => ({ ...prev, [name]: file ? file.name : (initialData?.[name] || '') }));
        } else setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); setIsSubmitting(true);
        let submissionFormData = { ...formData, verifiedBy: user.displayName || user.email };
        if (!formDefinition.fields.some(f => f.name === 'pestControlDocument')) {
            delete submissionFormData.pestControlDocument; delete submissionFormData.pestControlDocumentName;
        }
        await onSubmit(submissionFormData, fileToUpload, isEditing, formToEditId);
        setIsSubmitting(false);
        if (!isEditing) {
            const initial = {};
            formDefinition.fields.forEach(field => { initial[field.name] = field.type === 'select' ? (field.options?.[0] || '') : ''; });
            setFormData(initial); setFileToUpload(null); setFilePreview(null);
            if (e.target?.reset) e.target.reset();
        }
    };

    if (!formDefinition || !formDefinition.fields) return <p className="text-red-500">Error: Form definition unavailable.</p>;

    const renderField = (field) => {
        if (field.condition && formData[field.condition.field] !== field.condition.value) return null;
        if (field.conditionLogic === 'valueNotEmpty' && (!formData[field.conditionField] || String(formData[field.conditionField]).trim() === '')) return null;
        const commonProps = { id:field.name, name:field.name, value:formData[field.name]||'', onChange:handleChange, required:field.required, className:"mt-1 block w-full p-2.5 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm", placeholder:field.placeholder||'' };
        return (
            <div key={field.name} className="mb-4">
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">{field.label}{field.required && <span className="text-red-500 ml-1">*</span>}</label>
                {field.type === 'textarea' ? <textarea {...commonProps} rows="3"></textarea> :
                 field.type === 'select' ? <select {...commonProps}>{field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}</select> :
                 field.type === 'file' ? (<>
                    <input type="file" {...commonProps} accept={field.accept} />
                    {filePreview && <div className="mt-2 p-2 border border-gray-200 rounded-md bg-gray-50 max-w-full overflow-hidden">
                        {(typeof filePreview === 'string' && filePreview.startsWith('data:image')) ? <img src={filePreview} alt="Preview" className="max-h-40 rounded-md border object-contain" /> :
                         (typeof filePreview === 'string' && /\.(jpeg|jpg|gif|png)$/i.test(filePreview)) ? <img src={filePreview} alt="Preview" className="max-h-40 rounded-md border object-contain" /> :
                         (typeof filePreview === 'string' && filePreview.toLowerCase().endsWith('.pdf')) ? <div className="flex items-center"><FileText size={24} className="text-red-500 mr-2 shrink-0" /><a href={filePreview.startsWith('http')?filePreview:'#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" title={fileToUpload?.name || initialData?.pestControlDocumentName || filePreview}>{fileToUpload?.name || initialData?.pestControlDocumentName || (filePreview.startsWith('http')?"View PDF":filePreview)}</a></div> :
                         typeof filePreview === 'string' ? <div className="flex items-center"><ImageIcon size={24} className="text-blue-500 mr-2 shrink-0" /><a href={filePreview.startsWith('http')?filePreview:'#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate" title={fileToUpload?.name || initialData?.pestControlDocumentName || filePreview}>{fileToUpload?.name || initialData?.pestControlDocumentName || (filePreview.startsWith('http')?"View Document":filePreview)}</a></div> : null}
                    </div>}
                 </>) : <input type={field.type} {...commonProps} />}
            </div>
        );
    };
    return (
        <form onSubmit={handleSubmit}>
            {formDefinition.fields.map(field => renderField(field))}
            <div className="mt-2 mb-4"><p className="text-sm text-gray-600">Filled in by: <span className="font-semibold">{user.displayName || user.email}</span></p></div>
            <button type="submit" disabled={isSubmitting} className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-md transition duration-150 ease-in-out flex items-center justify-center disabled:opacity-60 text-base">
                <PlusCircle size={20} className="mr-2" /> {isSubmitting ? 'Submitting...' : (isEditing ? 'Update Form' : 'Submit Form')}
            </button>
        </form>
    );
}

function ViewFormDetails({ form }) {
    if (!form) return null;
    const { formData, formTitle, submittedByName, submittedAt, formIdName } = form;
    const definition = Object.values(FORM_DEFINITIONS).find(def => def.id === formIdName );
    return (
        <div className="space-y-3 text-sm max-h-[70vh] overflow-y-auto pr-2">
            <p><strong>Submitted By:</strong> {submittedByName}</p>
            <p><strong>Date Submitted:</strong> {submittedAt?.toDate ? submittedAt.toDate().toLocaleString() : 'N/A'}</p>
            <hr className="my-3"/>
            <h4 className="font-semibold text-md mb-2">Form Data for: {formTitle || formIdName}</h4>
            {definition && definition.fields.map(fieldDef => {
                const value = formData[fieldDef.name];
                if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return null;
                return (
                    <div key={fieldDef.name} className="grid grid-cols-1 md:grid-cols-3 gap-x-2 gap-y-1 py-1.5 border-b border-gray-100 last:border-b-0">
                        <strong className="col-span-1 text-gray-600 font-medium">{fieldDef.label}:</strong>
                        {fieldDef.type === 'file' && fieldDef.name === 'pestControlDocument' && formData.pestControlDocument ? (
                             <a href={formData.pestControlDocument} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline md:col-span-2 break-all" title={formData.pestControlDocumentName || "View Document"}>
                                {formData.pestControlDocumentName || "View Document"}
                             </a>
                        ) : (<span className="md:col-span-2 text-gray-800 break-words">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</span>)}
                    </div>
                );
            })}
             {!definition && Object.entries(formData).map(([key, value]) => {
                if (value === undefined || value === null || (typeof value === 'string' && value.trim() === '')) return null;
                if (key === 'pestControlDocumentName' && formData.pestControlDocument) return null;
                if (key === 'verifiedBy') return null;
                return (
                    <div key={key} className="grid grid-cols-1 md:grid-cols-3 gap-x-2 gap-y-1 py-1.5 border-b border-gray-100 last:border-b-0">
                         <strong className="col-span-1 text-gray-600 font-medium">{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}:</strong>
                         {key === 'pestControlDocument' && typeof value === 'string' && value.startsWith('http') ? (
                            <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline md:col-span-2 break-all" title={formData.pestControlDocumentName || value}>
                                {formData.pestControlDocumentName || "View Document"}</a>
                         ) : (<span className="md:col-span-2 text-gray-800 break-words">{String(value)}</span>)}
                    </div>
                );
            })}
        </div>
    );
}

export default App;