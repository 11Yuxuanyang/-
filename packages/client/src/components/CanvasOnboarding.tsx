import React, { useState, useEffect } from 'react';
import { Building2, Cat, Palette, X } from 'lucide-react';
import { OnboardingTour, TourStep } from './OnboardingTour';

interface CanvasOnboardingProps {
    onSelectTemplate: (template: 'cyberpunk' | 'mascot' | 'surreal') => void;
    onClose: () => void;
}

const TOUR_STEPS: TourStep[] = [
    {
        target: '[data-tour="canvas-toolbar"]',
        title: '创意工具箱',
        content: '这里有你创作所需的一切：形状、画笔、文本和图像工具。',
        position: 'right'
    },
    {
        target: '[data-tour="canvas-area"]',
        title: '无限画布',
        content: '在这个无限的空间中自由创作。按住空格键拖动，滚动鼠标缩放。',
        position: 'center'
    },
    {
        target: '[data-tour="canvas-generate"]',
        title: 'AI 辅助',
        content: '输入提示词，让 AI 帮你生成素材或提供灵感。',
        position: 'top'
    }
];

export function CanvasOnboarding({ onSelectTemplate, onClose }: CanvasOnboardingProps) {
    const [showModal, setShowModal] = useState(false);
    const [showTour, setShowTour] = useState(false);

    useEffect(() => {
        const hasSeen = localStorage.getItem('hasSeenCanvasOnboarding_v1');
        if (!hasSeen) {
            setTimeout(() => setShowModal(true), 500);
        }
    }, []);

    const handleSelect = (template: 'cyberpunk' | 'mascot' | 'surreal') => {
        onSelectTemplate(template);
        setShowModal(false);
        startTour();
    };

    const startTour = () => {
        // 等待模态框关闭动画
        setTimeout(() => setShowTour(true), 500);
    };

    const handleTourComplete = () => {
        setShowTour(false);
        localStorage.setItem('hasSeenCanvasOnboarding_v1', 'true');
        onClose();
    };

    const handleSkip = () => {
        setShowModal(false);
        localStorage.setItem('hasSeenCanvasOnboarding_v1', 'true');
        onClose();
    };

    if (!showModal && !showTour) return null;

    return (
        <>
            {/* Welcome Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-[#0a0a0b]/80 backdrop-blur-sm animate-fade-in" />

                    <div className="relative w-full max-w-4xl bg-white rounded-3xl p-12 shadow-2xl animate-scale-in">
                        <button
                            onClick={handleSkip}
                            className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-bold text-gray-900 mb-4 tracking-tight">
                                探索你的创意
                            </h2>
                            <p className="text-xl text-gray-500 font-medium">
                                选择一个示例，看看 CanvasAI 能做什么。
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div
                                onClick={() => handleSelect('cyberpunk')}
                                className="group cursor-pointer rounded-2xl border border-gray-100 p-6 hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 bg-white"
                            >
                                <div className="aspect-square rounded-xl bg-gradient-to-br from-blue-500/10 to-purple-500/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-500">
                                    <Building2 size={64} className="text-blue-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 text-center mb-2 group-hover:text-blue-600 transition-colors">
                                    赛博朋克城市
                                </h3>
                                <div className="h-1 w-12 bg-gray-100 mx-auto rounded-full group-hover:bg-blue-500/30 transition-colors" />
                            </div>

                            <div
                                onClick={() => handleSelect('mascot')}
                                className="group cursor-pointer rounded-2xl border border-gray-100 p-6 hover:border-amber-500/30 hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 bg-white"
                            >
                                <div className="aspect-square rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-500">
                                    <Cat size={64} className="text-amber-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 text-center mb-2 group-hover:text-amber-600 transition-colors">
                                    可爱吉祥物
                                </h3>
                                <div className="h-1 w-12 bg-gray-100 mx-auto rounded-full group-hover:bg-amber-500/30 transition-colors" />
                            </div>

                            <div
                                onClick={() => handleSelect('surreal')}
                                className="group cursor-pointer rounded-2xl border border-gray-100 p-6 hover:border-purple-500/30 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 bg-white"
                            >
                                <div className="aspect-square rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 flex items-center justify-center mb-6 group-hover:scale-105 transition-transform duration-500">
                                    <Palette size={64} className="text-purple-500" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-900 text-center mb-2 group-hover:text-purple-600 transition-colors">
                                    超现实艺术
                                </h3>
                                <div className="h-1 w-12 bg-gray-100 mx-auto rounded-full group-hover:bg-purple-500/30 transition-colors" />
                            </div>
                        </div>

                        <div className="mt-12 text-center">
                            <button
                                onClick={handleSkip}
                                className="text-gray-400 hover:text-gray-600 text-sm font-medium hover:underline underline-offset-4"
                            >
                                跳过示例，直接开始创作
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tour */}
            <OnboardingTour
                steps={TOUR_STEPS}
                isOpen={showTour}
                onComplete={handleTourComplete}
                onSkip={handleTourComplete}
            />

            <style>{`
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
        </>
    );
}
