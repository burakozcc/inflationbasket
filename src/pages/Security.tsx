import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store';
import { supabase } from '../lib/supabase';
import { ScreenWrapper, Header } from '../../components/Shared';

export const SecurityPage = () => {
    const { session } = useAppStore();
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        if (session?.user?.email) {
            setEmail(session.user.email);
        }
    }, [session]);

    const handleResetPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/#/profile/security',
            });
            
            if (error) throw error;
            
            setMessage({ type: 'success', text: 'Password reset link sent to your email.' });
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message || 'Failed to send reset email.' });
        } finally {
            setLoading(false);
        }
    };

    if (!session) {
        return (
            <ScreenWrapper>
                <Header title="Security" showBack={true} />
                <div className="p-8 text-center text-gray-400">
                    Please sign in to manage security settings.
                </div>
            </ScreenWrapper>
        );
    }

    return (
        <ScreenWrapper>
            <Header title="Security" showBack={true} />
            <main className="flex flex-col p-5 gap-6">
                <section className="bg-surface-dark rounded-xl p-5 border border-white/5">
                    <h3 className="text-white font-bold text-lg mb-2">Reset Password</h3>
                    <p className="text-gray-400 text-sm mb-4">
                        Receive an email to reset your password.
                    </p>
                    
                    <form onSubmit={handleResetPassword} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold text-gray-500 uppercase">Email Address</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background-dark border border-white/10 rounded-lg p-3 text-white focus:border-primary focus:outline-none mt-2"
                                required
                            />
                        </div>

                        {message.text && (
                            <div className={`text-sm p-3 rounded-lg ${message.type === 'success' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                {message.text}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-surface-highlight border border-white/10 text-white font-bold py-3 rounded-xl hover:bg-white/10 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                </section>
            </main>
        </ScreenWrapper>
    );
};

export default SecurityPage;