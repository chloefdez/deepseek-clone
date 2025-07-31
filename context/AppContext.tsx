"use client";
import { useUser } from "@clerk/nextjs";
import { createContext, useContext, useState, ReactNode } from "react";

type AppContextType = {
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
};

const defaultValue: AppContextType = {
    isLoading: false,
    setIsLoading: () => {},
};

export const AppContext = createContext<AppContextType>(defaultValue);

export const useAppContext = () => useContext(AppContext);

type AppContextProvideProps = {
    children: ReactNode;
};

export const AppContextProvider = ({children}: AppContextProvideProps) => {
    const [isLoading, setIsLoading] = useState(false);

    const value = {
        isLoading,
        setIsLoading,
    };

    return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}