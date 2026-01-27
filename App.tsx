import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store';
import { HomePage, BasketPage, ItemDetailPage } from './pages/Inflation';
import { InvestmentsPage } from './pages/Investments';
import { InvestmentDetailPage } from './pages/InvestmentDetail';
import { AIInsightsPage, SettingsPage } from './pages/InsightsAndSettings';
import { AddEntryPage } from './pages/AddEntry';
import { CategoriesPage } from './pages/Categories';
import { ProfilePage } from './pages/Profile';

// Profile Sub-pages - Using direct relative paths
import { PersonalInfoPage } from './pages/PersonalInfo';
import { SecurityPage } from './pages/Security';
import { LinkedAccountsPage } from './pages/LinkedAccounts';
import { HelpSupportPage } from './pages/HelpSupport';
import { AboutPage } from './pages/About';

const App = () => {
    return (
        <AppProvider>
            <HashRouter>
                <div className="flex justify-center bg-black min-h-screen">
                    <Routes>
                        <Route path="/" element={<HomePage />} />
                        <Route path="/basket" element={<BasketPage />} />
                        <Route path="/categories" element={<CategoriesPage />} />
                        <Route path="/item/:id" element={<ItemDetailPage />} />
                        <Route path="/add" element={<AddEntryPage />} />
                        <Route path="/investments" element={<InvestmentsPage />} />
                        <Route path="/investment/:id" element={<InvestmentDetailPage />} />
                        <Route path="/add-investment" element={<AddEntryPage />} />
                        <Route path="/insights" element={<AIInsightsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        
                        <Route path="/profile" element={<ProfilePage />} />
                        <Route path="/profile/personal-info" element={<PersonalInfoPage />} />
                        <Route path="/profile/security" element={<SecurityPage />} />
                        <Route path="/profile/linked-accounts" element={<LinkedAccountsPage />} />
                        <Route path="/profile/help" element={<HelpSupportPage />} />
                        <Route path="/profile/about" element={<AboutPage />} />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </div>
            </HashRouter>
        </AppProvider>
    );
};

export default App;