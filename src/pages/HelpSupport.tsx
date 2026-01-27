import React, { useState } from 'react';
import { ScreenWrapper, Header } from '../../components/Shared';

const FAQItem = ({ question, answer }: { question: string; answer: string }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className="border-b border-white/5 last:border-0">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-4 text-left focus:outline-none"
            >
                <span className="font-medium text-white text-sm">{question}</span>
                <span className={`material-symbols-outlined text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>
            {isOpen && (
                <div className="pb-4 text-sm text-gray-400 leading-relaxed">
                    {answer}
                </div>
            )}
        </div>
    );
};

export const HelpSupportPage = () => {
    return (
        <ScreenWrapper>
            <Header title="Help & Support" showBack={true} />
            <main className="flex flex-col p-5 gap-8">
                <section>
                    <h3 className="text-primary text-xs font-bold uppercase tracking-wider mb-3">Frequently Asked Questions</h3>
                    <div className="bg-surface-dark rounded-xl px-4 border border-white/5">
                        <FAQItem 
                            question="How is personal inflation calculated?" 
                            answer="We use a weighted average of your specific basket items. Items with higher current prices carry more weight in the calculation, reflecting their impact on your wallet." 
                        />
                        <FAQItem 
                            question="Is my data private?" 
                            answer="Yes. Your financial data is stored securely. We do not sell your personal transaction history to third parties." 
                        />
                        <FAQItem 
                            question="How do I cancel Premium?" 
                            answer="You can manage your subscription through the Google Play Store or App Store subscriptions menu on your device." 
                        />
                    </div>
                </section>

                <section className="text-center space-y-4">
                    <p className="text-gray-400 text-sm">Still need help?</p>
                    <a 
                        href="mailto:support@myinflationbasket.app"
                        className="flex items-center justify-center gap-2 w-full bg-surface-highlight hover:bg-white/10 text-white font-bold py-3 rounded-xl transition-colors border border-white/10"
                    >
                        <span className="material-symbols-outlined">mail</span>
                        Contact Support
                    </a>
                </section>
            </main>
        </ScreenWrapper>
    );
};

export default HelpSupportPage;