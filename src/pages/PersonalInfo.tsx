import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { ScreenWrapper, Header } from '../../components/Shared';

export const PersonalInfoPage = () => {
    const { session, settings } = useAppStore();
    const [displayName, setDisplayName] = useState('');
    const [message, setMessage] = useState('');

    useEffect(() => {
        const savedName = localStorage.getItem('profile_display_name');
        if (savedName) setDisplayName(savedName);
    }, []);

    const handleSave = () => {
        if (displayName.trim()) {
            localStorage.setItem('profile_display_name', displayName);
            setMessage('Saved successfully!');
            setTimeout(() => setMessage(''), 3000);
        }
    };

    return (
        <ScreenWrapper className="pb-20">
            <Header title="Personal Info" showBack={true} />
            <main className="flex flex-col p-5 gap-6">
                <div className="bg-surface-dark rounded-xl p-5 border border-white/5 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                        <p className="text-white text-base font-medium mt-1">{session?.user?.email || 'Guest'}</p>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">User ID</label>
                        <p className="text-gray-400 text-xs font-mono mt-1 break-all">{session?.user?.id || 'N/A'}</p>
                    </div>
                </div>

                <div className="bg-surface-dark rounded-xl p-5 border border-white/5 space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Display Name</label>
                        <input 
                            type="text" 
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            className="w-full bg-background-dark border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none mt-2"
                            placeholder="Enter your name"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Preferred Currency</label>
                        <p className="text-primary text-base font-bold mt-1">{settings.currency}</p>
                        <p className="text-xs text-gray-500 mt-1">Change this in Settings.</p>
                    </div>
                </div>

                {message && (
                    <div className="bg-green-500/10 text-green-400 text-sm p-3 rounded-lg text-center animate-pulse">
                        {message}
                    </div>
                )}

                <button 
                    onClick={handleSave}
                    className="w-full bg-primary text-black font-bold py-3.5 rounded-xl hover:bg-primary-dim transition-colors shadow-lg shadow-primary/20"
                >
                    Save Changes
                </button>
            </main>
        </ScreenWrapper>
    );
};

export default PersonalInfoPage;