"use client"
import { api } from '@/convex/_generated/api';
import { useUser } from '@stackframe/stack'
import { useMutation, useQuery } from 'convex/react';
import React, { useEffect, useState } from 'react'
import { UserContext } from './_context/UserContext';

function AuthProvider({ children }) {

    const user = useUser();
    const createOrUpdateUser = useMutation(api.users.createOrUpdateUser);

    // Use useQuery to get real-time updates for user data
    const convexUserData = useQuery(api.users.getUserByStackId,
        user?.id ? { stackId: user.id } : "skip"
    );

    const [userData, setUserData] = useState();

    // Ensure user exists and is synced with Convex
    useEffect(() => {
        if (user) {
            syncUser();
        }
    }, [user])

    // Update local context state when convex data changes
    useEffect(() => {
        if (convexUserData) {
            setUserData(convexUserData);
        }
    }, [convexUserData])

    const syncUser = async () => {
        if (!user?.id) return;
        
        try {
            await createOrUpdateUser({
                name: user?.displayName || user?.primaryEmail?.split('@')[0] || 'User',
                email: user?.primaryEmail || `${user.id}@placeholder.com`,
                stackId: user.id
            });
        } catch (error) {
            console.error('Error syncing user:', error);
        }
    }

    return (
        <div>
            <UserContext.Provider value={{ userData, setUserData }}>
                {children}
            </UserContext.Provider>
        </div>
    )
}

export default AuthProvider