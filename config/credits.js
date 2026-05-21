// Centralized Credit Configuration
// This file defines the credit limits for free and pro users
// Update these values to change limits across the entire application

export const CREDIT_LIMITS = {
    FREE_PLAN: {
        SCAN_CREDITS: 3,
        CHAT_CREDITS: 50
    },
    PRO_PLAN: {
        SCAN_CREDITS: 100,
        CHAT_CREDITS: -1 // -1 means unlimited
    }
};

// Helper functions
export const getMaxScans = (isProUser) => {
    return isProUser ? CREDIT_LIMITS.PRO_PLAN.SCAN_CREDITS : CREDIT_LIMITS.FREE_PLAN.SCAN_CREDITS;
};

export const getMaxChats = (isProUser) => {
    return isProUser ? CREDIT_LIMITS.PRO_PLAN.CHAT_CREDITS : CREDIT_LIMITS.FREE_PLAN.CHAT_CREDITS;
};

export const hasUnlimitedChats = (isProUser) => {
    return isProUser && CREDIT_LIMITS.PRO_PLAN.CHAT_CREDITS === -1;
};
