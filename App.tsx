import React, { useState, useEffect, useRef, createContext, useContext, useCallback } from 'react';
import type { FC, ReactNode } from 'react';

// DECLARE LIBRARIES FROM CDN
declare const L: any;
declare const Chart: any;

// --- TYPESCRIPT INTERFACES ---
interface User {
  id: number;
  name: string;
  role: 'ev_user' | 'mechanic' | 'station_operator';
  avatar: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, pass:string) => boolean;
  logout: () => void;
}

interface ChargingSlot {
  time: string;
  status: 'available' | 'booked' | 'peak';
}

interface ChargingStation {
  id: number;
  name: string;
  coords: [number, number];
  address: string;
  availability: number;
  totalSlots: number;
  isPeak: boolean;
  demand: number[];
  slots: ChargingSlot[];
}

interface CommunityPost {
  id: number;
  author: User;
  content: string;
  timestamp: string;
  replies: CommunityPost[];
}

interface Booking {
    id: number;
    user: string;
    station: string;
    time: string;
    status: 'Confirmed' | 'Completed' | 'Upcoming';
}

interface Appointment {
    id: number;
    user: User;
    mechanic: User;
    time: string;
    issue: string;
    status: 'Pending' | 'Confirmed' | 'Completed';
}

// --- MOCK DATA (LOCALIZED FOR INDIA) ---
const MOCK_USERS: Record<string, User> = {
  'aryan@demo.com': { id: 1, name: 'Aryan Sharma', role: 'ev_user', avatar: 'https://i.pravatar.cc/150?u=aryan', email: 'aryan@demo.com' },
  'brijesh@demo.com': { id: 2, name: 'Brijesh Kumar', role: 'mechanic', avatar: 'https://i.pravatar.cc/150?u=brijesh', email: 'brijesh@demo.com' },
  'charu@demo.com': { id: 3, name: 'Charu Deshpande', role: 'station_operator', avatar: 'https://i.pravatar.cc/150?u=charu', email: 'charu@demo.com' },
};

const MOCK_EV_DATA = {
  batteryPercentage: 25,
  estimatedRange: 88, // in km
  batteryHealth: 92,
  batteryLifePrediction: '4 years, 2 months',
  batteryTemp: 45, // in Celsius
  kmDeviation: 1.15, // 15% higher than ideal
  isFastCharging: false,
  maintenanceAlerts: [
    { id: 1, alert: 'Battery temperature is higher than optimal. This may impact long-term health.', severity: 'medium' },
    { id: 2, alert: 'Energy consumption is 15% above average. Check driving style in Insights.', severity: 'low' },
  ],
};

const MOCK_CHARGING_STATIONS: ChargingStation[] = [
  { id: 1, name: 'Ather Grid Koramangala', coords: [12.9352, 77.6245], address: '123, 5th Block, Koramangala', availability: 3, totalSlots: 5, isPeak: false, demand: [20, 30, 60, 80, 70, 90, 50], slots: [{time: "14:00", status: "booked"}, {time: "14:30", status: "available"}, {time: "15:00", status: "peak"}, {time: "16:00", status: "available"}, {time: "16:30", status: "booked"}, {time: "17:00", status: "available"}] },
  { id: 2, name: 'Tata Power Indiranagar', coords: [12.9784, 77.6408], address: '456, 100 Ft Rd, Indiranagar', availability: 1, totalSlots: 4, isPeak: true, demand: [40, 50, 70, 95, 90, 100, 80], slots: [{time: "14:00", status: "available"}, {time: "14:30", status: "peak"}, {time: "15:00", status: "booked"}, {time: "16:00", status: "booked"}, {time: "16:30", status: "peak"}, {time: "17:00", status: "available"}] },
  { id: 3, name: 'Zeon Charging MG Road', coords: [12.9745, 77.6070], address: '789, MG Road, Bengaluru', availability: 5, totalSlots: 5, isPeak: false, demand: [10, 20, 40, 50, 60, 70, 40], slots: [{time: "14:00", status: "available"}, {time: "14:30", status: "available"}, {time: "15:00", status: "available"}, {time: "16:00", status: "available"}, {time: "16:30", status: "available"}, {time: "17:00", status: "available"}] },
  { id: 4, name: 'SparkCharge Hub Whitefield', coords: [12.9698, 77.7499], address: '101, ITPL Main Rd, Whitefield', availability: 4, totalSlots: 6, isPeak: false, demand: [30, 40, 50, 85, 80, 95, 60], slots: [{time: "14:00", status: "booked"}, {time: "14:30", status: "available"}, {time: "15:00", status: "peak"}, {time: "16:00", status: "available"}, {time: "16:30", status: "booked"}, {time: "17:00", status: "available"}] },
  { id: 5, name: 'VoltPoint Central Jayanagar', coords: [12.9226, 77.5829], address: '202, 4th Block, Jayanagar', availability: 0, totalSlots: 4, isPeak: true, demand: [50, 60, 75, 90, 88, 92, 70], slots: [{time: "14:00", status: "booked"}, {time: "14:30", status: "booked"}, {time: "15:00", status: "booked"}, {time: "16:00", status: "booked"}, {time: "16:30", status: "booked"}, {time: "17:00", status: "booked"}] },
  { id: 6, name: 'EcoCharge Plaza HSR Layout', coords: [12.9121, 77.6446], address: '303, 27th Main Rd, HSR Layout', availability: 5, totalSlots: 8, isPeak: false, demand: [15, 25, 45, 60, 55, 75, 45], slots: [{time: "14:00", status: "available"}, {time: "14:30", status: "available"}, {time: "15:00", status: "peak"}, {time: "16:00", status: "available"}, {time: "16:30", status: "available"}, {time: "17:00", status: "available"}] },
  { id: 7, name: 'PowerUp Point Malleswaram', coords: [12.9983, 77.5701], address: '404, Sampige Rd, Malleswaram', availability: 2, totalSlots: 4, isPeak: false, demand: [25, 35, 55, 70, 65, 80, 50], slots: [{time: "14:00", status: "booked"}, {time: "14:30", status: "available"}, {time: "15:00", status: "peak"}, {time: "16:00", status: "booked"}, {time: "16:30", status: "peak"}, {time: "17:00", status: "available"}] },
  { id: 8, name: 'ChargeGrid Electronic City', coords: [12.8452, 77.6602], address: '505, Hosur Rd, Electronic City', availability: 6, totalSlots: 10, isPeak: false, demand: [35, 45, 60, 80, 75, 90, 65], slots: [{time: "14:00", status: "available"}, {time: "14:30", status: "available"}, {time: "15:00", status: "available"}, {time: "16:00", status: "available"}, {time: "16:30", status: "available"}, {time: "17:00", status: "available"}] },
  { id: 9, name: 'GreenPlug Yeshwanthpur', coords: [13.0239, 77.5529], address: '606, Tumkur Rd, Yeshwanthpur', availability: 3, totalSlots: 5, isPeak: true, demand: [45, 55, 70, 85, 80, 88, 60], slots: [{time: "14:00", status: "booked"}, {time: "14:30", status: "available"}, {time: "15:00", status: "peak"}, {time: "16:00", status: "peak"}, {time: "16:30", status: "available"}, {time: "17:00", status: "booked"}] },
  { id: 10, name: 'RapidEV Banashankari', coords: [12.9254, 77.5467], address: '707, Outer Ring Rd, Banashankari', availability: 2, totalSlots: 4, isPeak: false, demand: [20, 30, 50, 65, 60, 70, 40], slots: [{time: "14:00", status: "available"}, {time: "14:30", status: "booked"}, {time: "15:00", status: "available"}, {time: "16:00", status: "available"}, {time: "16:30", status: "peak"}, {time: "17:00", status: "booked"}] },
];


const MOCK_COMMUNITY_POSTS: CommunityPost[] = [
    {
        id: 1,
        author: MOCK_USERS['aryan@demo.com'],
        content: "Hey everyone, I've noticed a slight whining noise when accelerating hard. Has anyone experienced this? My car is a 2022 Nexon EV.",
        timestamp: "2 hours ago",
        replies: [
            {
                id: 2,
                author: MOCK_USERS['brijesh@demo.com'],
                content: "Hi Aryan. That could be a number of things, but it's often related to the inverter or motor bearings. It's best to get it checked out. I have an opening tomorrow afternoon if you'd like to book an appointment.",
                timestamp: "1 hour ago",
                replies: []
            }
        ]
    }
];

const MOCK_APPOINTMENTS: Appointment[] = [
    { id: 1, user: MOCK_USERS['aryan@demo.com'], mechanic: MOCK_USERS['brijesh@demo.com'], time: 'Tomorrow, 2:00 PM', issue: 'Whining noise on acceleration', status: 'Pending' },
    { id: 2, user: { id: 4, name: 'Diya Singh', role: 'ev_user', avatar: 'https://i.pravatar.cc/150?u=diya', email: 'diya@demo.com'}, mechanic: MOCK_USERS['brijesh@demo.com'], time: 'Yesterday, 4:00 PM', issue: 'Brake fluid check', status: 'Completed' }
];

const MOCK_OPERATOR_DATA: {
    summary: { occupancy: string; totalBookings: number; dailyRevenue: string };
    bookings: Booking[];
} = {
    summary: { occupancy: '65%', totalBookings: 28, dailyRevenue: '₹37,500' },
    bookings: [
        { id: 1, user: 'Rohan Verma', station: 'CP-01', time: '14:30', status: 'Confirmed' },
        { id: 2, user: 'Priya Sharma', station: 'CP-03', time: '15:00', status: 'Upcoming' },
        { id: 3, user: 'Sameer Khan', station: 'CP-02', time: '11:15', status: 'Completed' },
        { id: 4, user: 'Anjali Mehta', station: 'CP-01', time: '16:00', status: 'Upcoming' },
        { id: 5, user: 'Vikram Singh', station: 'CP-04', time: '10:30', status: 'Completed' },
    ]
};


// --- API SIMULATION ---
const simulateApiCall = <T,>(data: T, delay = 500): Promise<T> => {
  return new Promise(resolve => setTimeout(() => resolve(data), delay));
};

// --- AUTHENTICATION CONTEXT ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AuthProvider: FC<{children: ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (email: string, pass: string): boolean => {
    if (MOCK_USERS[email] && pass === 'password') { // Simple password check
        setUser(MOCK_USERS[email]);
        return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- SVG ICONS ---
const Icon: FC<{ path: string; className?: string }> = ({ path, className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d={path} />
    </svg>
);

const ICONS = {
    dashboard: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
    charging: "M11 20v-6m0 0V5a2 2 0 012-2h2a2 2 0 012 2v9m-6 0h6m-6 0a1 1 0 001 1h4a1 1 0 001-1m-6 0V5",
    insights: "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6",
    community: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
    logout: "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1",
    wrench: "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    range: "M13 10V3L4 14h7v7l9-11h-7z",
    health: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
    temperature: "M9 13.5V3.5A2.5 2.5 0 0111.5 1h1A2.5 2.5 0 0115 3.5v10a4 4 0 11-6 0zM12 15.5a2 2 0 100 4 2 2 0 000-4z",
    dod: "M19 13l-7 7-7-7m14-8l-7 7-7-7",
    fastCharge: "M9.912 3.123a1 1 0 011.664 0l3.333 5.43a1 1 0 01-.832 1.547H7.41a1 1 0 01-.832-1.547l3.333-5.43zM15 12a1 1 0 011 1v6a1 1 0 11-2 0v-6a1 1 0 011-1z",
    chat: "M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z",
    microphone: "M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z",
    image: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z",
    send: "M12 19l9 2-9-18-9 18 9-2zm0 0v-8",
    camera: "M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9zM15 13a3 3 0 11-6 0 3 3 0 016 0z",
};

// --- REUSABLE UI COMPONENTS ---
const Card: FC<{ children: ReactNode, className?: string, isHoverable?: boolean }> = ({ children, className, isHoverable = false }) => (
    <div className={`bg-gray-800/50 backdrop-blur-sm p-6 rounded-2xl shadow-lg border border-gray-700/50 transition-all duration-300 ${isHoverable ? 'hover:bg-gray-700/70 hover:shadow-cyan-500/10 hover:-translate-y-1' : ''} ${className}`}>
        {children}
    </div>
);

const Modal: FC<{ isOpen: boolean; onClose: () => void; children: ReactNode; title: string }> = ({ isOpen, onClose, children, title }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 transition-opacity duration-300 ease-in-out">
            <div className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-gray-600 animate-fade-in-up">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-cyan-400">{title}</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div>{children}</div>
            </div>
        </div>
    );
};

const Spinner: FC = () => (
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
);

// --- DASHBOARD COMPONENTS ---

// -- EV User Dashboard --
const EVStatusTab: FC = () => {
    const { user } = useAuth();
    const data = MOCK_EV_DATA;
    const getSeverityColor = (severity: string) => severity === 'low' ? 'bg-yellow-500/20 text-yellow-300' : 'bg-orange-500/20 text-orange-300';
    
    const getSocColorClasses = (percentage: number) => {
        if (percentage > 80) return { fill: 'fill-green-500', text: 'text-green-400' };
        if (percentage <= 30) return { fill: 'fill-red-500', text: 'text-red-400' };
        return { fill: 'fill-yellow-500', text: 'text-yellow-400' };
    };

    const socColorClasses = getSocColorClasses(data.batteryPercentage);

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold mb-6">Welcome back, {user?.name.split(' ')[0]}!</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <Card className="flex flex-col items-center justify-center text-center bg-gradient-to-br from-gray-800 to-gray-900" isHoverable>
                    <h3 className="text-lg font-semibold text-gray-400 mb-4">SoC (State of Charge)</h3>
                    <div className="flex items-center gap-4">
                        <div className="w-24">
                            <svg viewBox="0 0 52 26" className="w-full h-auto">
                                {/* Battery Body */}
                                <rect x="0" y="0" width="48" height="26" rx="4" ry="4" className="fill-gray-800/50 stroke-gray-500" strokeWidth="2"/>
                                {/* Battery Terminal */}
                                <rect x="48" y="7" width="4" height="12" rx="1.5" ry="1.5" className="fill-gray-500"/>
                                {/* Battery Fill */}
                                <rect x="3" y="3" width={42 * (data.batteryPercentage / 100)} height="20" rx="2" ry="2" className={`transition-all duration-500 ${socColorClasses.fill}`} />
                            </svg>
                        </div>
                        <span className={`text-4xl font-bold ${socColorClasses.text}`}>{data.batteryPercentage}%</span>
                    </div>
                </Card>

                <Card className="flex flex-col justify-between bg-gradient-to-br from-blue-900/50 to-gray-800" isHoverable>
                    <div className="flex justify-between items-start"><h3 className="text-lg font-semibold text-gray-300">Depth of Discharge (DoD)</h3> <Icon path={ICONS.dod} className="h-6 w-6 text-blue-400" /></div>
                    <div><p className="text-4xl font-bold text-white">{100 - data.batteryPercentage} <span className="text-2xl text-gray-400">%</span></p></div>
                </Card>

                <Card className="flex flex-col justify-between bg-gradient-to-br from-cyan-900/50 to-gray-800" isHoverable>
                    <div className="flex justify-between items-start"><h3 className="text-lg font-semibold text-gray-300">Est. Range</h3> <Icon path={ICONS.range} className="h-6 w-6 text-cyan-400" /></div>
                    <div><p className="text-4xl font-bold text-white">{data.estimatedRange} <span className="text-2xl text-gray-400">km</span></p></div>
                </Card>

                <Card className="flex flex-col justify-between bg-gradient-to-br from-green-900/50 to-gray-800" isHoverable>
                    <div className="flex justify-between items-start"><h3 className="text-lg font-semibold text-gray-300">Battery Health</h3> <Icon path={ICONS.health} className="h-6 w-6 text-green-400" /></div>
                    <div><p className="text-4xl font-bold text-white">{data.batteryHealth}<span className="text-2xl text-gray-400">%</span></p></div>
                </Card>

                <Card className="flex flex-col justify-between bg-gradient-to-br from-orange-900/50 to-gray-800" isHoverable>
                    <div className="flex justify-between items-start"><h3 className="text-lg font-semibold text-gray-300">Battery Temp</h3> <Icon path={ICONS.temperature} className="h-6 w-6 text-orange-400" /></div>
                    <div><p className="text-4xl font-bold text-white">{data.batteryTemp}<span className="text-2xl text-gray-400">°C</span></p></div>
                </Card>

                 <Card className="flex flex-col justify-between bg-gradient-to-br from-purple-900/50 to-gray-800" isHoverable>
                    <div className="flex justify-between items-start">
                        <h3 className="text-lg font-semibold text-gray-300">Fast Charge Status</h3>
                        <Icon path={ICONS.fastCharge} className={`h-6 w-6 text-purple-400 ${data.isFastCharging ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                        <p className={`text-4xl font-bold ${data.isFastCharging ? 'text-green-400' : 'text-gray-400'}`}>
                            {data.isFastCharging ? 'Active' : 'Inactive'}
                        </p>
                    </div>
                </Card>


                <Card className="md:col-span-2 lg:col-span-3 mt-2">
                    <h3 className="text-xl font-bold text-cyan-400 mb-4">Predictive Maintenance Alerts</h3>
                    <ul className="space-y-3">
                        {data.maintenanceAlerts.map(alert => (
                            <li key={alert.id} className={`flex items-center p-3 rounded-lg ${getSeverityColor(alert.severity)}`}>
                                <Icon path={ICONS.wrench} className="h-5 w-5 mr-3" /><span>{alert.alert}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </div>
        </div>
    );
};

const LeafletMap: FC<{stations: ChargingStation[], onBook: (station: ChargingStation) => void, userLocation: [number, number] | null}> = ({ stations, onBook, userLocation }) => {
    const mapRef = useRef<any>(null);
    const markersRef = useRef<any[]>([]);
    const mapContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (mapContainerRef.current && !mapRef.current) {
            const initialView: [number, number] = userLocation || [12.9716, 77.5946];
            const map = L.map(mapContainerRef.current).setView(initialView, 12);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { attribution: '&copy; CartoDB' }).addTo(map);
            mapRef.current = map;
        }

        const map = mapRef.current;
        if (!map) return;

        markersRef.current.forEach(marker => map.removeLayer(marker));
        markersRef.current = [];

        stations.forEach(station => {
            const iconColor = station.availability > 0 ? '#22d3ee' : '#f87171';
            const customIcon = L.divIcon({
                html: `<svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-[${iconColor}]" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 100 2h1.586l-6.293 6.293a1 1 0 101.414 1.414L14 6.414V8a1 1 0 102 0V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v1H8a1 1 0 000 2h2V3z" /><path d="M7 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H9a2 2 0 01-2-2V5z" /></svg>`,
                className: 'bg-transparent border-0',
                iconSize: [32, 32],
                iconAnchor: [16, 32],
            });
            const marker = L.marker(station.coords, { icon: customIcon }).addTo(map);
            marker.bindPopup(`
                <div class="text-gray-900 bg-white rounded-lg p-1 max-w-xs"><h4 class="font-bold text-base">${station.name}</h4><p class="text-xs">${station.address}</p><p class="text-sm">Available: <strong>${station.availability}/${station.totalSlots}</strong></p>
                ${station.availability > 0 ? `<p class="mt-2 text-center text-cyan-600 font-semibold text-sm">Select slots from list below</p>` : '<p class="text-red-500 font-semibold text-sm">No slots available</p>'}</div>
            `, { closeButton: false });
            markersRef.current.push(marker);
        });

        if (userLocation) {
            const userIcon = L.divIcon({
                html: `<div class="w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md"></div>`,
                className: 'bg-transparent border-0',
                iconSize: [16, 16],
            });
            const userMarker = L.marker(userLocation, { icon: userIcon }).addTo(map);
            userMarker.bindPopup("Your Location");
            markersRef.current.push(userMarker);
            if(stations.length > 0) {
                map.fitBounds([...stations.map(s => s.coords), userLocation], {padding: [50, 50]});
            } else {
                map.setView(userLocation, 13);
            }
        }
    }, [stations, onBook, userLocation]);

    return <div ref={mapContainerRef} className="h-full w-full rounded-lg" style={{filter: 'grayscale(30%)'}} />;
};


const ChargingStationsTab: FC = () => {
    const [stations, setStations] = useState<ChargingStation[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStation, setSelectedStation] = useState<ChargingStation | null>(null);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [isBooked, setIsBooked] = useState(false);
    
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [sortedStations, setSortedStations] = useState<(ChargingStation & { distance: number })[]>([]);
    const [locationStatus, setLocationStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [expandedStationId, setExpandedStationId] = useState<number | null>(null);

    const getDistance = (coords1: [number, number], coords2: [number, number]) => {
        const R = 6371; // Radius of the Earth in km
        const dLat = (coords2[0] - coords1[0]) * Math.PI / 180;
        const dLon = (coords2[1] - coords1[1]) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(coords1[0] * Math.PI / 180) * Math.cos(coords2[0] * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    useEffect(() => {
        simulateApiCall(MOCK_CHARGING_STATIONS).then(apiStations => {
            setStations(apiStations);
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        const userCoords: [number, number] = [latitude, longitude];
                        setUserLocation(userCoords);
                        const stationsWithDistance = apiStations.map(station => ({ ...station, distance: getDistance(userCoords, station.coords) }));
                        stationsWithDistance.sort((a, b) => a.distance - b.distance);
                        setSortedStations(stationsWithDistance);
                        setLocationStatus('success');
                    },
                    () => {
                        setLocationStatus('error');
                        setSortedStations(apiStations.map(s => ({...s, distance: -1})));
                    }
                );
            } else {
                setLocationStatus('error');
                setSortedStations(apiStations.map(s => ({...s, distance: -1})));
            }
        });
    }, [])

    const handleSlotSelection = (station: ChargingStation, slot: string) => {
        setSelectedStation(station);
        setSelectedSlot(slot);
        setIsModalOpen(true);
        setIsBooked(false);
    };

    const handleBookingConfirm = () => {
        if (selectedSlot) setIsBooked(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedSlot(null);
    };

    const isLowCharge = MOCK_EV_DATA.batteryPercentage <= 30;
    const closestStation = sortedStations.length > 0 && sortedStations[0].distance >= 0 ? sortedStations[0] : null;

    return (
        <div className="flex flex-col gap-6 animate-fade-in">
             {isLowCharge && closestStation && (
                <div className="flex-shrink-0">
                    <Card className="border-l-4 border-red-400">
                        <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="font-semibold text-red-300">Smart Recommendation: Your battery is low ({MOCK_EV_DATA.batteryPercentage}%). The closest station is <strong>{closestStation.name}</strong>, only {closestStation.distance.toFixed(1)} km away.</p>
                        </div>
                    </Card>
                </div>
             )}

            <div className="h-[40vh] md:h-[50vh] bg-gray-800 rounded-xl p-1 border border-gray-700">
                <LeafletMap stations={stations} onBook={() => {}} userLocation={userLocation} />
            </div>

            <div className="flex-grow">
                <Card className="h-full flex flex-col">
                    <h3 className="text-xl font-bold text-cyan-400 mb-4 flex-shrink-0">Nearby Stations</h3>
                    <div className="flex-grow overflow-y-auto pr-2">
                        {locationStatus === 'loading' && <div className="flex justify-center items-center h-full"><Spinner /></div>}
                        {(locationStatus === 'success' || locationStatus === 'error') && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {sortedStations.map(station => (
                                    <div key={station.id} className="bg-gray-700/50 p-4 rounded-lg transition-all duration-300">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h4 className="font-bold text-lg">{station.name}</h4>
                                                    {station.distance >= 0 && <span className="text-sm bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">{station.distance.toFixed(1)} km</span>}
                                                </div>
                                                <p className="text-sm text-gray-400 mb-1">{station.address}</p>
                                                <p className={`text-sm font-semibold ${station.availability > 0 ? 'text-green-400' : 'text-red-400'}`}>{station.availability} / {station.totalSlots} slots available</p>
                                            </div>
                                            <button onClick={() => setExpandedStationId(expandedStationId === station.id ? null : station.id)} disabled={station.availability === 0} className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0">
                                                {expandedStationId === station.id ? 'Hide Slots' : 'View Slots'}
                                            </button>
                                        </div>
                                        <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedStationId === station.id ? 'max-h-96' : 'max-h-0'}`}>
                                            <div className="mt-4 pt-4 border-t border-gray-600">
                                                <h5 className="font-semibold mb-2 text-gray-300">Available Slots:</h5>
                                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                    {station.slots.map(slot => (
                                                        <button
                                                            key={slot.time}
                                                            onClick={() => handleSlotSelection(station, slot.time)}
                                                            disabled={slot.status === 'booked'}
                                                            className={`text-center p-2 rounded-lg border-2 transition-colors font-semibold
                                                                ${slot.status === 'available' ? 'bg-gray-700 border-gray-600 hover:border-cyan-500 hover:bg-cyan-500/20' : ''}
                                                                ${slot.status === 'peak' ? 'bg-orange-500/20 border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/30 text-orange-300' : ''}
                                                                ${slot.status === 'booked' ? 'bg-gray-800 border-gray-700 text-gray-500 cursor-not-allowed' : ''}
                                                            `}
                                                        >
                                                            {slot.time}
                                                            {slot.status === 'booked' && <span className="text-xs block font-normal">Booked</span>}
                                                            {slot.status === 'peak' && <span className="text-xs block font-normal text-orange-400/80">Peak</span>}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <Modal isOpen={isModalOpen} onClose={closeModal} title={isBooked ? "Booking Confirmed!" : `Confirm Booking`}>
                {isBooked ? (
                    <div className="text-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-green-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p>Your slot at <span className="font-bold">{selectedStation?.name}</span> for <span className="font-bold">{selectedSlot}</span> is reserved.</p>
                        <button onClick={closeModal} className="mt-6 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 w-full">Close</button>
                    </div>
                ) : (
                    <div>
                        <p className="mb-4 text-gray-300">You are about to book the following charging slot:</p>
                        <div className="bg-gray-700/50 p-4 rounded-lg space-y-2">
                            <p><span className="font-semibold text-gray-400">Station:</span> <span className="font-bold text-white">{selectedStation?.name}</span></p>
                            <p><span className="font-semibold text-gray-400">Time:</span> <span className="font-bold text-cyan-400">{selectedSlot}</span></p>
                        </div>
                        <button onClick={handleBookingConfirm} className="mt-6 bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600 w-full">Confirm & Book Slot</button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const SimpleChart: FC<{chartType: 'line' | 'bar', labels: string[], datasets: any[], title?: string}> = ({chartType, labels, datasets, title}) => {
    const chartRef = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        let chartInstance: any | null = null;
        if (chartRef.current) {
            const ctx = chartRef.current.getContext('2d');
            if (ctx) {
                chartInstance = new Chart(ctx, {
                    type: chartType,
                    data: { labels, datasets },
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: !!title, labels: { color: '#d1d5db' }}, title: { display: !!title, text: title, color: '#d1d5db'}}, scales: { y: { ticks: { color: '#9ca3af' }, grid: { color: '#4b5563' } }, x: { ticks: { color: '#9ca3af' }, grid: { color: '#4b5563' } } } }
                });
            }
        }
        return () => chartInstance?.destroy();
    }, [chartType, labels, datasets, title]);
    return <canvas ref={chartRef}></canvas>;
};

const InsightsTab: FC = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
        <Card>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Battery Health vs. Temperature</h3>
            <div className="h-80"><SimpleChart chartType="line" labels={['20°C', '25°C', '30°C', '35°C', '40°C', '45°C']} datasets={[{ label: 'Health Degradation', data: [99, 98, 97, 95, 93, 92], borderColor: '#f97316', backgroundColor: '#f9731633', tension: 0.4, fill: true }]}/></div>
        </Card>
        <Card>
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Demand Prediction (Busy Hours)</h3>
            <div className="h-80"><SimpleChart chartType="bar" labels={['8am', '12pm', '3pm', '6pm', '9pm']} datasets={[{ label: 'City-wide Demand %', data: MOCK_CHARGING_STATIONS[1].demand.slice(2), backgroundColor: '#22d3ee88', borderColor: '#22d3ee' }]}/></div>
        </Card>
        <Card className="lg:col-span-2">
            <h3 className="text-xl font-bold text-cyan-400 mb-4">Driving Efficiency & Cost Savings</h3>
            <p className="text-gray-400 mb-4">Based on your KM deviation of {((MOCK_EV_DATA.kmDeviation - 1)*100).toFixed(0)}% above ideal.</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><p className="text-2xl font-bold text-cyan-400">7.5 kWh/100km</p><p className="text-gray-400">Avg. Consumption</p></div>
                <div><p className="text-2xl font-bold text-green-400">₹29,000</p><p className="text-gray-400">Est. Yearly Savings</p></div>
                <div><p className="text-2xl font-bold text-cyan-400">Eco-Friendly</p><p className="text-gray-400">Score: 88/100</p></div>
                <div><p className="text-2xl font-bold text-red-400">Aggressive</p><p className="text-gray-400">Braking Style</p></div>
            </div>
        </Card>
    </div>
);

const Chatbot: FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<{ id: number, text?: string, image?: string, sender: 'user' | 'bot' }[]>([
        { id: 1, text: "Hello! I'm the EV assistant. How can I help you today?", sender: 'bot' }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    const speechRecognition = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const videoStreamRef = useRef<MediaStream | null>(null);
    
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            speechRecognition.current = new SpeechRecognition();
            speechRecognition.current.continuous = false;
            speechRecognition.current.interimResults = false;
            speechRecognition.current.lang = 'en-US';

            speechRecognition.current.onresult = (event: any) => {
                const transcript = event.results[0][0].transcript;
                setInputValue(transcript);
                handleSendMessage(transcript);
                setIsListening(false);
            };
            speechRecognition.current.onerror = () => setIsListening(false);
            speechRecognition.current.onend = () => setIsListening(false);
        }
    }, []);

    const addMessage = (text: string | undefined, image: string | undefined, sender: 'user' | 'bot') => {
        const newMessage = { id: Date.now(), text, image, sender };
        setMessages(prev => [...prev, newMessage]);
    };

    const handleBotResponse = () => {
        setTimeout(() => {
            addMessage("I'm analyzing your query. One moment please...", undefined, 'bot');
        }, 1000);
    };

    const handleSendMessage = (text: string) => {
        if (text.trim() === '') return;
        addMessage(text, undefined, 'user');
        setInputValue('');
        handleBotResponse();
    };

    const handleVoiceInput = () => {
        if (speechRecognition.current && !isListening) {
            setIsListening(true);
            speechRecognition.current.start();
        } else if (isListening) {
            setIsListening(false);
            speechRecognition.current.stop();
        }
    };
    
    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                addMessage(undefined, reader.result as string, 'user');
                handleBotResponse();
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleCameraOpen = async () => {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                videoStreamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                setIsCameraOpen(true);
            } catch (err) {
                console.error("Error accessing camera: ", err);
                addMessage("Could not access the camera. Please check permissions.", undefined, 'bot');
            }
        }
    };

    const handleCameraClose = () => {
        if (videoStreamRef.current) {
            videoStreamRef.current.getTracks().forEach(track => track.stop());
        }
        setIsCameraOpen(false);
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
            
            const imageDataUrl = canvas.toDataURL('image/jpeg');
            addMessage(undefined, imageDataUrl, 'user');
            handleBotResponse();
            handleCameraClose();
        }
    };

    return (
        <>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="fixed bottom-6 right-6 z-40">
                <button onClick={() => setIsOpen(!isOpen)} className="bg-cyan-500 text-white rounded-full p-4 shadow-lg hover:bg-cyan-600 transition-transform transform hover:scale-110">
                    <Icon path={ICONS.chat} className="h-8 w-8" />
                </button>
            </div>
            {isOpen && (
                <div className="fixed bottom-24 right-6 w-96 h-[60vh] bg-gray-800/80 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col border border-gray-600 animate-fade-in-up z-30">
                    <div className="p-4 bg-gray-900/50 rounded-t-2xl"><h3 className="font-bold text-lg text-cyan-400">EV Assistant</h3></div>
                    <div className="flex-1 p-4 overflow-y-auto space-y-4 relative">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.sender === 'bot' && <div className="w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0 text-white font-bold">A</div>}
                                <div className={`max-w-xs rounded-2xl p-3 ${msg.sender === 'user' ? 'bg-cyan-600 text-white rounded-br-none' : 'bg-gray-700 text-gray-200 rounded-bl-none'}`}>
                                    {msg.text && <p>{msg.text}</p>}
                                    {msg.image && <img src={msg.image} alt="uploaded content" className="rounded-lg max-h-40" />}
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        {isCameraOpen && (
                            <div className="absolute inset-0 bg-gray-900/95 flex flex-col items-center justify-center z-10 p-2">
                                <video ref={videoRef} className="w-full h-auto max-h-[75%] rounded-lg" autoPlay playsInline></video>
                                <div className="flex gap-4 mt-4">
                                    <button onClick={handleCapture} className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600">Capture</button>
                                    <button onClick={handleCameraClose} className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-600">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 border-t border-gray-700 bg-gray-900/50 rounded-b-2xl">
                        <form onSubmit={e => { e.preventDefault(); handleSendMessage(inputValue); }} className="flex items-center gap-2">
                             <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
                             <button type="button" onClick={() => fileInputRef.current?.click()} className="text-gray-400 hover:text-cyan-400 p-2"><Icon path={ICONS.image} className="h-6 w-6" /></button>
                             <button type="button" onClick={handleCameraOpen} className="text-gray-400 hover:text-cyan-400 p-2"><Icon path={ICONS.camera} className="h-6 w-6" /></button>
                             <button type="button" onClick={handleVoiceInput} className={`p-2 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400 hover:text-cyan-400'}`}><Icon path={ICONS.microphone} className="h-6 w-6" /></button>
                             <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="Type or speak..." className="w-full bg-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                             <button type="submit" className="text-cyan-400 hover:text-cyan-300 p-2"><Icon path={ICONS.send} className="h-6 w-6" /></button>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

interface CommunityTabProps {
    communityPosts: CommunityPost[];
    onAddPost: (content: string) => void;
}

const CommunityTab: FC<CommunityTabProps> = ({ communityPosts, onAddPost }) => {
    const [newPostContent, setNewPostContent] = useState('');

    const handleSend = () => {
        if (newPostContent.trim()) {
            onAddPost(newPostContent);
            setNewPostContent('');
        }
    };
    
    return (
        <div className="relative h-[calc(100vh-150px)] animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card className="flex-grow flex flex-col">
                        <h3 className="text-xl font-bold text-cyan-400 mb-4">#general-discussion</h3>
                        <div className="flex-grow overflow-y-auto pr-2 space-y-6">
                            {communityPosts.map(post => (
                                <div key={post.id} className="flex gap-4">
                                    <img src={post.author.avatar} alt="" className="w-12 h-12 rounded-full mt-1 flex-shrink-0"/>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-bold">{post.author.name}</span>
                                            {post.author.role === 'mechanic' && <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">Mechanic</span>}
                                            <span className="text-sm text-gray-400">{post.timestamp}</span>
                                        </div>
                                        <p className="text-gray-300 mt-1">{post.content}</p>
                                        {post.replies.map(reply => (
                                            <div key={reply.id} className="mt-4 flex gap-4">
                                                <img src={reply.author.avatar} alt="" className="w-10 h-10 rounded-full mt-1 flex-shrink-0"/>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold">{reply.author.name}</span>
                                                        {reply.author.role === 'mechanic' && <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">Mechanic</span>}
                                                        <span className="text-sm text-gray-400">{reply.timestamp}</span>
                                                    </div>
                                                    <p className="text-gray-300 mt-1">{reply.content}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                         <div className="mt-4 pt-4 border-t border-gray-700 flex gap-2">
                            <input 
                                type="text"
                                placeholder={`Message in #general-discussion`}
                                className="w-full bg-gray-700 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                                value={newPostContent}
                                onChange={(e) => setNewPostContent(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                             />
                            <button onClick={handleSend} className="bg-cyan-500 text-white px-4 py-2 rounded-lg hover:bg-cyan-600">Send</button>
                        </div>
                    </Card>
                </div>
                <div className="flex flex-col gap-6">
                    <Card>
                        <h3 className="text-xl font-bold text-cyan-400 mb-4">Book Mechanic</h3>
                        <div className="flex items-center justify-between"><div className="flex items-center gap-3"><img src={MOCK_USERS['brijesh@demo.com'].avatar} alt="mechanic" className="w-12 h-12 rounded-full"/><div><p className="font-bold">{MOCK_USERS['brijesh@demo.com'].name}</p><p className="text-sm text-gray-400">EV Specialist</p></div></div><button className="bg-blue-500 text-white px-3 py-1 rounded-lg text-sm hover:bg-blue-600">Book Now</button></div>
                    </Card>
                    <Card>
                        <h3 className="text-xl font-bold text-cyan-400 mb-4">Your Appointments</h3>
                         <ul className="space-y-3"><li className="flex justify-between items-center"><p>{MOCK_APPOINTMENTS[0].issue}</p><span className="text-sm bg-yellow-500/30 text-yellow-300 px-2 py-0.5 rounded-full">{MOCK_APPOINTMENTS[0].status}</span></li></ul>
                    </Card>
                </div>
            </div>
            <Chatbot />
        </div>
    );
};

interface EVUserDashboardProps {
    communityPosts: CommunityPost[];
    onAddPost: (content: string) => void;
}

const EVUserDashboard: FC<EVUserDashboardProps> = ({ communityPosts, onAddPost }) => {
    const [activeView, setActiveView] = useState('dashboard');
    const { user, logout } = useAuth();

    const SidebarLink: FC<{view: string, label: string, iconPath: string}> = ({view, label, iconPath}) => (
        <button onClick={() => setActiveView(view)} className={`flex items-center w-full px-4 py-3 rounded-lg transition-colors duration-200 ${activeView === view ? 'bg-cyan-500/20 text-cyan-300' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}>
            <Icon path={iconPath} className="w-6 h-6 mr-3" /> <span>{label}</span>
        </button>
    );

    const renderContent = () => {
        switch(activeView) {
            case 'dashboard': return <EVStatusTab />;
            case 'stations': return <ChargingStationsTab />;
            case 'insights': return <InsightsTab />;
            case 'community': return <CommunityTab communityPosts={communityPosts} onAddPost={onAddPost} />;
            default: return null;
        }
    };
    
    return (
        <div className="flex min-h-screen">
            <aside className="w-64 bg-gray-800/80 backdrop-blur-sm p-4 flex flex-col border-r border-gray-700/50">
                <div className="flex items-center gap-3 mb-8">
                    <img src={user?.avatar} alt="avatar" className="w-12 h-12 rounded-full border-2 border-cyan-400"/>
                    <div><p className="font-bold text-white">{user?.name}</p><p className="text-sm text-gray-400 capitalize">{user?.role.replace('_', ' ')}</p></div>
                </div>
                <nav className="flex-grow space-y-2">
                    <SidebarLink view="dashboard" label="Dashboard" iconPath={ICONS.dashboard} />
                    <SidebarLink view="stations" label="Charging" iconPath={ICONS.charging} />
                    <SidebarLink view="insights" label="Insights" iconPath={ICONS.insights} />
                    <SidebarLink view="community" label="Community" iconPath={ICONS.community} />
                </nav>
                <div>
                     <button onClick={logout} className="flex items-center w-full px-4 py-3 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-300">
                        <Icon path={ICONS.logout} className="w-6 h-6 mr-3" /> <span>Logout</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-6 bg-gray-900/80 overflow-y-auto">
                {renderContent()}
            </main>
        </div>
    );
};


// -- Mechanic Dashboard --
interface MechanicDashboardProps {
    communityPosts: CommunityPost[];
    onAddReply: (postId: number, content: string) => void;
}

const MechanicDashboard: FC<MechanicDashboardProps> = ({ communityPosts, onAddReply }) => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [replyingToPost, setReplyingToPost] = useState<CommunityPost | null>(null);
    const [replyContent, setReplyContent] = useState('');

    useEffect(() => { simulateApiCall(MOCK_APPOINTMENTS).then(setAppointments); }, []);

    const handleAppointment = (id: number, newStatus: Appointment['status']) => {
        setAppointments(apps => apps.map(app => app.id === id ? {...app, status: newStatus} : app));
    };

    const openReplyModal = (post: CommunityPost) => {
        setReplyingToPost(post);
        setReplyContent('');
    };
    
    const closeReplyModal = () => {
        setReplyingToPost(null);
        setReplyContent('');
    };

    const handleSubmitReply = () => {
        if (replyingToPost && replyContent) {
            onAddReply(replyingToPost.id, replyContent);
            closeReplyModal();
        }
    };
    
    return (
        <>
            <div className="p-6 animate-fade-in">
                 <h1 className="text-3xl font-bold text-cyan-400 mb-6">Mechanic Dashboard</h1>
                 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2">
                        <Card>
                            <h3 className="text-xl font-bold text-cyan-400 mb-4">Community Feed</h3>
                            <div className="space-y-6 overflow-y-auto max-h-[70vh] pr-2">
                                {communityPosts.length > 0 ? communityPosts.map(post => (
                                    <div key={post.id} className="bg-gray-700/50 p-4 rounded-lg">
                                        <div className="flex gap-3 items-start">
                                            <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full flex-shrink-0" />
                                            <div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="font-bold">{post.author.name}</span>
                                                    <span className="text-xs text-gray-400">{post.timestamp}</span>
                                                </div>
                                                <p className="text-gray-300 mt-1">{post.content}</p>
                                                <button onClick={() => openReplyModal(post)} className="mt-2 text-sm text-cyan-400 hover:underline font-semibold">Reply</button>
                                            </div>
                                        </div>
                                        {post.replies.length > 0 && (
                                            <div className="mt-3 pl-10 border-l-2 border-gray-600 ml-5">
                                                {post.replies.map(reply => (
                                                    <div key={reply.id} className="flex gap-3 items-start pt-3">
                                                         <img src={reply.author.avatar} alt={reply.author.name} className="w-8 h-8 rounded-full flex-shrink-0" />
                                                         <div>
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-bold text-sm">{reply.author.name}</span>
                                                                {reply.author.role === 'mechanic' && <span className="text-xs bg-blue-500/30 text-blue-300 px-2 py-0.5 rounded-full">Mechanic</span>}
                                                                <span className="text-xs text-gray-400">{reply.timestamp}</span>
                                                            </div>
                                                            <p className="text-gray-300 text-sm mt-1">{reply.content}</p>
                                                         </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )) : <p className="text-gray-400">No community posts yet.</p>}
                            </div>
                        </Card>
                    </div>
                    <div>
                         <Card>
                            <h3 className="text-xl font-bold text-cyan-400 mb-4">Pending Appointments</h3>
                            <ul className="space-y-4">
                                {appointments.filter(a => a.status === 'Pending').map(app => (
                                    <li key={app.id} className="bg-gray-700/50 p-4 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-semibold">{app.issue}</p>
                                                <p className="text-sm text-gray-400">From: {app.user.name}</p>
                                                <p className="text-sm text-gray-400">Time: {app.time}</p>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleAppointment(app.id, 'Confirmed')} className="bg-green-500 text-white px-2 py-1 text-xs rounded hover:bg-green-600">Accept</button>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                                {appointments.filter(a => a.status === 'Pending').length === 0 && <p className="text-gray-400">No pending appointments.</p>}
                            </ul>
                        </Card>
                    </div>
                 </div>
            </div>

            <Modal isOpen={!!replyingToPost} onClose={closeReplyModal} title={`Reply to ${replyingToPost?.author.name}`}>
                {replyingToPost && (
                    <div>
                        <div className="mb-4 bg-gray-700/50 p-3 rounded-lg">
                            <p className="text-sm text-gray-400 italic">"{replyingToPost.content}"</p>
                        </div>
                        <textarea
                            value={replyContent}
                            onChange={e => setReplyContent(e.target.value)}
                            placeholder="Write your reply..."
                            rows={4}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all"
                            autoFocus
                        />
                        <button onClick={handleSubmitReply} className="mt-4 w-full bg-cyan-500 text-white font-bold py-2 rounded-lg hover:bg-cyan-600 transition-colors">
                            Submit Reply
                        </button>
                    </div>
                )}
            </Modal>
        </>
    )
}

// -- Station Operator Dashboard --
const StationOperatorDashboard: FC = () => {
    const {bookings} = MOCK_OPERATOR_DATA;
    const getStatusColor = (status: Booking['status']) => ({'Confirmed': 'text-green-400', 'Upcoming': 'text-yellow-400', 'Completed': 'text-gray-500'})[status];
    return (
        <div className="p-6 animate-fade-in">
            <h1 className="text-3xl font-bold text-cyan-400 mb-6">Station Operator Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <Card isHoverable><h3 className="text-lg text-gray-400">Occupancy</h3><p className="text-4xl font-bold">{MOCK_OPERATOR_DATA.summary.occupancy}</p></Card>
                <Card isHoverable><h3 className="text-lg text-gray-400">Total Bookings (Today)</h3><p className="text-4xl font-bold">{MOCK_OPERATOR_DATA.summary.totalBookings}</p></Card>
                <Card isHoverable><h3 className="text-lg text-gray-400">Revenue (Today)</h3><p className="text-4xl font-bold">{MOCK_OPERATOR_DATA.summary.dailyRevenue}</p></Card>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3">
                    <Card>
                        <h3 className="text-xl font-bold text-cyan-400 mb-4">Real-time Bookings</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-gray-700">
                                        <th className="p-2">User</th>
                                        <th className="p-2">Station</th>
                                        <th className="p-2">Time</th>
                                        <th className="p-2">Status</th>
                                        <th className="p-2">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bookings.map(booking => (
                                        <tr key={booking.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                                            <td className="p-2">{booking.user}</td>
                                            <td className="p-2">{booking.station}</td>
                                            <td className="p-2">{booking.time}</td>
                                            <td className={`p-2 font-semibold ${getStatusColor(booking.status)}`}>{booking.status}</td>
                                            <td className="p-2"><button className="text-xs text-red-400 hover:underline">Cancel</button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <h3 className="text-xl font-bold text-cyan-400 mb-4">Demand Prediction</h3>
                        <div className="h-64">
                            <SimpleChart chartType="line" labels={['6am', '9am', '12pm', '3pm', '6pm', '9pm', '12am']} datasets={[{ label: 'Station Demand %', data: MOCK_CHARGING_STATIONS[0].demand, borderColor: '#22d3ee', tension: 0.4 }]} />
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ROUTER ---
const MainDashboard: FC = () => {
    const { user, logout } = useAuth();
    const [communityPosts, setCommunityPosts] = useState<CommunityPost[]>(MOCK_COMMUNITY_POSTS);

    const handleAddReply = (postId: number, content: string) => {
        if (!user || !content.trim()) return;

        const newReply: CommunityPost = {
            id: Date.now(),
            author: user,
            content,
            timestamp: "Just now",
            replies: []
        };

        const updatePosts = (posts: CommunityPost[]): CommunityPost[] => {
            return posts.map(post => {
                if (post.id === postId) {
                    return { ...post, replies: [...post.replies, newReply] };
                }
                return post;
            });
        };

        setCommunityPosts(currentPosts => updatePosts(currentPosts));
    };
    
    const handleAddPost = (content: string) => {
        if (!user || !content.trim()) return;

        const newPost: CommunityPost = {
            id: Date.now(),
            author: user,
            content,
            timestamp: "Just now",
            replies: []
        };
        setCommunityPosts(currentPosts => [newPost, ...currentPosts]);
    };

    if (!user) return null;

    const renderDashboardByRole = () => {
        switch (user.role) {
            case 'ev_user':
                return <EVUserDashboard communityPosts={communityPosts} onAddPost={handleAddPost} />;
            case 'mechanic':
            case 'station_operator':
                return (
                    <div className="min-h-screen bg-gray-900">
                        <header className="bg-gray-800/80 backdrop-blur-sm p-4 flex justify-between items-center border-b border-gray-700/50">
                           <div className="flex items-center gap-3">
                               <img src={user?.avatar} alt="avatar" className="w-10 h-10 rounded-full border-2 border-cyan-400"/>
                               <div><p className="font-bold text-white">{user?.name}</p><p className="text-sm text-gray-400 capitalize">{user?.role.replace('_', ' ')}</p></div>
                           </div>
                           <button onClick={logout} className="flex items-center px-4 py-2 rounded-lg text-gray-400 hover:bg-red-500/20 hover:text-red-300">
                                <Icon path={ICONS.logout} className="w-5 h-5 mr-2" /> <span>Logout</span>
                           </button>
                        </header>
                        <main>{user.role === 'mechanic' ? <MechanicDashboard communityPosts={communityPosts} onAddReply={handleAddReply} /> : <StationOperatorDashboard />}</main>
                    </div>
                );
            default:
                return <div>Invalid user role</div>;
        }
    };

    return renderDashboardByRole();
};

// --- AUTHENTICATION PAGE ---
const AuthInput: FC<{type: string, placeholder: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void}> = ({type, placeholder, value, onChange}) => (
    <input type={type} placeholder={placeholder} value={value} onChange={onChange} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all" />
);

const AuthPage: FC = () => {
    const { login } = useAuth();
    const [isLoginView, setIsLoginView] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [role, setRole] = useState<'ev_user' | 'mechanic' | 'station_operator'>('ev_user');
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleLoginSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (login(email, password)) {
            // successful login handled by context
        } else {
            setError('Invalid email or password.');
        }
    };

    const handleSignUpSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        if (!fullName || !email || !password || !confirmPassword) {
            setError('Please fill out all fields.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        console.log('New user signed up:', { fullName, email, role });
        setSuccess('Sign up successful! Please log in.');
        setIsLoginView(true);
        setFullName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 bg-gradient-to-br from-gray-900 via-gray-900 to-cyan-900/30 p-4">
            <div className="text-center mb-8">
                <h1 className="text-5xl font-bold text-cyan-400 mb-2">EVision</h1>
                <p className="text-lg text-gray-400 italic">“See your EV like never before.”</p>
            </div>
            <Card className="w-full max-w-md" isHoverable={false}>
                {error && <p className="bg-red-500/20 text-red-300 p-3 rounded-lg mb-4">{error}</p>}
                {success && <p className="bg-green-500/20 text-green-300 p-3 rounded-lg mb-4">{success}</p>}

                {isLoginView ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                        <h2 className="text-2xl font-bold text-center text-white pb-2">Sign In</h2>
                        <AuthInput type="email" placeholder="Email (e.g., aryan@demo.com)" value={email} onChange={e => setEmail(e.target.value)} />
                        <AuthInput type="password" placeholder="Password (hint: password)" value={password} onChange={e => setPassword(e.target.value)} />
                        <button type="submit" className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg hover:bg-cyan-600 transition-colors duration-300">Sign In</button>
                    </form>
                ) : (
                    <form onSubmit={handleSignUpSubmit} className="space-y-4">
                        <h2 className="text-2xl font-bold text-center text-white pb-2">Create Account</h2>
                         <div className="relative">
                            <select value={role} onChange={e => setRole(e.target.value as any)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 appearance-none">
                                <option value="ev_user">I am an EV User</option>
                                <option value="mechanic">I am a Mechanic</option>
                                <option value="station_operator">I am a Station Operator</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400"><svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg></div>
                        </div>
                        <AuthInput type="text" placeholder="Full Name" value={fullName} onChange={e => setFullName(e.target.value)} />
                        <AuthInput type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} />
                        <AuthInput type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
                        <AuthInput type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        <button type="submit" className="w-full bg-cyan-500 text-white font-bold py-3 rounded-lg hover:bg-cyan-600 transition-colors duration-300">Sign Up</button>
                    </form>
                )}

                <p className="text-center text-gray-400 mt-6">
                    {isLoginView ? "Don't have an account?" : "Already have an account?"}
                    <button onClick={() => { setIsLoginView(!isLoginView); setError(''); setSuccess(''); }} className="font-semibold text-cyan-400 hover:underline ml-2">
                        {isLoginView ? 'Sign Up' : 'Sign In'}
                    </button>
                </p>
            </Card>
        </div>
    );
};

// --- ROOT APP COMPONENT ---
const App: FC = () => {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    );
};

const AppContent: FC = () => {
    const { user } = useAuth();
    return user ? <MainDashboard /> : <AuthPage />;
};

export default App;
